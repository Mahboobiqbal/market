import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageSquareText, PackageCheck, ShieldCheck, Store, Truck } from "lucide-react";
import { ImageGallery } from "@/components/product/image-gallery";
import { ProductCard } from "@/components/product/product-card";
import { ProductPurchasePanel } from "@/components/product/product-purchase-panel";
import { ReviewForm } from "@/components/product/review-form";
import { Pagination } from "@/components/shared/pagination";
import { Price } from "@/components/shared/price";
import { RatingStars } from "@/components/shared/rating-stars";
import { SectionHeader } from "@/components/shared/section-header";
import { getSessionUser } from "@/lib/auth/dal";
import { formatBps, formatDate, formatRating } from "@/lib/utils/format";
import { getRelatedProducts, getProductDetail } from "@/services/product.service";
import { getPlatformSettings } from "@/services/settings.service";
import {
  canReviewProduct,
  getUserProductReview,
  getProductReviewStats,
  listProductReviews,
} from "@/services/review.service";
import { getWishlistedIds } from "@/services/wishlist.service";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductDetail(slug);
  if (!product || product.status !== "ACTIVE") return {};
  return {
    title: product.metaTitle ?? product.name,
    description:
      product.metaDescription ??
      product.shortDescription ??
      `Buy ${product.name} from ${product.shop.name} on Nexus Market.`,
  };
}

