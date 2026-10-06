import "server-only";
import { prisma } from "@/lib/db/prisma";
import { getProductsByIds, type ProductCardData } from "@/services/product.service";

/** Wishlist — one row per user/product; toggle semantics. */

export async function listWishlist(userId: string): Promise<ProductCardData[]> {
  const rows = await prisma.wishlist.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { productId: true },
  });
  return getProductsByIds(rows.map((r) => r.productId));
}

export async function isWishlisted(userId: string, productId: string): Promise<boolean> {
  const row = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { id: true },
  });
  return Boolean(row);
}

/** Returns `true` when the product is now wishlisted (added), false if removed. */
export async function toggleWishlist(userId: string, productId: string): Promise<boolean> {
  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { id: true },
  });
  if (existing) {
    await prisma.wishlist.delete({ where: { id: existing.id } });
    return false;
  }
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) return false;
  await prisma.wishlist.create({ data: { userId, productId } });
  return true;
}

export async function removeWishlistItem(userId: string, productId: string): Promise<void> {
  await prisma.wishlist.deleteMany({ where: { userId, productId } });
}

/** Set of product IDs the user has wishlisted (for heart states in grids). */
export async function getWishlistedIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.wishlist.findMany({
    where: { userId },
    select: { productId: true },
  });
  return new Set(rows.map((r) => r.productId));
}
