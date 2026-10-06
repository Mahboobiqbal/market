import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db/prisma";

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  position: number;
  children: CategoryNode[];
};

export type CategoryBreadcrumb = {
  id: string;
  name: string;
  slug: string;
};

/** Active category tree (roots + one level of children), ordered for navigation. */
export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      position: true,
      parentId: true,
    },
  });

  const byId = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];
  for (const c of categories) {
    byId.set(c.id, {
      id: c.id,
      name: c.name,
      slug: c.slug,
      imageUrl: c.imageUrl,
      position: c.position,
      children: [],
    });
  }
  for (const c of categories) {
    const node = byId.get(c.id)!;
    if (c.parentId && byId.has(c.parentId)) {
      byId.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
});

/** Category by slug with its ancestor chain (for breadcrumbs). */
export const getCategoryBySlug = cache(
  async (slug: string): Promise<{ category: Awaited<ReturnType<typeof rawCategory>>; ancestors: CategoryBreadcrumb[] } | null> => {
    const category = await rawCategory(slug);
    if (!category) return null;

    const ancestors: CategoryBreadcrumb[] = [];
    let parentId = category.parentId;
    // Bounded walk — category trees are shallow by design.
    for (let depth = 0; parentId && depth < 6; depth++) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId },
        select: { id: true, name: true, slug: true, parentId: true },
      });
      if (!parent) break;
      ancestors.unshift({ id: parent.id, name: parent.name, slug: parent.slug });
      parentId = parent.parentId;
    }
    return { category, ancestors };
  },
);

function rawCategory(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      parentId: true,
      metaTitle: true,
      metaDescription: true,
      position: true,
      children: {
        where: { isActive: true },
        orderBy: [{ position: "asc" }, { name: "asc" }],
        select: { id: true, name: true, slug: true, imageUrl: true, position: true },
      },
    },
  });
}

/** All active brands that have at least one active product. */
export const getActiveBrands = cache(async () => {
  const groups = await prisma.product.groupBy({
    by: ["brandId"],
    where: { status: "ACTIVE", brandId: { not: null } },
    _count: { _all: true },
  });
  const counts = new Map(
    groups
      .filter((g) => g.brandId)
      .map((g) => [g.brandId as string, g._count._all]),
  );
  if (counts.size === 0) return [];
  const brands = await prisma.brand.findMany({
    where: { id: { in: [...counts.keys()] }, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, logoUrl: true },
  });
  return brands.map((b) => ({ ...b, productCount: counts.get(b.id) ?? 0 }));
});
