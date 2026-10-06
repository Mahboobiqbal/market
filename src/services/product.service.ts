import "server-only";
import { cache } from "react";
import type { ProductStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { findProductIds } from "@/lib/search/product-search";
import {
  CATALOG_MAX_PAGE_SIZE,
  CATALOG_PAGE_SIZE,
  type ProductSort,
} from "@/constants";
import { discountPercent } from "@/lib/utils/format";
import { getCategoryTree } from "@/services/category.service";

/**
 * Public catalog queries. All reads are read-only and safe for caching;
 * all writes live in product.actions.ts (seller-scoped) and admin actions.
 */

const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  salePrice: true,
  effectivePrice: true,
  ratingAvg: true,
  ratingCount: true,
  totalSold: true,
  publishedAt: true,
  images: {
    orderBy: { position: "asc" as const },
    take: 1,
    select: { url: true, alt: true },
  },
  shop: { select: { id: true, name: true, slug: true } },
  category: { select: { name: true, slug: true } },
  inventory: { select: { quantity: true, reserved: true } },
} as const;

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  effectivePrice: number;
  ratingAvg: number;
  ratingCount: number;
  totalSold: number;
  publishedAt: Date | null;
  images: { url: string; alt: string }[];
  shop: { id: string; name: string; slug: string };
  category: { name: string; slug: string } | null;
  inventory: { quantity: number; reserved: number } | null;
  discount: number | null;
  rating: number;
  inStock: boolean;
};

export type ProductListParams = {
  q?: string;
  category?: string; // category slug (includes children)
  brand?: string; // brand slug
  shop?: string; // shop slug
  minPrice?: number; // minor units
  maxPrice?: number; // minor units
  minRating?: number; // 1..5 stars
  inStock?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
  /** Internal scoping for dashboards (bypasses public ACTIVE filter). */
  sellerId?: string;
  statuses?: ProductStatus[];
};

export type ProductListResult = {
  items: ProductCardData[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  brandFacets: { id: string; name: string; slug: string; productCount: number }[];
  priceRange: { min: number | null; max: number | null };
};

const SORT_ORDER: Record<ProductSort, Record<string, "asc" | "desc">[]> = {
  relevance: [{ totalSold: "desc" }, { publishedAt: "desc" }],
  newest: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  price_asc: [{ effectivePrice: "asc" }],
  price_desc: [{ effectivePrice: "desc" }],
  rating: [{ ratingAvg: "desc" }, { ratingCount: "desc" }],
  popular: [{ totalSold: "desc" }, { ratingCount: "desc" }],
};

export type ProductCardRow = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

function toCard(row: ProductCardRow): ProductCardData {
  const discount = discountPercent(row.price, row.salePrice);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    price: row.price,
    salePrice: row.salePrice,
    effectivePrice: row.effectivePrice,
    ratingAvg: row.ratingAvg,
    ratingCount: row.ratingCount,
    totalSold: row.totalSold,
    publishedAt: row.publishedAt,
    images: row.images,
    shop: row.shop,
    category: row.category,
    inventory: row.inventory,
    discount,
    rating: Math.round((row.ratingAvg / 100) * 10) / 10,
    inStock: (row.inventory ? row.inventory.quantity - row.inventory.reserved : 0) > 0,
  };
}

async function resolveCategoryIds(slug: string): Promise<string[] | null> {
  const found = await prisma.category.findUnique({
    where: { slug },
    select: {
      id: true,
      children: { select: { id: true }, where: { isActive: true } },
    },
  });
  if (!found) return null;
  return [found.id, ...found.children.map((c) => c.id)];
}

