import "server-only";
import type { OrderStatus, SellerApplicationStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { notify } from "@/services/notification.service";

/** Admin dashboard stats + marketplace management queries. */

function bucketDays<T>(
  rows: T[],
  days: number,
  dateOf: (row: T) => Date,
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
    const date = dateOf(row);
    if (date < start) continue;
    const idx = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
    if (idx >= 0 && idx < buckets.length) buckets[idx].value += valueOf(row);
  }
  return buckets;
}

export type AdminStats = {
  revenue: number;
  commission: number;
  sellerPayouts: number;
  orderCount: number;
  customerCount: number;
  sellerCount: number;
  productCount: number;
  pendingApplications: number;
  pendingPayouts: number;
  pendingReturns: number;
  pendingProducts: number;
  revenueSeries: { label: string; value: number }[];
  ordersSeries: { label: string; value: number }[];
  newCustomersSeries: { label: string; value: number }[];
  topCategories: { name: string; slug: string; orders: number; revenue: number }[];
  topProducts: { name: string; slug: string; sold: number; revenue: number }[];
  recentOrders: {
    orderNumber: string;
    status: string;
    total: number;
    placedAt: Date;
    customer: string;
    sellerOrders: number;
  }[];
};

export async function getAdminStats(days = 30): Promise<AdminStats> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const [
    orderAgg,
    payoutGroups,
    customerCount,
    sellerCount,
    productCount,
    pendingApplications,
    pendingPayouts,
    pendingReturns,
    pendingProducts,
    ordersInRange,
    customersInRange,
    categorySales,
    productSales,
    recentOrders,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { status: { notIn: ["CANCELLED"] } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.payout.groupBy({ by: ["status"], _sum: { amount: true } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.sellerProfile.count({ where: { applicationStatus: "APPROVED" } }),
    prisma.product.count({ where: { status: { in: ["ACTIVE", "PENDING_REVIEW"] } } }),
    prisma.sellerProfile.count({ where: { applicationStatus: "PENDING" } }),
    prisma.payout.count({ where: { status: { in: ["REQUESTED", "APPROVED"] } } }),
    prisma.returnRequest.count({ where: { status: "REQUESTED" } }),
    prisma.product.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.order.findMany({
      where: { placedAt: { gte: since } },
      select: { placedAt: true, total: true, status: true },
    }),
    prisma.user.findMany({
      where: { role: "CUSTOMER", createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.orderItem.groupBy({
      by: ["shopId"],
      where: { order: { placedAt: { gte: since }, status: { not: "CANCELLED" } } },
      _sum: { lineTotal: true },
      _count: { _all: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { placedAt: { gte: since }, status: { not: "CANCELLED" } } },
      _sum: { quantity: true, lineTotal: true },
      _count: { _all: true },
    }),
    prisma.order.findMany({
      orderBy: { placedAt: "desc" },
      take: 8,
      select: {
        orderNumber: true,
        status: true,
        total: true,
        placedAt: true,
        customer: { select: { name: true } },
        _count: { select: { sellerOrders: true } },
      },
    }),
  ]);

  const platformCommission = await prisma.sellerOrder.aggregate({
    where: { status: { not: "CANCELLED" } },
    _sum: { commissionTotal: true },
  });

  const paidPayouts = payoutGroups
    .filter((g) => g.status === "PAID")
    .reduce((sum, g) => sum + (g._sum.amount ?? 0), 0);
  const platformCommissionTotal = platformCommission._sum.commissionTotal ?? 0;

  // Category rollup via shop → products (top categories by revenue).
  const shopIds = categorySales.map((c) => c.shopId).filter(Boolean);
  const shopRows = shopIds.length
    ? await prisma.shop.findMany({
        where: { id: { in: shopIds as string[] } },
        select: { id: true, products: { where: { categoryId: { not: null } }, take: 1, select: { categoryId: true, category: { select: { name: true, slug: true } } } } },
      })
    : [];
  const categoryAgg = new Map<string, { name: string; slug: string; orders: number; revenue: number }>();
  for (const sale of categorySales) {
    const shop = shopRows.find((s) => s.id === sale.shopId);
    const cat = shop?.products[0]?.category;
    const key = cat?.slug ?? "other";
    const entry = categoryAgg.get(key) ?? { name: cat?.name ?? "Other", slug: key, orders: 0, revenue: 0 };
    entry.orders += sale._count._all;
    entry.revenue += sale._sum.lineTotal ?? 0;
    categoryAgg.set(key, entry);
  }

  const topProductIds = [...new Set(productSales.map((p) => p.productId))];
  const topProductRows = topProductIds.length
    ? await prisma.product.findMany({
        where: { id: { in: topProductIds } },
        select: { id: true, name: true, slug: true },
      })
    : [];
  const topProducts = productSales
    .map((p) => {
      const product = topProductRows.find((r) => r.id === p.productId);
      return {
        name: product?.name ?? "Deleted product",
        slug: product?.slug ?? "",
        sold: p._sum.quantity ?? 0,
        revenue: p._sum.lineTotal ?? 0,
      };
    })
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  return {
    revenue: orderAgg._sum.total ?? 0,
    commission: platformCommissionTotal,
    sellerPayouts: paidPayouts,
    orderCount: orderAgg._count._all,
    customerCount,
    sellerCount,
    productCount,
    pendingApplications,
    pendingPayouts,
    pendingReturns,
    pendingProducts,
    revenueSeries: bucketDays(ordersInRange, days, (o) => o.placedAt, (o) => o.status === "CANCELLED" ? 0 : o.total),
    ordersSeries: bucketDays(ordersInRange, days, (o) => o.placedAt, () => 1),
    newCustomersSeries: bucketDays(customersInRange, days, (u) => u.createdAt, () => 1),
    topCategories: [...categoryAgg.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    topProducts,
    recentOrders: recentOrders.map((o) => ({
      orderNumber: o.orderNumber,
      status: o.status,
      total: o.total,
      placedAt: o.placedAt,
      customer: o.customer.name,
      sellerOrders: o._count.sellerOrders,
    })),
  };
}

// ---------------------------------------------------------------------------
// Sellers
// ---------------------------------------------------------------------------

export async function listAdminSellers(params: {
  status?: SellerApplicationStatus | "ALL";
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 15));
  const where: Record<string, unknown> = {};
  if (params.status && params.status !== "ALL") where.applicationStatus = params.status;
  if (params.q?.trim()) {
    const q = params.q.trim();
    where.user = { OR: [{ name: { contains: q } }, { email: { contains: q } }] };
  }

  const [sellers, total] = await Promise.all([
    prisma.sellerProfile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        applicationStatus: true,
        businessName: true,
        businessType: true,
        commissionBps: true,
        ratingSum: true,
        ratingCount: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, isActive: true } },
        shops: { select: { id: true, name: true, slug: true, status: true } },
        _count: { select: { products: true } },
      },
    }),
    prisma.sellerProfile.count({ where }),
  ]);

  return { sellers, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function reviewSellerApplication(
  adminUserId: string,
  input: { sellerId: string; action: "APPROVED" | "REJECTED" | "SUSPENDED"; note?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const seller = await prisma.sellerProfile.findUnique({
    where: { id: input.sellerId },
    select: { id: true, userId: true, applicationStatus: true },
  });
  if (!seller) return { ok: false, error: "Seller not found." };

  const valid: Record<string, SellerApplicationStatus[]> = {
    APPROVED: ["PENDING", "REJECTED", "SUSPENDED"],
    REJECTED: ["PENDING", "APPROVED"],
    SUSPENDED: ["APPROVED"],
  };
  if (!valid[input.action]?.includes(seller.applicationStatus)) {
    return { ok: false, error: `Cannot ${input.action.toLowerCase()} a ${seller.applicationStatus} seller.` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.sellerProfile.update({
      where: { id: seller.id },
      data: {
        applicationStatus: input.action,
        applicationNote: input.note || null,
        reviewedAt: new Date(),
        reviewedById: adminUserId,
      },
    });
    if (input.action === "APPROVED") {
      await tx.user.update({ where: { id: seller.userId }, data: { role: "SELLER" } });
    }
    if (input.action === "SUSPENDED") {
      await tx.shop.updateMany({ where: { sellerId: seller.id }, data: { status: "SUSPENDED" } });
      await tx.product.updateMany({
        where: { sellerId: seller.id },
        data: { status: "DISABLED" },
      });
    }
    if (input.action === "APPROVED") {
      await tx.shop.updateMany({ where: { sellerId: seller.id }, data: { status: "ACTIVE" } });
    }
  });

  const message =
    input.action === "APPROVED"
      ? "Your seller application was approved — create your shop and start selling."
      : input.action === "REJECTED"
        ? "Your seller application was rejected."
        : "Your seller account has been suspended.";
  await notify(seller.userId, input.action === "APPROVED" ? "PRODUCT_APPROVED" : "SYSTEM", message, {
    link: "/seller",
  });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Product moderation
// ---------------------------------------------------------------------------

export async function moderateProduct(
  adminUserId: string,
  input: { productId: string; action: "APPROVED" | "REJECTED" | "DISABLED"; note?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, sellerId: true, status: true, name: true },
  });
  if (!product) return { ok: false, error: "Product not found." };

  const nextStatus =
    input.action === "APPROVED" ? "ACTIVE" : input.action === "REJECTED" ? "REJECTED" : "DISABLED";
  if (product.status === nextStatus) return { ok: false, error: "Product is already in that state." };

  await prisma.product.update({
    where: { id: product.id },
    data: {
      status: nextStatus,
      publishedAt: nextStatus === "ACTIVE" ? new Date() : undefined,
    },
  });

  const seller = await prisma.sellerProfile.findUnique({
    where: { id: product.sellerId },
    select: { userId: true },
  });
  if (seller) {
    await notify(
      seller.userId,
      input.action === "APPROVED" ? "PRODUCT_APPROVED" : "PRODUCT_REJECTED",
      `"${product.name}" ${input.action === "APPROVED" ? "is now live" : input.action.toLowerCase() + "d"}`,
      { body: input.note || undefined, link: "/seller/products" },
    );
  }
  void adminUserId;
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Orders (admin view of parent + children)
// ---------------------------------------------------------------------------

export async function listAdminOrders(params: {
  status?: OrderStatus | "ALL";
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 15));
  const where: Record<string, unknown> = {};
  if (params.status && params.status !== "ALL") where.status = params.status;
  if (params.q?.trim()) {
    const q = params.q.trim();
    where.OR = [
      { orderNumber: { contains: q } },
      { customer: { OR: [{ name: { contains: q } }, { email: { contains: q } }] } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        subtotal: true,
        shippingTotal: true,
        discountTotal: true,
        total: true,
        placedAt: true,
        customer: { select: { name: true, email: true } },
        _count: { select: { items: true, sellerOrders: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getAdminOrderDetail(orderNumber: string) {
  return prisma.order.findUnique({
    where: { orderNumber },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      subtotal: true,
      shippingTotal: true,
      discountTotal: true,
      taxTotal: true,
      total: true,
      couponCode: true,
      note: true,
      shippingAddress: true,
      placedAt: true,
      confirmedAt: true,
      deliveredAt: true,
      customer: { select: { id: true, name: true, email: true, phone: true } },
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          sku: true,
          imageUrl: true,
          quantity: true,
          unitPrice: true,
          lineTotal: true,
          shopId: true,
        },
      },
      sellerOrders: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          subtotal: true,
          shippingTotal: true,
          commissionTotal: true,
          earningTotal: true,
          commissionBps: true,
          shop: { select: { id: true, name: true, slug: true } },
          seller: { select: { id: true, businessName: true, user: { select: { name: true } } } },
        },
      },
      payments: {
        select: { method: true, provider: true, amount: true, status: true, createdAt: true },
      },
      returnRequests: {
        select: {
          id: true,
          reason: true,
          note: true,
          status: true,
          createdAt: true,
          orderItemId: true,
          sellerOrderId: true,
        },
      },
      refunds: {
        select: { id: true, amount: true, status: true, note: true, createdAt: true },
      },
    },
  });
}
