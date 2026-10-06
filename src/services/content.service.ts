import "server-only";
import { prisma } from "@/lib/db/prisma";
import type {
  bannerFormSchema,
  categoryFormSchema,
  commissionRuleSchema,
  couponFormSchema,
} from "@/lib/validation/admin.schema";
import type { z } from "zod";

/** Admin content management: categories, coupons, banners, commission rules. */

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export type CategoryAdminRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  position: number;
  isActive: boolean;
  imageUrl: string | null;
  productCount: number;
  children: CategoryAdminRow;
};

export async function listCategoriesAdmin() {
  const [categories, counts] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        position: true,
        isActive: true,
        imageUrl: true,
        metaTitle: true,
        metaDescription: true,
      },
    }),
    prisma.product.groupBy({
      by: ["categoryId"],
      _count: { _all: true },
    }),
  ]);
  const countBy = new Map(counts.map((c) => [c.categoryId, c._count._all]));
  return categories.map((c) => ({ ...c, productCount: countBy.get(c.id) ?? 0 }));
}

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export async function upsertCategory(
  id: string | null,
  data: CategoryFormValues,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const slugTaken = await prisma.category.findUnique({ where: { slug: data.slug }, select: { id: true } });
  if (slugTaken && slugTaken.id !== id) return { ok: false, error: "Slug already exists." };

  try {
    if (id) {
      const existing = await prisma.category.findUnique({ where: { id }, select: { id: true, parentId: true } });
      if (!existing) return { ok: false, error: "Category not found." };
      if (data.parentId && data.parentId === id) {
        return { ok: false, error: "A category cannot be its own parent." };
      }
      const updated = await prisma.category.update({
        where: { id },
        data: {
          name: data.name,
          slug: data.slug,
          parentId: data.parentId || null,
          imageUrl: data.imageUrl || null,
          position: data.position,
          isActive: data.isActive,
          metaTitle: data.metaTitle || null,
          metaDescription: data.metaDescription || null,
        },
      });
      return { ok: true, id: updated.id };
    }
    const created = await prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        parentId: data.parentId || null,
        imageUrl: data.imageUrl || null,
        position: data.position,
        isActive: data.isActive,
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
      },
    });
    return { ok: true, id: created.id };
  } catch (error) {
    console.error("[content] category upsert failed:", error);
    return { ok: false, error: "Could not save the category." };
  }
}

export async function deleteCategory(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [children, products] = await Promise.all([
    prisma.category.count({ where: { parentId: id } }),
    prisma.product.count({ where: { categoryId: id } }),
  ]);
  if (children > 0) {
    return { ok: false, error: "Move or delete subcategories first." };
  }
  if (products > 0) {
    return { ok: false, error: `${products} product(s) still use this category.` };
  }
  await prisma.category.deleteMany({ where: { id } });
  return { ok: true };
}

export async function reorderCategories(ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i++) {
    await prisma.category.update({ where: { id: ids[i] }, data: { position: i } });
  }
}

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

export type CouponFormValues = z.infer<typeof couponFormSchema>;

export async function listCouponsAdmin() {
  return prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      type: true,
      value: true,
      minOrder: true,
      maxUses: true,
      usedCount: true,
      startsAt: true,
      expiresAt: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function upsertCoupon(
  id: string | null,
  data: CouponFormValues,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const taken = await prisma.coupon.findUnique({ where: { code: data.code }, select: { id: true } });
  if (taken && taken.id !== id) return { ok: false, error: "Coupon code already exists." };

  const payload = {
    code: data.code,
    type: data.type,
    value: data.value,
    minOrder: data.minOrder,
    maxUses: data.maxUses,
    startsAt: data.startsAt,
    expiresAt: data.expiresAt,
    isActive: data.isActive,
  };
  if (id) {
    const existing = await prisma.coupon.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { ok: false, error: "Coupon not found." };
    await prisma.coupon.update({ where: { id }, data: payload });
    return { ok: true, id };
  }
  const created = await prisma.coupon.create({ data: payload });
  return { ok: true, id: created.id };
}

export async function deleteCoupon(id: string): Promise<void> {
  await prisma.coupon.deleteMany({ where: { id } });
}

// ---------------------------------------------------------------------------
// Banners
// ---------------------------------------------------------------------------

export type BannerFormValues = z.infer<typeof bannerFormSchema>;

export async function listBannersAdmin() {
  return prisma.banner.findMany({ orderBy: { position: "asc" } });
}

export async function upsertBanner(
  id: string | null,
  data: BannerFormValues,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const payload = {
    title: data.title,
    subtitle: data.subtitle || null,
    imageUrl: data.imageUrl,
    link: data.link || null,
    position: data.position,
    status: data.status,
    startsAt: data.startsAt ? new Date(data.startsAt) : null,
    endsAt: data.endsAt ? new Date(data.endsAt) : null,
  };
  if (id) {
    const existing = await prisma.banner.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { ok: false, error: "Banner not found." };
    await prisma.banner.update({ where: { id }, data: payload });
    return { ok: true, id };
  }
  const created = await prisma.banner.create({ data: payload });
  return { ok: true, id: created.id };
}

export async function deleteBanner(id: string): Promise<void> {
  await prisma.banner.deleteMany({ where: { id } });
}

/** Storefront: currently visible banners. */
export async function getActiveBanners(limit = 3) {
  const now = new Date();
  return prisma.banner.findMany({
    where: {
      status: "ACTIVE",
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: { position: "asc" },
    take: limit,
    select: { id: true, title: true, subtitle: true, imageUrl: true, link: true },
  });
}

// ---------------------------------------------------------------------------
// Commission rules
// ---------------------------------------------------------------------------

export type CommissionRuleValues = z.infer<typeof commissionRuleSchema>;

export async function listCommissionRules() {
  return prisma.commission.findMany({
    orderBy: [{ scope: "asc" }, { effectiveFrom: "desc" }],
    select: { id: true, scope: true, targetId: true, rateBps: true, isActive: true, effectiveFrom: true },
  });
}

export async function upsertCommissionRule(
  id: string | null,
  data: CommissionRuleValues,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (data.scope !== "GLOBAL" && !data.targetId) {
    return { ok: false, error: "Target is required for this scope." };
  }
  if (data.scope === "GLOBAL") {
    const existingGlobal = await prisma.commission.findFirst({
      where: { scope: "GLOBAL", isActive: true },
      select: { id: true },
    });
    if (existingGlobal && existingGlobal.id !== id) {
      await prisma.commission.update({
        where: { id: existingGlobal.id },
        data: { isActive: false },
      });
    }
  }
  const payload = {
    scope: data.scope,
    targetId: data.scope === "GLOBAL" ? null : data.targetId,
    rateBps: data.rateBps,
    isActive: true,
  };
  if (id) {
    const existing = await prisma.commission.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { ok: false, error: "Rule not found." };
    await prisma.commission.update({ where: { id }, data: payload });
    return { ok: true, id };
  }
  const created = await prisma.commission.create({ data: payload });
  return { ok: true, id: created.id };
}

export async function deleteCommissionRule(id: string): Promise<void> {
  await prisma.commission.deleteMany({ where: { id } });
}
