import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, Phone, Store, Tag } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { Pagination } from "@/components/shared/pagination";
import { RatingStars } from "@/components/shared/rating-stars";
import { SortSelect } from "@/components/catalog/sort-select";
import { EmptyState } from "@/components/shared/empty-state";
import { getSessionUser } from "@/lib/auth/dal";
import { parseCatalogQuery, type SearchParams } from "@/lib/search/params";
import { getShopBySlug, getShopReviewSummary } from "@/services/shop.service";
import { listProducts } from "@/services/product.service";
import { getWishlistedIds } from "@/services/wishlist.service";
import { formatDate } from "@/lib/utils/format";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) return {};
  return {
    title: shop.name,
    description: shop.tagline ?? `Shop ${shop.name} on Nexus Market.`,
  };
}

export default async function StorePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

  const query = parseCatalogQuery(sp);
  const user = await getSessionUser();

  const [result, reviews, wishIds] = await Promise.all([
    listProducts({
      shop: slug,
      q: query.q || undefined,
      minPrice: query.min != null ? Math.round(query.min * 100) : undefined,
      maxPrice: query.max != null ? Math.round(query.max * 100) : undefined,
      minRating: query.rating ?? undefined,
      sort: query.sort,
      page: query.page,
    }),
    getShopReviewSummary(shop.id),
    user ? getWishlistedIds(user.id) : Promise.resolve(new Set<string>()),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      {/* Store header */}
      <section className="overflow-hidden rounded-3xl border">
        <div className="relative h-36 bg-gradient-to-r from-primary/80 via-primary to-foreground sm:h-44">
          {shop.bannerUrl ? (
            <Image
              src={shop.bannerUrl}
              alt=""
              fill
              sizes="1200px"
              className="object-cover"
              priority
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-5 px-5 pb-5 sm:flex-row sm:items-end sm:px-8">
          <span className="-mt-10 flex size-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-background bg-primary/10 text-2xl font-bold text-primary shadow-sm sm:-mt-12 sm:size-24">
            {shop.logoUrl ? (
              <Image
                src={shop.logoUrl}
                alt=""
                width={96}
                height={96}
                className="size-full object-cover"
              />
            ) : (
              shop.name.charAt(0)
            )}
          </span>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{shop.name}</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <Store size={12} aria-hidden />
                Verified store
              </span>
            </div>
            {shop.tagline ? <p className="text-sm text-muted-foreground">{shop.tagline}</p> : null}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <RatingStars value={shop.rating} count={shop.ratingCount} size={14} />
              <span>{shop.productCount} products</span>
              <span>Selling since {formatDate(shop.createdAt)}</span>
            </div>
          </div>

          <div className="space-y-1 text-sm text-muted-foreground sm:text-right">
            {shop.contactEmail ? (
              <p className="flex items-center gap-1.5 sm:justify-end">
                <Mail size={13} aria-hidden />
                {shop.contactEmail}
              </p>
            ) : null}
            {shop.contactPhone ? (
              <p className="flex items-center gap-1.5 sm:justify-end">
                <Phone size={13} aria-hidden />
                {shop.contactPhone}
              </p>
            ) : null}
          </div>
        </div>

        {shop.description ? (
          <p className="border-t px-5 py-4 text-sm leading-relaxed text-muted-foreground sm:px-8">
            {shop.description}
          </p>
        ) : null}
      </section>

      {/* Category chips */}
      {shop.categories.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {shop.categories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <Tag size={12} aria-hidden />
              {category.name}
              <span className="text-muted-foreground/70">({category.productCount})</span>
            </Link>
          ))}
        </div>
      ) : null}

      {/* Products */}
      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Products</h2>
            <p className="text-sm text-muted-foreground">
              {result.total.toLocaleString("en-PK")} item{result.total === 1 ? "" : "s"}
            </p>
          </div>
          <SortSelect sort={query.sort} />
        </div>

        {result.items.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {result.items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                wishlisted={wishIds.has(product.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Store}
            title="No products listed yet"
            description="This store hasn't published any products matching your filters."
          />
        )}

        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          basePath={`/store/${slug}`}
          search={Object.fromEntries(
            query.q ? new URLSearchParams({ q: query.q }) : new URLSearchParams(),
          )}
          className="mt-8"
        />
      </section>

      {/* Store reviews */}
      <section className="mt-12">
        <h2 className="mb-4 text-lg font-semibold">
          Store reviews{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({reviews.count})
          </span>
        </h2>
        {reviews.recent.length === 0 ? (
          <p className="rounded-2xl border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
            No store reviews yet.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reviews.recent.map((review) => (
              <article key={review.id} className="space-y-2 rounded-2xl border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{review.user.name ?? "Verified buyer"}</p>
                  <RatingStars value={review.rating} size={12} />
                </div>
                {review.title ? <p className="text-sm font-medium">{review.title}</p> : null}
                {review.comment ? (
                  <p className="text-sm text-muted-foreground">{review.comment}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
