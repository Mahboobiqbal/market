import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/catalog/catalog-view";
import { getSessionUser } from "@/lib/auth/dal";
import { parseCatalogQuery, type SearchParams } from "@/lib/search/params";
import { getCategoryBySlug, getCategoryTree } from "@/services/category.service";
import { listProducts } from "@/services/product.service";
import { getWishlistedIds } from "@/services/wishlist.service";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCategoryBySlug(slug);
  if (!data?.category) return {};
  return {
    title: data.category.metaTitle ?? data.category.name,
    description:
      data.category.metaDescription ?? `Shop ${data.category.name} on Nexus Market.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const data = await getCategoryBySlug(slug);
  if (!data?.category) notFound();

  const query = parseCatalogQuery(sp);
  const user = await getSessionUser();

  const [result, categoryTree, wishIds] = await Promise.all([
    listProducts({
      q: query.q || undefined,
      category: slug,
      brand: query.brand || undefined,
      minPrice: query.min != null ? Math.round(query.min * 100) : undefined,
      maxPrice: query.max != null ? Math.round(query.max * 100) : undefined,
      minRating: query.rating ?? undefined,
      inStock: query.stock || undefined,
      sort: query.sort,
      page: query.page,
    }),
    getCategoryTree(),
    user ? getWishlistedIds(user.id) : Promise.resolve(new Set<string>()),
  ]);

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Products", href: "/products" },
    ...data.ancestors.map((ancestor) => ({
      label: ancestor.name,
      href: `/categories/${ancestor.slug}`,
    })),
    { label: data.category.name },
  ];

  return (
    <CatalogView
      heading={data.category.name}
      query={query}
      basePath={`/categories/${slug}`}
      result={result}
      categoryTree={categoryTree}
      wishIds={wishIds}
      breadcrumbs={breadcrumbs}
    />
  );
}
