import "server-only";
import { prisma } from "@/lib/db/prisma";
import { getPlatformSettings } from "@/services/settings.service";

/**
 * Configurable commission resolution.
 *
 * Precedence (most specific wins):
 *   PRODUCT rule → CATEGORY rule → seller profile override →
 *   SELLER rule → platform default.
 *
 * All rates are basis points (1000 = 10%). Never hard-coded in UI.
 */

export type CommissionInput = {
  productId?: string | null;
  categoryId?: string | null;
  sellerId?: string | null;
};

async function findRule(scope: "PRODUCT" | "CATEGORY" | "SELLER", targetId: string) {
  return prisma.commission.findFirst({
    where: { scope, targetId, isActive: true },
    orderBy: { effectiveFrom: "desc" },
    select: { rateBps: true },
  });
}

export async function resolveCommissionBps(input: CommissionInput): Promise<number> {
  if (input.productId) {
    const rule = await findRule("PRODUCT", input.productId);
    if (rule) return rule.rateBps;
  }
  if (input.categoryId) {
    const rule = await findRule("CATEGORY", input.categoryId);
    if (rule) return rule.rateBps;
  }
  if (input.sellerId) {
    const profile = await prisma.sellerProfile.findUnique({
      where: { id: input.sellerId },
      select: { commissionBps: true },
    });
    if (profile?.commissionBps != null) return profile.commissionBps;
    const rule = await findRule("SELLER", input.sellerId);
    if (rule) return rule.rateBps;
  }
  const settings = await getPlatformSettings();
  return settings.defaultCommissionBps;
}

/** Commission for one order line: round(amount × bps / 10000). Server-side only. */
export function calculateCommission(amount: number, bps: number): number {
  return Math.round((amount * bps) / 10_000);
}

/** Seller earning for one order line. */
export function calculateEarning(amount: number, commission: number): number {
  return amount - commission;
}
