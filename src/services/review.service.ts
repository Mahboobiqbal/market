import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

/** Product reviews + rating aggregate maintenance (single writer path). */

export type ReviewInput = {
  productId: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
};

async function recomputeProductRating(tx: Prisma.TransactionClient, productId: string) {
  const agg = await tx.review.aggregate({
    where: { productId, isApproved: true },
    _sum: { rating: true },
    _count: { _all: true },
  });
  const sum = agg._sum.rating ?? 0;
  const count = agg._count._all;
  await tx.product.update({
    where: { id: productId },
    data: { ratingSum: sum, ratingCount: count, ratingAvg: count > 0 ? Math.round((sum / count) * 100) : 0 },
  });
}

async function recomputeShopRating(tx: Prisma.TransactionClient, shopId: string) {
  const agg = await tx.review.aggregate({
    where: { shopId, isApproved: true },
    _sum: { rating: true },
    _count: { _all: true },
  });
  await tx.shop.update({
    where: { id: shopId },
    data: { ratingSum: agg._sum.rating ?? 0, ratingCount: agg._count._all },
  });
}

async function recomputeSellerRating(tx: Prisma.TransactionClient, sellerId: string) {
  const shops = await tx.shop.findMany({ where: { sellerId }, select: { id: true } });
  if (shops.length === 0) return;
  const agg = await tx.review.aggregate({
    where: { shopId: { in: shops.map((s) => s.id) }, isApproved: true },
    _sum: { rating: true },
    _count: { _all: true },
  });
  await tx.sellerProfile.update({
    where: { id: sellerId },
    data: { ratingSum: agg._sum.rating ?? 0, ratingCount: agg._count._all },
  });
}

export async function getProductReviewStats(productId: string) {
  const [count, agg, distribution] = await Promise.all([
    prisma.review.count({ where: { productId, isApproved: true } }),
    prisma.review.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true },
    }),
    prisma.review.groupBy({
      by: ["rating"],
      where: { productId, isApproved: true },
      _count: { _all: true },
    }),
  ]);
  const byRating = new Map(distribution.map((d) => [d.rating, d._count._all]));
  return {
    count,
    average: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0,
    distribution: [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: byRating.get(star) ?? 0,
      percent: count > 0 ? Math.round(((byRating.get(star) ?? 0) / count) * 100) : 0,
    })),
  };
}

export async function listProductReviews(productId: string, page = 1, pageSize = 5) {
  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where: { productId, isApproved: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        rating: true,
        title: true,
        comment: true,
        createdAt: true,
        user: { select: { name: true, avatarUrl: true } },
      },
    }),
    prisma.review.count({ where: { productId, isApproved: true } }),
  ]);
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Has the customer actually received this product? (review eligibility) */
export async function canReviewProduct(userId: string, productId: string): Promise<boolean> {
  const delivered = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: { userId, status: "DELIVERED" },
    },
    select: { id: true },
  });
  return Boolean(delivered);
}

export async function getUserProductReview(userId: string, productId: string) {
  return prisma.review.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { id: true, rating: true, title: true, comment: true, createdAt: true },
  });
}

export async function createOrUpdateReview(
  userId: string,
  input: ReviewInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, shopId: true, sellerId: true },
  });
  if (!product) return { ok: false, error: "Product not found." };

  if (!(await canReviewProduct(userId, product.id))) {
    return { ok: false, error: "You can review products after your order is delivered." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.review.upsert({
      where: { userId_productId: { userId, productId: product.id } },
      update: {
        rating,
        title: input.title?.slice(0, 120) ?? null,
        comment: input.comment?.slice(0, 2000) ?? null,
        isApproved: true,
      },
      create: {
        userId,
        productId: product.id,
        shopId: product.shopId,
        rating,
        title: input.title?.slice(0, 120) ?? null,
        comment: input.comment?.slice(0, 2000) ?? null,
        isApproved: true,
      },
    });
    await recomputeProductRating(tx, product.id);
    await recomputeShopRating(tx, product.shopId);
    await recomputeSellerRating(tx, product.sellerId);
  });

  return { ok: true };
}

export async function deleteReview(userId: string, reviewId: string): Promise<void> {
  const review = await prisma.review.findFirst({
    where: { id: reviewId, userId },
    select: { id: true, productId: true, shopId: true },
  });
  if (!review) return;
  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id: review.id } });
    if (review.productId) await recomputeProductRating(tx, review.productId);
    if (review.shopId) {
      await recomputeShopRating(tx, review.shopId);
      const shop = await tx.shop.findUnique({ where: { id: review.shopId }, select: { sellerId: true } });
      if (shop) await recomputeSellerRating(tx, shop.sellerId);
    }
  });
}

/** Admin: approve a pending review (recomputes aggregates). */
export async function approveReview(reviewId: string): Promise<{ ok: boolean }> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, productId: true, shopId: true, isApproved: true },
  });
  if (!review) return { ok: false };
  await prisma.$transaction(async (tx) => {
    await tx.review.update({ where: { id: review.id }, data: { isApproved: true } });
    if (review.productId) await recomputeProductRating(tx, review.productId);
    if (review.shopId) {
      await recomputeShopRating(tx, review.shopId);
      const shop = await tx.shop.findUnique({ where: { id: review.shopId }, select: { sellerId: true } });
      if (shop) await recomputeSellerRating(tx, shop.sellerId);
    }
  });
  return { ok: true };
}
