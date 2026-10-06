import "server-only";
import { prisma } from "@/lib/db/prisma";
import { getPlatformSettings } from "@/services/settings.service";
import { notify } from "@/services/notification.service";

/**
 * Payout requests and admin processing.
 * Balances are always recomputed from SellerOrder + Payout records.
 */

export type PayoutRequestResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function getSellerPayoutSummary(sellerId: string) {
  const settings = await getPlatformSettings();
  const [delivered, payouts] = await Promise.all([
    prisma.sellerOrder.aggregate({
      where: { sellerId, status: "DELIVERED" },
      _sum: { earningTotal: true },
    }),
    prisma.payout.groupBy({
      by: ["status"],
      where: { sellerId },
      _sum: { amount: true },
    }),
  ]);
  const byStatus = new Map(payouts.map((p) => [p.status, p._sum.amount ?? 0]));
  const paid = byStatus.get("PAID") ?? 0;
  const pending = (byStatus.get("REQUESTED") ?? 0) + (byStatus.get("APPROVED") ?? 0);
  const deliveredEarnings = delivered._sum.earningTotal ?? 0;
  return {
    minRequest: settings.minPayoutRequest,
    deliveredEarnings,
    paid,
    pending,
    available: Math.max(0, deliveredEarnings - paid - pending),
  };
}

export async function requestPayout(sellerId: string, amount: number): Promise<PayoutRequestResult> {
  if (!Number.isInteger(amount) || amount <= 0) {
    return { ok: false, error: "Enter a valid amount." };
  }
  const summary = await getSellerPayoutSummary(sellerId);
  if (amount < summary.minRequest) {
    return {
      ok: false,
      error: `Minimum payout request is Rs ${Math.ceil(summary.minRequest / 100).toLocaleString()}.`,
    };
  }
  if (amount > summary.available) {
    return { ok: false, error: "Amount exceeds your available balance." };
  }

  const existing = await prisma.payout.findFirst({
    where: { sellerId, status: { in: ["REQUESTED", "APPROVED"] } },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: "You already have a payout in progress. Wait for it to process." };
  }

  const payout = await prisma.payout.create({ data: { sellerId, amount, status: "REQUESTED" } });

  const admins = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN", isActive: true },
    select: { id: true },
  });
  await Promise.all(
    admins.map((a) =>
      notify(a.id, "NEW_PAYOUT_REQUEST", "New payout request", {
        body: `Rs ${(amount / 100).toLocaleString()} requested.`,
        link: "/admin/payouts",
      }),
    ),
  );

  return { ok: true, id: payout.id };
}

export async function listSellerPayouts(sellerId: string, limit = 20) {
  return prisma.payout.findMany({
    where: { sellerId },
    orderBy: { requestedAt: "desc" },
    take: limit,
    select: {
      id: true,
      amount: true,
      status: true,
      method: true,
      reference: true,
      notes: true,
      requestedAt: true,
      processedAt: true,
    },
  });
}

export type PayoutAction = "APPROVED" | "REJECTED" | "PAID";

export async function updatePayoutStatus(
  adminUserId: string,
  payoutId: string,
  action: PayoutAction,
  opts?: { reference?: string | null; notes?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    select: { id: true, sellerId: true, status: true, amount: true },
  });
  if (!payout) return { ok: false, error: "Payout not found." };

  const allowed: Record<PayoutAction, string[]> = {
    APPROVED: ["REQUESTED"],
    REJECTED: ["REQUESTED", "APPROVED"],
    PAID: ["APPROVED"],
  };
  if (!allowed[action].includes(payout.status)) {
    return { ok: false, error: `Cannot move payout from ${payout.status} to ${action}.` };
  }

  await prisma.payout.update({
    where: { id: payout.id },
    data: {
      status: action,
      processedAt: action === "REJECTED" ? null : new Date(),
      processedById: adminUserId,
      reference: opts?.reference ?? undefined,
      notes: opts?.notes ?? undefined,
    },
  });

  const type = action === "REJECTED" ? "PAYOUT_REJECTED" : "PAYOUT_APPROVED";
  const label = action === "PAID" ? "marked as paid" : action.toLowerCase();
  await notify(payout.sellerId, type, `Payout ${label}`, {
    body: `Rs ${(payout.amount / 100).toLocaleString()}`,
    link: "/seller/payouts",
  });

  return { ok: true };
}
