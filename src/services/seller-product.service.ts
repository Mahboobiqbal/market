import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { ProductFormValues } from "@/lib/validation/product.schema";
import { slugify } from "@/lib/validation/money";

/**
 * Seller-scoped product management.
 * Every function takes `sellerId` and filters by it — seller isolation
 * is enforced in the data layer, never in the UI.
 */

async function assertOwnership(sellerId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, sellerId },
    select: { id: true, shopId: true, status: true, slug: true },
  });
  return product;
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base || "product";
  let suffix = 1;
  // Bounded probe — collisions are rare with seller+timestamp base.
  while (await prisma.product.findUnique({ where: { slug }, select: { id: true } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
    if (suffix > 50) {
      slug = `${base}-${Date.now().toString(36)}`;
      break;
    }
  }
  return slug;
}

function effectiveOf(price: number, salePrice?: number | null): number {
  if (salePrice && salePrice > 0 && salePrice < price) return salePrice;
  return price;
}

export type CreateProductResult =
  | { ok: true; productId: string }
  | { ok: false; error: string };

export async function createSellerProduct(
  sellerId: string,
  data: ProductFormValues,
): Promise<CreateProductResult> {
  const shop = await prisma.shop.findFirst({
    where: { sellerId, status: { in: ["ACTIVE", "PENDING"] } },
    select: { id: true, status: true },
  });
  if (!shop) return { ok: false, error: "Create your shop before adding products." };
  if (shop.status !== "ACTIVE") {
    return { ok: false, error: "Your shop is not active yet. Wait for admin approval." };
  }

  const skuTaken = await prisma.product.findFirst({
    where: { sku: data.sku, sellerId },
    select: { id: true },
  });
  if (skuTaken) return { ok: false, error: "You already have a product with this SKU." };

  const base = slugify(data.name);
  const slug = await uniqueSlug(`${base}`);

  try {
    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        shortDescription: data.shortDescription || null,
        price: data.price,
        salePrice: data.salePrice ?? null,
        effectivePrice: effectiveOf(data.price, data.salePrice),
        sku: data.sku,
        status: data.status,
        sellerId,
        shopId: shop.id,
        categoryId: data.categoryId || null,
        brandId: data.brandId || null,
        attributes: data.attributes ?? undefined,
        specifications: data.specifications ?? undefined,
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
        publishedAt: null,
        images: {
          create: data.images.length
            ? data.images.map((url, i) => ({ url, alt: data.name, position: i }))
            : [{ url: "/images/products/placeholder.svg", alt: data.name, position: 0 }],
        },
        variants: {
          create: data.variants.map((v) => ({
            name: v.name,
            sku: v.sku,
            price: v.price ?? null,
            options: v.options,
          })),
        },
        inventory: {
          create: {
            quantity: data.initialStock,
            lowStockThreshold: data.lowStockThreshold,
          },
        },
      },
      select: { id: true },
    });
    return { ok: true, productId: product.id };
  } catch (error) {
    console.error("[seller-product] create failed:", error);
    return { ok: false, error: "Could not create the product. Check unique SKU/name." };
  }
}

