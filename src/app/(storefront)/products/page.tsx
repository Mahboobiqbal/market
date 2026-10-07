import type { Metadata } from "next";
import { CatalogView } from "@/components/catalog/catalog-view";
import { getSessionUser } from "@/lib/auth/dal";
import { parseCatalogQuery, type SearchParams } from "@/lib/search/params";
import { getCategoryTree } from "@/services/category.service";
import { listProducts } from "@/services/product.service";
import { getWishlistedIds } from "@/services/wishlist.service";

export const metadata: Metadata = {
  title: "Products",
  description: "Browse the full Nexus Market catalog with filters, brands, and price ranges.",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const query = parseCatalogQuery(sp);
  const user = await getSessionUser();

  const [result, categoryTree, wishIds] = await Promise.all([
    listProducts({
      q: query.q || undefined,
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

  const heading = query.q ? `Results for “${query.q}”` : "All products";

  return (
    <CatalogView
      heading={heading}
      query={query}
      basePath="/products"
      result={result}
      categoryTree={categoryTree}
      wishIds={wishIds}
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Products" }]}
    />
  );
}
