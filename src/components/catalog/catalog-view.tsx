import Link from "next/link";
import { PackageSearch, Search, Star, X } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { Pagination } from "@/components/shared/pagination";
import { SortSelect } from "@/components/catalog/sort-select";
import { catalogQueryToParams, type CatalogQuery } from "@/lib/search/params";
import type { CategoryNode } from "@/services/category.service";
import type { ProductListResult } from "@/services/product.service";
import { cn } from "@/lib/utils";

type Breadcrumb = { label: string; href?: string };

type CatalogViewProps = {
  heading: string;
  subheading?: string;
  breadcrumbs?: Breadcrumb[];
  query: CatalogQuery;
  basePath: string;
  result: ProductListResult;
  categoryTree?: CategoryNode[];
  wishIds: Set<string>;
};

function hrefFor(basePath: string, query: Partial<CatalogQuery>): string {
  const params = catalogQueryToParams(query);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function CatalogView({
  heading,
  subheading,
  breadcrumbs,
  query,
  basePath,
  result,
  categoryTree,
  wishIds,
}: CatalogViewProps) {
  const sidebar = (
    <CatalogSidebar
      query={query}
      basePath={basePath}
      result={result}
      categoryTree={categoryTree}
    />
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          {breadcrumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? <span aria-hidden>/</span> : null}
              {crumb.href ? (
                <Link href={crumb.href} className="transition hover:text-foreground">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-60 shrink-0 lg:block">{sidebar}</aside>

        {/* Mobile filters */}
        <details className="group rounded-2xl border lg:hidden">
          <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium select-none">
            Filters
            <span className="text-xs text-muted-foreground group-open:hidden">Show</span>
            <span className="hidden text-xs text-muted-foreground group-open:inline">Hide</span>
          </summary>
          <div className="border-t px-4 pt-2 pb-4">{sidebar}</div>
        </details>

        <div className="min-w-0 flex-1">
          <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{heading}</h1>
              <p className="text-sm text-muted-foreground">
                {result.total.toLocaleString("en-PK")} product{result.total === 1 ? "" : "s"}
                {subheading ? ` · ${subheading}` : ""}
              </p>
            </div>
            <SortSelect sort={query.sort} />
          </header>

          <ActiveChips query={query} basePath={basePath} />

          {result.items.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {result.items.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  wishlisted={wishIds.has(product.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                {query.q ? <Search size={22} /> : <PackageSearch size={22} />}
              </span>
              <div className="space-y-1">
                <p className="font-medium">No products found</p>
                <p className="mx-auto max-w-md text-sm text-muted-foreground">
                  {query.q
                    ? `Nothing matched “${query.q}”. Try fewer keywords or clear filters.`
                    : "Try adjusting or clearing the filters."}
                </p>
              </div>
              <Link
                href={basePath}
                className="inline-flex h-8 items-center rounded-lg border px-3.5 text-sm font-medium transition hover:bg-muted"
              >
                Clear all filters
              </Link>
            </div>
          )}

          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            basePath={basePath}
            search={Object.fromEntries(catalogQueryToParams(query))}
            className="mt-8"
          />
        </div>
      </div>
    </div>
  );
}

function ActiveChips({ query, basePath }: { query: CatalogQuery; basePath: string }) {
  const chips: { key: string; label: string; href: string }[] = [];
  if (query.q) chips.push({ key: "q", label: `“${query.q}”`, href: hrefFor(basePath, { ...query, q: "" }) });
  if (query.brand) chips.push({ key: "brand", label: `Brand: ${query.brand}`, href: hrefFor(basePath, { ...query, brand: "" }) });
  if (query.min != null || query.max != null) {
    const label =
      query.min != null && query.max != null
        ? `Rs ${query.min} – Rs ${query.max}`
        : query.min != null
          ? `From Rs ${query.min}`
          : `Up to Rs ${query.max}`;
    chips.push({ key: "price", label, href: hrefFor(basePath, { ...query, min: null, max: null }) });
  }
  if (query.rating != null) {
    chips.push({
      key: "rating",
      label: `${query.rating}+ stars`,
      href: hrefFor(basePath, { ...query, rating: null }),
    });
  }
  if (query.stock) {
    chips.push({ key: "stock", label: "In stock only", href: hrefFor(basePath, { ...query, stock: false }) });
  }

  if (chips.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          className="inline-flex h-7 items-center gap-1 rounded-full border bg-muted/50 px-2.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          {chip.label}
          <X size={12} aria-hidden />
          <span className="sr-only">Remove filter</span>
        </Link>
      ))}
      <Link
        href={basePath}
        className="inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium text-primary transition hover:underline"
      >
        Clear all
      </Link>
    </div>
  );
}

function CatalogSidebar({
  query,
  basePath,
  result,
  categoryTree,
}: {
  query: CatalogQuery;
  basePath: string;
  result: ProductListResult;
  categoryTree?: CategoryNode[];
}) {
  const preserved: Partial<CatalogQuery> = {
    q: query.q,
    sort: query.sort,
    page: 1,
  };

  return (
    <div className="space-y-6">
      {categoryTree && categoryTree.length > 0 ? (
        <SidebarSection title="Categories">
          <ul className="space-y-0.5 text-sm">
            {categoryTree.map((root) => (
              <li key={root.id}>
                <Link
                  href={`/categories/${root.slug}`}
                  className={cn(
                    "block rounded-md px-2 py-1.5 transition hover:bg-muted",
                    query.category === root.slug && "bg-muted font-medium text-primary",
                  )}
                >
                  {root.name}
                </Link>
                {root.children.length > 0 ? (
                  <ul className="ml-3 border-l pl-2">
                    {root.children.slice(0, 8).map((child) => (
                      <li key={child.id}>
                        <Link
                          href={`/categories/${child.slug}`}
                          className="block rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </SidebarSection>
      ) : null}

      {result.brandFacets.length > 0 ? (
        <SidebarSection title="Brand">
          <ul className="space-y-0.5 text-sm">
            {result.brandFacets.map((brand) => (
              <li key={brand.id}>
                <Link
                  href={hrefFor(basePath, {
                    ...preserved,
                    brand: brand.slug === query.brand ? "" : brand.slug,
                  })}
                  className={cn(
                    "flex items-center justify-between rounded-md px-2 py-1.5 transition hover:bg-muted",
                    brand.slug === query.brand && "bg-muted font-medium text-primary",
                  )}
                >
                  <span>{brand.name}</span>
                  <span className="text-xs text-muted-foreground">{brand.productCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </SidebarSection>
      ) : null}

      <SidebarSection title="Price">
        <form
          action={basePath}
          method="get"
          className="flex items-center gap-2"
        >
          {/* Preserve current filters as hidden inputs */}
          {query.q ? <input type="hidden" name="q" value={query.q} /> : null}
          {query.brand ? <input type="hidden" name="brand" value={query.brand} /> : null}
          {query.rating ? <input type="hidden" name="rating" value={query.rating} /> : null}
          {query.stock ? <input type="hidden" name="stock" value="1" /> : null}
          {query.sort !== "relevance" ? <input type="hidden" name="sort" value={query.sort} /> : null}

          <input
            type="number"
            name="min"
            min={0}
            placeholder={result.priceRange.min != null ? String(Math.ceil(result.priceRange.min / 100)) : "Min"}
            defaultValue={query.min ?? ""}
            aria-label="Minimum price"
            className="h-8 w-full min-w-0 rounded-lg border bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="number"
            name="max"
            min={0}
            placeholder={result.priceRange.max != null ? String(Math.floor(result.priceRange.max / 100)) : "Max"}
            defaultValue={query.max ?? ""}
            aria-label="Maximum price"
            className="h-8 w-full min-w-0 rounded-lg border bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <button
            type="submit"
            className="h-8 shrink-0 rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Go
          </button>
        </form>
      </SidebarSection>

      <SidebarSection title="Rating">
        <ul className="space-y-0.5 text-sm">
          {[4, 3, 2].map((min) => (
            <li key={min}>
              <Link
                href={hrefFor(basePath, {
                  ...preserved,
                  brand: query.brand,
                  rating: query.rating === min ? null : min,
                })}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-muted",
                  query.rating === min && "bg-muted font-medium text-primary",
                )}
              >
                <span className="flex items-center gap-0.5 text-amber-400">
                  {Array.from({ length: min }, (_, i) => (
                    <Star key={i} size={12} className="fill-current" />
                  ))}
                </span>
                <span className="text-muted-foreground">& up</span>
              </Link>
            </li>
          ))}
        </ul>
      </SidebarSection>

      <SidebarSection title="Availability">
        <Link
          href={hrefFor(basePath, { ...preserved, brand: query.brand, stock: !query.stock })}
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-muted",
            query.stock && "bg-muted font-medium text-primary",
          )}
        >
          <span
            className={cn(
              "flex size-4 items-center justify-center rounded border text-[10px]",
              query.stock ? "border-primary bg-primary text-primary-foreground" : "border-input",
            )}
          >
            {query.stock ? "✓" : ""}
          </span>
          In stock only
        </Link>
      </SidebarSection>

      <Link
        href={basePath}
        className="block px-2 text-xs font-medium text-primary transition hover:underline"
      >
        Clear all filters
      </Link>
    </div>
  );
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
