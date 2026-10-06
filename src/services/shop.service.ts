import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db/prisma";

/**
 * Public seller/storefront queries (platform.com/store/:slug).
 */

export const getShopBySlug = cache(async (slug: string) => {
  const shop = await prisma.shop.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      description: true,
      logoUrl: true,
      bannerUrl: true,
      contactEmail: true,
      contactPhone: true,
      status: true,
      ratingSum: true,
      ratingCount: true,
      createdAt: true,
      seller: {
        select: {
          id: true,
          businessName: true,
          applicationStatus: true,
          createdAt: true,
          user: { select: { name: true, avatarUrl: true, emailVerified: true } },
        },
      },
    },
  });
  if (!shop || shop.status !== "ACTIVE") return null;

  const counts = await prisma.product.groupBy({
    by: ["categoryId"],
    where: { shopId: shop.id, status: "ACTIVE" },
    _count: { _all: true },
  });
  const countByCategory = new Map(
    counts.map((c) => [c.categoryId, c._count._all] as const),
  );

  const categoryIds = counts
    .map((c) => c.categoryId)
    .filter((id): id is string => Boolean(id));
  const categories =
    categoryIds.length > 0
      ? await prisma.category.findMany({
          where: { id: { in: categoryIds } },
          orderBy: { name: "asc" },
          select: { id: true, name: true, slug: true },
        })
      : [];

  return {
    ...shop,
    rating: shop.ratingCount > 0 ? Math.round((shop.ratingSum / shop.ratingCount) * 10) / 10 : 0,
    productCount: counts.reduce((sum, c) => sum + c._count._all, 0),
    categories: categories.map((c) => ({ ...c, productCount: countByCategory.get(c.id) ?? 0 })),
  };
});

/** Shop review summary (approved only). */
export const getShopReviewSummary = cache(async (shopId: string) => {
  const [count, rows] = await Promise.all([
    prisma.review.count({ where: { shopId, isApproved: true } }),
    prisma.review.findMany({
      where: { shopId, isApproved: true },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        rating: true,
        title: true,
        comment: true,
        createdAt: true,
        user: { select: { name: true, avatarUrl: true } },
      },
    }),
  ]);
  return { count, recent: rows };
});
