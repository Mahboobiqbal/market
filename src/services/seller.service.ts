import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db/prisma";

/** Seller dashboard context + aggregates. All numbers come from records. */

export const getSellerContext = cache(async (userId: string) => {
  const profile = await prisma.sellerProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      applicationStatus: true,
      businessName: true,
      commissionBps: true,
      ratingSum: true,
      ratingCount: true,
      createdAt: true,
      shops: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          tagline: true,
          logoUrl: true,
          bannerUrl: true,
          status: true,
          contactEmail: true,
          contactPhone: true,
          description: true,
        },
      },
    },
  });
  if (!profile) return null;
  return {
    ...profile,
    shop: profile.shops[0] ?? null,
    rating: profile.ratingCount > 0 ? Math.round((profile.ratingSum / profile.ratingCount) * 10) / 10 : 0,
  };
});

function bucketLastDays<T extends { createdAt: Date }>(
  rows: T[],
  days: number,
  valueOf: (row: T) => number,
): { label: string; value: number }[] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1);
  const buckets: { label: string; value: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    buckets.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, value: 0 });
  }
  for (const row of rows) {
    if (row.createdAt < start) continue;
    const idx = Math.floor((row.createdAt.getTime() - start.getTime()) / 86_400_000);
    if (idx >= 0 && idx < buckets.length) buckets[idx].value += valueOf(row);
  }
  return buckets;
}

export type SellerStats = {
  totalSales: number;
  totalCommission: number;
  netEarnings: number;
  pendingEarnings: number;
  availableBalance: number;
  paidAmount: number;
  pendingPayout: number;
  orderCount: number;
  pendingOrders: number;
  productCount: number;
  lowStockCount: number;
  rating: number;
  reviewCount: number;
  salesSeries: { label: string; value: number }[];
  ordersSeries: { label: string; value: number }[];
  recentOrders: {
    orderNumber: string;
    status: string;
    subtotal: number;
    createdAt: Date;
    customer: string;
    itemCount: number;
  }[];
  bestSellers: { id: string; name: string; slug: string; totalSold: number; imageUrl: string | null; effectivePrice: number }[];
  lowStockProducts: { id: string; name: string; slug: string; quantity: number; threshold: number }[];
};