export async function updateSellerProduct(
  sellerId: string,
  productId: string,
  data: ProductFormValues,
): Promise<CreateProductResult> {
  const existing = await assertOwnership(sellerId, productId);
  if (!existing) return { ok: false, error: "Product not found." };

  const skuTaken = await prisma.product.findFirst({
    where: { sku: data.sku, sellerId, id: { not: productId } },
    select: { id: true },
  });
  if (skuTaken) return { ok: false, error: "You already have a product with this SKU." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: {
          name: data.name,
          description: data.description,
          shortDescription: data.shortDescription || null,
          price: data.price,
          salePrice: data.salePrice ?? null,
          effectivePrice: effectiveOf(data.price, data.salePrice),
          sku: data.sku,
          status: data.status,
          categoryId: data.categoryId || null,
          brandId: data.brandId || null,
          attributes: data.attributes ?? undefined,
          specifications: data.specifications ?? undefined,
          metaTitle: data.metaTitle || null,
          metaDescription: data.metaDescription || null,
          images: { deleteMany: {} },
          variants: { deleteMany: {} },
        },
      });
      await tx.productImage.createMany({
        data: (data.images.length ? data.images : ["/images/products/placeholder.svg"]).map(
          (url, i) => ({ productId, url, alt: data.name, position: i }),
        ),
      });
      if (data.variants.length > 0) {
        await tx.productVariant.createMany({
          data: data.variants.map((v) => ({
            productId,
            name: v.name,
            sku: v.sku,
            price: v.price ?? null,
            options: v.options,
          })),
        });
      }
      // Keep cart lines valid: drop items whose variant disappeared.
      await tx.cartItem.deleteMany({ where: { productId, variantId: { not: null } } });
    });
    return { ok: true, productId };
  } catch (error) {
    console.error("[seller-product] update failed:", error);
    return { ok: false, error: "Could not update the product." };
  }
}

export async function submitSellerProduct(
  sellerId: string,
  productId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await assertOwnership(sellerId, productId);
  if (!existing) return { ok: false, error: "Product not found." };
  if (existing.status === "ACTIVE") return { ok: false, error: "Product is already live." };
  await prisma.product.update({ where: { id: productId }, data: { status: "PENDING_REVIEW" } });
  return { ok: true };
}

export async function deleteSellerProduct(
  sellerId: string,
  productId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await assertOwnership(sellerId, productId);
  if (!existing) return { ok: false, error: "Product not found." };
  await prisma.$transaction(async (tx) => {
    await tx.cartItem.deleteMany({ where: { productId } });
    await tx.wishlist.deleteMany({ where: { productId } });
    await tx.productImage.deleteMany({ where: { productId } });
    await tx.productVariant.deleteMany({ where: { productId } });
    await tx.inventory.deleteMany({ where: { productId } });
    await tx.product.delete({ where: { id: productId } });
  });
  return { ok: true };
}

export async function updateSellerInventory(
  sellerId: string,
  productId: string,
  input: { quantity: number; lowStockThreshold: number },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await assertOwnership(sellerId, productId);
  if (!existing) return { ok: false, error: "Product not found." };
  await prisma.inventory.upsert({
    where: { productId },
    update: { quantity: input.quantity, lowStockThreshold: input.lowStockThreshold },
    create: { productId, quantity: input.quantity, lowStockThreshold: input.lowStockThreshold },
  });
  return { ok: true };
}

export async function getSellerProductDetail(sellerId: string, productId: string) {
  return prisma.product.findFirst({
    where: { id: productId, sellerId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      shortDescription: true,
      price: true,
      salePrice: true,
      sku: true,
      status: true,
      categoryId: true,
      brandId: true,
      attributes: true,
      specifications: true,
      metaTitle: true,
      metaDescription: true,
      images: { orderBy: { position: "asc" }, select: { url: true, alt: true } },
      variants: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, sku: true, price: true, options: true },
      },
      inventory: { select: { quantity: true, lowStockThreshold: true } },
    },
  });
}

export async function listSellerProducts(
  sellerId: string,
  params: { status?: string; q?: string; page?: number; pageSize?: number } = {},
) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 12));
  const where: Record<string, unknown> = { sellerId };
  if (params.status && params.status !== "ALL") where.status = params.status;
  if (params.q?.trim()) {
    where.OR = [
      { name: { contains: params.q.trim() } },
      { sku: { contains: params.q.trim().toUpperCase() } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        status: true,
        price: true,
        salePrice: true,
        effectivePrice: true,
        totalSold: true,
        createdAt: true,
        images: { orderBy: { position: "asc" as const }, take: 1, select: { url: true } },
        inventory: { select: { quantity: true, lowStockThreshold: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