export async function listProducts(params: ProductListParams = {}): Promise<ProductListResult> {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(
    CATALOG_MAX_PAGE_SIZE,
    Math.max(1, Math.floor(params.pageSize ?? CATALOG_PAGE_SIZE)),
  );
  const sort: ProductSort =
    (params.sort as ProductSort) && SORT_ORDER[params.sort as ProductSort]
      ? (params.sort as ProductSort)
      : "relevance";

  const where: Record<string, unknown> = {};
  const AND: Record<string, unknown>[] = [];

  if (params.sellerId) {
    where.sellerId = params.sellerId;
    if (params.statuses) where.status = { in: params.statuses };
  } else {
    where.status = params.statuses ? { in: params.statuses } : "ACTIVE";
  }

  if (params.category) {
    const ids = await resolveCategoryIds(params.category);
    if (ids) where.categoryId = { in: ids };
    else where.categoryId = "__no_match__";
  }

  if (params.brand) {
    const brand = await prisma.brand.findUnique({ where: { slug: params.brand }, select: { id: true } });
    where.brandId = brand?.id ?? "__no_match__";
  }

  if (params.shop) {
    const shop = await prisma.shop.findUnique({ where: { slug: params.shop }, select: { id: true } });
    where.shopId = shop?.id ?? "__no_match__";
  }

  if (typeof params.minPrice === "number" || typeof params.maxPrice === "number") {
    const range: Record<string, number> = {};
    if (typeof params.minPrice === "number") range.gte = params.minPrice;
    if (typeof params.maxPrice === "number") range.lte = params.maxPrice;
    where.effectivePrice = range;
  }

  if (typeof params.minRating === "number" && params.minRating > 0) {
    where.ratingAvg = { gte: Math.round(params.minRating * 100) };
  }

  if (params.inStock) {
    where.inventory = { is: { quantity: { gt: 0 } } };
  }

  // Free-text search via the pluggable search abstraction.
  if (params.q && params.q.trim().length >= 2) {
    const ids = await findProductIds(params.q);
    where.id = ids.length > 0 ? { in: ids } : { in: [] };
  }

  const whereClause = AND.length > 0 ? { AND: [where, ...AND] } : where;

  const [total, rows, brandGroups, priceAgg] = await Promise.all([
    prisma.product.count({ where: whereClause }),
    prisma.product.findMany({
      where: whereClause,
      orderBy: SORT_ORDER[sort],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: productCardSelect,
    }),
    prisma.product.groupBy({
      by: ["brandId"],
      where: { ...whereClause, brandId: { not: null } },
      _count: { _all: true },
    }),
    prisma.product.aggregate({
      where: whereClause,
      _min: { effectivePrice: true },
      _max: { effectivePrice: true },
    }),
  ]);

  const brandIds = brandGroups
    .map((g) => g.brandId)
    .filter((id): id is string => Boolean(id));
  const [brands, priceRange] = await Promise.all([
    brandIds.length > 0
      ? prisma.brand.findMany({
          where: { id: { in: brandIds }, isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, slug: true },
        })
      : Promise.resolve([]),
    Promise.resolve({
      min: priceAgg._min.effectivePrice,
      max: priceAgg._max.effectivePrice,
    }),
  ]);

  const countByBrand = new Map(brandGroups.map((g) => [g.brandId, g._count._all]));

  return {
    items: rows.map(toCard),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    brandFacets: brands.map((b) => ({ ...b, productCount: countByBrand.get(b.id) ?? 0 })),
    priceRange,
  };
}

export type ProductDetail = ProductCardData & {
  description: string;
  shortDescription: string | null;
  sku: string;
  status: ProductStatus;
  brand: { id: string; name: string; slug: string } | null;
  shop: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    bannerUrl: string | null;
    tagline: string | null;
    ratingSum: number;
    ratingCount: number;
    createdAt: Date;
  };
  sellerId: string;
  categoryId: string | null;
  attributes: unknown;
  specifications: unknown;
  shippingInfo: unknown;
  metaTitle: string | null;
  metaDescription: string | null;
  images: { url: string; alt: string; position: number }[];
  variants: {
    id: string;
    name: string;
    sku: string;
    price: number | null;
    options: unknown;
    isActive: boolean;
  }[];
};