export async function getSellerStats(sellerId: string, days = 30): Promise<SellerStats> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const [
    totals,
    delivered,
    payoutGroups,
    pendingOrders,
    productCount,
    lowStock,
    seriesRows,
    recentRows,
    bestSellers,
    lowStockProducts,
    reviewAgg,
  ] = await Promise.all([
    prisma.sellerOrder.aggregate({
      where: { sellerId, status: { not: "CANCELLED" } },
      _sum: { subtotal: true, commissionTotal: true, earningTotal: true },
      _count: { _all: true },
    }),
    prisma.sellerOrder.aggregate({
      where: { sellerId, status: "DELIVERED" },
      _sum: { earningTotal: true },
    }),
    prisma.payout.groupBy({
      by: ["status"],
      where: { sellerId },
      _sum: { amount: true },
    }),
    prisma.sellerOrder.count({
      where: { sellerId, status: { in: ["PENDING", "CONFIRMED", "PROCESSING"] } },
    }),
    prisma.product.count({ where: { sellerId, status: { in: ["ACTIVE", "PENDING_REVIEW", "DRAFT"] } } }),
    prisma.product.count({
      where: { sellerId, status: "ACTIVE", inventory: { is: { quantity: { lte: 5 } } } },
    }),
    prisma.sellerOrder.findMany({
      where: { sellerId, createdAt: { gte: since } },
      select: { createdAt: true, subtotal: true },
    }),
    prisma.sellerOrder.findMany({
      where: { sellerId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        orderNumber: true,
        status: true,
        subtotal: true,
        createdAt: true,
        _count: { select: { items: true } },
        order: { select: { customer: { select: { name: true } } } },
      },
    }),
    prisma.product.findMany({
      where: { sellerId, status: "ACTIVE" },
      orderBy: { totalSold: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        slug: true,
        totalSold: true,
        effectivePrice: true,
        images: { orderBy: { position: "asc" as const }, take: 1, select: { url: true } },
      },
    }),
    prisma.product.findMany({
      where: { sellerId, status: "ACTIVE", inventory: { is: { quantity: { lte: 5 } } } },
      orderBy: { inventory: { quantity: "asc" as const } },
      take: 8,
      select: {
        id: true,
        name: true,
        slug: true,
        inventory: { select: { quantity: true, lowStockThreshold: true } },
      },
    }),
    prisma.review.aggregate({
      where: { shop: { sellerId }, isApproved: true },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  const payoutByStatus = new Map(payoutGroups.map((g) => [g.status, g._sum.amount ?? 0]));
  const paidAmount = payoutByStatus.get("PAID") ?? 0;
  const pendingPayout =
    (payoutByStatus.get("REQUESTED") ?? 0) + (payoutByStatus.get("APPROVED") ?? 0);

  const totalEarnings = totals._sum.earningTotal ?? 0;
  const deliveredEarnings = delivered._sum.earningTotal ?? 0;
  const availableBalance = Math.max(0, deliveredEarnings - paidAmount - pendingPayout);

  return {
    totalSales: totals._sum.subtotal ?? 0,
    totalCommission: totals._sum.commissionTotal ?? 0,
    netEarnings: totalEarnings,
    pendingEarnings: Math.max(0, totalEarnings - deliveredEarnings),
    availableBalance,
    paidAmount,
    pendingPayout,
    orderCount: totals._count._all,
    pendingOrders,
    productCount,
    lowStockCount: lowStock,
    rating: reviewAgg._avg.rating ? Math.round(reviewAgg._avg.rating * 10) / 10 : 0,
    reviewCount: reviewAgg._count._all,
    salesSeries: bucketLastDays(seriesRows, days, (r) => r.subtotal),
    ordersSeries: bucketLastDays(seriesRows, days, () => 1),
    recentOrders: recentRows.map((r) => ({
      orderNumber: r.orderNumber,
      status: r.status,
      subtotal: r.subtotal,
      createdAt: r.createdAt,
      customer: r.order.customer.name,
      itemCount: r._count.items,
    })),
    bestSellers: bestSellers.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      totalSold: p.totalSold,
      imageUrl: p.images[0]?.url ?? null,
      effectivePrice: p.effectivePrice,
    })),
    lowStockProducts: lowStockProducts.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      quantity: p.inventory?.quantity ?? 0,
      threshold: p.inventory?.lowStockThreshold ?? 5,
    })),
  };
}

export async function listSellerOrders(
  sellerId: string,
  params: { status?: string; q?: string; page?: number; pageSize?: number } = {},
) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 15));
  const where: Record<string, unknown> = { sellerId };
  if (params.status && params.status !== "ALL") where.status = params.status;
  if (params.q?.trim()) where.orderNumber = { contains: params.q.trim() };

  const [orders, total] = await Promise.all([
    prisma.sellerOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        subtotal: true,
        shippingTotal: true,
        commissionTotal: true,
        earningTotal: true,
        createdAt: true,
        _count: { select: { items: true } },
        order: {
          select: {
            orderNumber: true,
            customer: { select: { name: true, email: true } },
            shippingAddress: true,
          },
        },
      },
    }),
    prisma.sellerOrder.count({ where }),
  ]);

  return { orders, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getSellerOrderDetail(sellerId: string, orderNumber: string) {
  const sellerOrder = await prisma.sellerOrder.findFirst({
    where: { orderNumber, sellerId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      subtotal: true,
      shippingTotal: true,
      commissionTotal: true,
      earningTotal: true,
      commissionBps: true,
      shipment: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          title: true,
          sku: true,
          quantity: true,
          unitPrice: true,
          lineTotal: true,
          commission: true,
          earning: true,
          productId: true,
        },
      },
      order: {
        select: {
          orderNumber: true,
          status: true,
          placedAt: true,
          note: true,
          shippingAddress: true,
          customer: { select: { name: true, email: true } },
          payments: { select: { method: true, status: true, amount: true } },
        },
      },
    },
  });
  return sellerOrder;
}