function jsonToRows(value: unknown): { label: string; value: string }[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((entry) => jsonToRows(entry));
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(([key, val]) => ({
      label: key
        .replace(/([A-Z])/g, " $1")
        .replace(/[_-]/g, " ")
        .replace(/^\w/, (char) => char.toUpperCase()),
      value: typeof val === "object" ? JSON.stringify(val) : String(val ?? ""),
    }));
  }
  return [];
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const product = await getProductDetail(slug);
  if (!product || product.status !== "ACTIVE") notFound();

  const user = await getSessionUser();
  const reviewPage = Math.max(
    1,
    Number.parseInt(Array.isArray(sp.reviewPage) ? sp.reviewPage[0] ?? "1" : sp.reviewPage ?? "1", 10) || 1,
  );

  const stock = product.inventory ? product.inventory.quantity - product.inventory.reserved : 0;
  const shopRating = formatRating(product.shop.ratingSum, product.shop.ratingCount);

  const [related, stats, reviews, wishSet, eligible, existingReview, settings] = await Promise.all([
    getRelatedProducts(
      { id: product.id, categoryId: product.categoryId, shopId: product.shop.id },
      8,
    ),
    getProductReviewStats(product.id),
    listProductReviews(product.id, reviewPage),
    user ? getWishlistedIds(user.id) : Promise.resolve(new Set<string>()),
    user ? canReviewProduct(user.id, product.id) : Promise.resolve(false),
    user ? getUserProductReview(user.id, product.id) : Promise.resolve(null),
    getPlatformSettings(),
  ]);

  const specRows = jsonToRows(product.specifications);
  const attributeRows = jsonToRows(product.attributes);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      {/* Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
      >
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span aria-hidden>/</span>
        <Link href="/products" className="hover:text-foreground">Products</Link>
        {product.category ? (
          <>
            <span aria-hidden>/</span>
            <Link href={`/categories/${product.category.slug}`} className="hover:text-foreground">
              {product.category.name}
            </Link>
          </>
        ) : null}
        <span aria-hidden>/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ImageGallery images={product.images} productName={product.name} />

        <div className="space-y-6">
          <div className="space-y-3">
            <Link
              href={`/store/${product.shop.slug}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <Store size={14} aria-hidden />
              {product.shop.name}
            </Link>

            <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              {product.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <RatingStars value={product.rating} count={product.ratingCount} size={15} />
              {product.totalSold > 0 ? (
                <span className="text-sm text-muted-foreground">
                  {product.totalSold.toLocaleString("en-PK")} sold
                </span>
              ) : null}
              {product.sku ? (
                <span className="text-xs text-muted-foreground">SKU: {product.sku}</span>
              ) : null}
            </div>

            <Price
              amount={product.effectivePrice}
              original={product.price}
              size="lg"
              showDiscount={false}
            />
            {product.shortDescription ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.shortDescription}
              </p>
            ) : null}
          </div>

          <ProductPurchasePanel
            productId={product.id}
            variants={product.variants}
            basePrice={product.effectivePrice}
            inStock={product.inStock}
            stock={stock}
            wishlisted={wishSet.has(product.id)}
          />

          {/* Trust strip */}
          <div className="grid grid-cols-3 gap-2 rounded-2xl border bg-muted/30 p-4 text-center">
            {[
              { icon: Truck, label: "Free delivery", hint: "over Rs 30,000" },
              { icon: PackageCheck, label: "7-day returns", hint: "easy process" },
              { icon: ShieldCheck, label: "Secure checkout", hint: "COD & online" },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <item.icon size={16} className="mx-auto text-primary" aria-hidden />
                <p className="text-xs font-medium">{item.label}</p>
                <p className="text-[11px] text-muted-foreground">{item.hint}</p>
              </div>
            ))}
          </div>

          {/* Shop card */}
          <div className="flex items-center gap-4 rounded-2xl border p-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-semibold text-primary">
              {product.shop.name.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{product.shop.name}</p>
              {product.shop.tagline ? (
                <p className="truncate text-sm text-muted-foreground">{product.shop.tagline}</p>
              ) : null}
              <div className="mt-0.5 flex items-center gap-3">
                <RatingStars value={shopRating} count={product.shop.ratingCount} size={12} />
                <span className="text-xs text-muted-foreground">
                  Seller since {new Date(product.shop.createdAt).getFullYear()}
                </span>
              </div>
            </div>
            <Link
              href={`/store/${product.shop.slug}`}
              className="shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition hover:bg-muted"
            >
              Visit store
            </Link>
          </div>
        </div>
      </div>

      {/* Details */}
      {(product.description || specRows.length > 0 || attributeRows.length > 0) && (
        <section className="mt-14 grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {product.description ? (
              <div>
                <h2 className="mb-3 text-lg font-semibold">Description</h2>
                <div className="prose-sm space-y-3 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                  {product.description}
                </div>
              </div>
            ) : null}

            {specRows.length > 0 ? (
              <div>
                <h2 className="mb-3 text-lg font-semibold">Specifications</h2>
                <table className="w-full text-sm">
                  <tbody>
                    {specRows.map((row, index) => (
                      <tr key={`${row.label}-${index}`} className="border-b last:border-0">
                        <td className="w-1/3 py-2.5 pr-4 align-top text-muted-foreground">
                          {row.label}
                        </td>
                        <td className="py-2.5 align-top">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {attributeRows.length > 0 ? (
              <div>
                <h2 className="mb-3 text-lg font-semibold">Attributes</h2>
                <div className="flex flex-wrap gap-2">
                  {attributeRows.map((row, index) => (
                    <span
                      key={`${row.label}-${index}`}
                      className="rounded-full border bg-muted/40 px-3 py-1.5 text-xs"
                    >
                      <span className="text-muted-foreground">{row.label}:</span> {row.value}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="space-y-3 rounded-2xl border bg-card p-5 text-sm">
            <h2 className="font-semibold">Ordering & delivery</h2>
            <p className="flex items-start gap-2 text-muted-foreground">
              <Truck size={15} className="mt-0.5 shrink-0 text-primary" aria-hidden />
              Flat delivery fee per seller order — free over Rs 30,000.
            </p>
            <p className="flex items-start gap-2 text-muted-foreground">
              <PackageCheck size={15} className="mt-0.5 shrink-0 text-primary" aria-hidden />
              Dispatch in 1–3 business days from {product.shop.name}.
            </p>
            <p className="flex items-start gap-2 text-muted-foreground">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-primary" aria-hidden />
              Platform commission {formatBps(settings.defaultCommissionBps)} · buyer protection on
              every order.
            </p>
            {typeof product.shippingInfo === "string" && product.shippingInfo ? (
              <p className="border-t pt-3 text-muted-foreground">{product.shippingInfo}</p>
            ) : null}
          </aside>
        </section>
      )}

      {/* Reviews */}
      <section className="mt-14">
        <SectionHeader
          title="Customer reviews"
          subtitle={`${stats.count} verified review${stats.count === 1 ? "" : "s"}`}
        />

        <div className="grid gap-8 lg:grid-cols-[280px,1fr]">
          <div className="space-y-4 rounded-2xl border bg-card p-5">
            <div className="flex items-end gap-3">
              <span className="text-4xl font-semibold tabular-nums">{stats.average}</span>
              <div className="pb-1">
                <RatingStars value={stats.average} size={14} />
                <p className="text-xs text-muted-foreground">{stats.count} reviews</p>
              </div>
            </div>
            <ul className="space-y-1.5">
              {stats.distribution.map((row) => (
                <li key={row.star} className="flex items-center gap-2 text-xs">
                  <span className="w-6 text-muted-foreground">{row.star}★</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-amber-400"
                      style={{ width: `${row.percent}%` }}
                    />
                  </span>
                  <span className="w-7 text-right text-muted-foreground">{row.count}</span>
                </li>
              ))}
            </ul>

            {user && eligible ? (
              <ReviewForm productId={product.id} />
            ) : (
              <p className="flex items-start gap-2 border-t pt-3 text-xs text-muted-foreground">
                <MessageSquareText size={14} className="mt-0.5 shrink-0" aria-hidden />
                {user
                  ? existingReview
                    ? "You've already reviewed this product."
                    : "Only verified buyers can review — buy and receive this product first."
                  : "Sign in after your order is delivered to leave a review."}
              </p>
            )}
          </div>

          <div className="space-y-5">
            {reviews.items.length === 0 ? (
              <p className="rounded-2xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
                No reviews yet.
              </p>
            ) : (
              reviews.items.map((review) => (
                <article key={review.id} className="space-y-2 border-b pb-5 last:border-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {(review.user.name ?? "Buyer").charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{review.user.name ?? "Verified buyer"}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
                      </div>
                    </div>
                    <RatingStars value={review.rating} size={13} />
                  </div>
                  {review.title ? <p className="text-sm font-medium">{review.title}</p> : null}
                  {review.comment ? (
                    <p className="text-sm leading-relaxed text-muted-foreground">{review.comment}</p>
                  ) : null}
                </article>
              ))
            )}

            <Pagination
              page={reviews.page}
              totalPages={reviews.totalPages}
              basePath={`/products/${product.slug}`}
              search={{ reviewPage: String(reviewPage) }}
            />
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 ? (
        <section className="mt-14">
          <SectionHeader title="You may also like" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                wishlisted={wishSet.has(item.id)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
