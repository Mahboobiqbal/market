import "server-only";
import type { OrderStatus, ReturnStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { notify } from "@/services/notification.service";

/** Return request lifecycle (admin-driven) + refunds. */

export async function listReturnRequests(params: { status?: ReturnStatus | "ALL"; page?: number; pageSize?: number }) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 15));
  const where: Record<string, unknown> = {};
  if (params.status && params.status !== "ALL") where.status = params.status;

  const [returns, total] = await Promise.all([
    prisma.returnRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        reason: true,
        note: true,
        status: true,
        createdAt: true,
        order: {
          select: {
            orderNumber: true,
            total: true,
            customer: { select: { name: true, email: true } },
          },
        },
        sellerOrderId: true,
      },
    }),
    prisma.returnRequest.count({ where }),
  ]);

  return { returns, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

type ReturnAction = "APPROVED" | "REJECTED" | "RECEIVED" | "REFUNDED";

const ALLOWED: Record<ReturnAction, ReturnStatus[]> = {
  APPROVED: ["REQUESTED"],
  REJECTED: ["REQUESTED", "APPROVED"],
  RECEIVED: ["APPROVED"],
  REFUNDED: ["RECEIVED"],
};

export async function updateReturnStatus(
  adminUserId: string,
  input: { returnId: string; action: ReturnAction; note?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ret = await prisma.returnRequest.findUnique({
    where: { id: input.returnId },
    select: {
      id: true,
      orderId: true,
      orderItemId: true,
      sellerOrderId: true,
      status: true,
      order: {
        select: {
          id: true,
          orderNumber: true,
          userId: true,
          total: true,
        },
      },
    },
  });
  if (!ret) return { ok: false, error: "Return request not found." };
  if (!ALLOWED[input.action]?.includes(ret.status)) {
    return { ok: false, error: `Cannot ${input.action.toLowerCase()} a ${ret.status} return.` };
  }

  const nextStatus: ReturnStatus =
    input.action === "APPROVED"
      ? "APPROVED"
      : input.action === "REJECTED"
        ? "REJECTED"
        : input.action === "RECEIVED"
          ? "RECEIVED"
          : "REFUNDED";

  await prisma.$transaction(async (tx) => {
    await tx.returnRequest.update({
      where: { id: ret.id },
      data: {
        status: nextStatus,
        reviewedAt: new Date(),
        reviewedById: adminUserId,
        ...(input.note ? { note: input.note } : {}),
      },
    });

    if (ret.sellerOrderId) {
      if (input.action === "REJECTED") {
        // Item stays with the customer — restore order state.
        await tx.sellerOrder.update({ where: { id: ret.sellerOrderId }, data: { status: "DELIVERED" } });
      } else if (input.action === "RECEIVED") {
        await tx.sellerOrder.update({ where: { id: ret.sellerOrderId }, data: { status: "RETURNED" } });
      }
    }

    if (input.action === "REFUNDED") {
      const item = await tx.orderItem.findUnique({
        where: { id: ret.orderItemId },
        select: { lineTotal: true },
      });
      const amount = item?.lineTotal ?? 0;
      await tx.refund.create({
        data: {
          orderId: ret.orderId,
          returnRequestId: ret.id,
          amount,
          status: "COMPLETED",
          note: input.note ?? null,
          processedAt: new Date(),
        },
      });
      const refunds = await tx.refund.aggregate({
        where: { orderId: ret.orderId },
        _sum: { amount: true },
      });
      const order = await tx.order.findUnique({
        where: { id: ret.orderId },
        select: { total: true, payments: { select: { id: true } } },
      });
      if (order?.payments.length) {
        await tx.payment.updateMany({
          where: { orderId: ret.orderId },
          data: {
            status: (refunds._sum.amount ?? 0) >= order.total ? "REFUNDED" : "PARTIALLY_REFUNDED",
          },
        });
      }
    }

    // Parent rollup.
    const children = await tx.sellerOrder.findMany({
      where: { orderId: ret.orderId },
      select: { status: true },
    });
    if (children.length > 0) {
      const flow: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED"];
      const active = children.filter(
        (c) => !["CANCELLED", "RETURNED", "REFUNDED"].includes(c.status),
      );
      let status: OrderStatus;
      if (children.some((c) => c.status === "RETURN_REQUESTED")) status = "RETURN_REQUESTED";
      else if (active.length === 0) {
        status = children.every((c) => c.status === "REFUNDED")
          ? "REFUNDED"
          : children.every((c) => c.status === "RETURNED")
            ? "RETURNED"
            : "CANCELLED";
      } else {
        const indices = active
          .map((c) => flow.indexOf(c.status))
          .filter((i) => i >= 0);
        status = indices.length ? flow[Math.min(...indices)] : "PENDING";
      }
      await tx.order.update({ where: { id: ret.orderId }, data: { status } });
    }
  });

  const notifyCustomer: Record<ReturnAction, { title: string; type: "RETURN_APPROVED" | "RETURN_REJECTED" | "REFUND_PROCESSED" | "SYSTEM" }> = {
    APPROVED: { title: `Return approved for ${ret.order.orderNumber}`, type: "RETURN_APPROVED" },
    REJECTED: { title: `Return rejected for ${ret.order.orderNumber}`, type: "RETURN_REJECTED" },
    RECEIVED: { title: `Return received for ${ret.order.orderNumber}`, type: "SYSTEM" },
    REFUNDED: { title: `Refund processed for ${ret.order.orderNumber}`, type: "REFUND_PROCESSED" },
  };
  const msg = notifyCustomer[input.action];
  await notify(ret.order.userId, msg.type, msg.title, {
    body: input.note || undefined,
    link: `/account/orders/${ret.order.orderNumber}`,
  });

  return { ok: true };
}