export async function getProductDetail(slug: string): Promise<ProductDetail | null> {
  const row = await prisma.product.findUnique({
    where: { slug },
    select: {
      ...productCardSelect,
      description: true,
      shortDescription: true,
      sku: true,
      status: true,
      brand: { select: { id: true, name: true, slug: true } },
      shop: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          bannerUrl: true,
          tagline: true,
          ratingSum: true,
          ratingCount: true,
          createdAt: true,
        },
      },
      sellerId: true,
      categoryId: true,
      attributes: true,
      specifications: true,
      shippingInfo: true,
      metaTitle: true,
      metaDescription: true,
      images: { orderBy: { position: "asc" }, select: { url: true, alt: true, position: true } },
      variants: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, sku: true, price: true, options: true, isActive: true },
      },
    },
  });
  if (!row) return null;
  const base = toCard(row);
  return {
    ...base,
    images: row.images,
    description: row.description,
    shortDescription: row.shortDescription,
    sku: row.sku,
    status: row.status,
    brand: row.brand,
    shop: row.shop,
    sellerId: row.sellerId,
    categoryId: row.categoryId,
    attributes: row.attributes,
    specifications: row.specifications,
    shippingInfo: row.shippingInfo,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    variants: row.variants,
  };
}

/** Product card data for a set of IDs (cart, wishlist, admin tables). */
export async function getProductsByIds(ids: string[]): Promise<ProductCardData[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: productCardSelect,
  });
  const byId = new Map(rows.map((r) => [r.id, toCard(r)]));
  return ids.map((id) => byId.get(id)).filter((r): r is ProductCardData => Boolean(r));
}

/** Same-category (fallback: same-shop) products, best sellers first. */
export async function getRelatedProducts(
  product: { id: string; categoryId: string | null; shopId: string },
  limit = 8,
): Promise<ProductCardData[]> {
  const where =
    product.categoryId != null
      ? { categoryId: product.categoryId, id: { not: product.id } }
      : { shopId: product.shopId, id: { not: product.id } };
  const rows = await prisma.product.findMany({
    where: { ...where, status: "ACTIVE" },
    orderBy: [{ totalSold: "desc" }, { ratingCount: "desc" }],
    take: limit,
    select: productCardSelect,
  });
  return rows.map(toCard);
}

export type HomeData = {
  categories: Awaited<ReturnType<typeof getCategoryTree>>;
  featured: ProductCardData[];
  newArrivals: ProductCardData[];
  offers: ProductCardData[];
  topShops: {
    id: string;
    name: string;
    slug: string;
    tagline: string | null;
    logoUrl: string | null;
    ratingSum: number;
    ratingCount: number;
    productCount: number;
  }[];
};

/** Everything the homepage needs, in one cached call. */
export const getHomeData = cache(async (): Promise<HomeData> => {
  const card = { select: productCardSelect };
  const [categories, featuredRows, newRows, offerRows, shopCounts] = await Promise.all([
    getCategoryTree(),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ totalSold: "desc" }, { ratingCount: "desc" }],
      take: 8,
      ...card,
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", publishedAt: { not: null } },
      orderBy: [{ publishedAt: "desc" }],
      take: 8,
      ...card,
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", salePrice: { not: null } },
      orderBy: [{ publishedAt: "desc" }],
      take: 8,
      ...card,
    }),
    prisma.product.groupBy({
      by: ["shopId"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
    }),
  ]);

  const counts = new Map(shopCounts.map((g) => [g.shopId, g._count._all]));
  const shops =
    counts.size > 0
      ? await prisma.shop.findMany({
          where: { status: "ACTIVE", id: { in: [...counts.keys()] } },
          orderBy: [{ ratingCount: "desc" }, { createdAt: "asc" }],
          take: 6,
          select: {
            id: true,
            name: true,
            slug: true,
            tagline: true,
            logoUrl: true,
            ratingSum: true,
            ratingCount: true,
            createdAt: true,
          },
        })
      : [];

  return {
    categories,
    featured: featuredRows.map(toCard),
    newArrivals: newRows.map(toCard),
    offers: offerRows.map(toCard),
    topShops: shops.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      tagline: s.tagline,
      logoUrl: s.logoUrl,
      ratingSum: s.ratingSum,
      ratingCount: s.ratingCount,
      productCount: counts.get(s.id) ?? 0,
    })),
  };
});

/** Slugs for sitemap generation (Phase 8 SEO). */
export async function getAllActiveProductSlugs(): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}
