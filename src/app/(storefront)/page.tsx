import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, RotateCcw, Search, Store, Truck } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { RatingStars } from "@/components/shared/rating-stars";
import { SectionHeader } from "@/components/shared/section-header";
import { getSessionUser } from "@/lib/auth/dal";
import { getActiveBanners } from "@/services/content.service";
import { getHomeData } from "@/services/product.service";
import { getPlatformSettings } from "@/services/settings.service";
import { getWishlistedIds } from "@/services/wishlist.service";
import { formatRating } from "@/lib/utils/format";

const trust = [
  { icon: Truck, title: "Free delivery", description: "On orders over Rs 30,000" },
  { icon: RotateCcw, title: "7-day returns", description: "Easy returns on eligible orders" },
  { icon: BadgeCheck, title: "Verified sellers", description: "Every store reviewed by us" },
] as const;

export default async function HomePage() {
  const user = await getSessionUser();
  const [home, banners, settings, wishIds] = await Promise.all([
    getHomeData(),
    getActiveBanners(2),
    getPlatformSettings(),
    user ? getWishlistedIds(user.id) : Promise.resolve(new Set<string>()),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-primary/[0.07] via-background to-background">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 md:py-16">
          <div className="space-y-5">
            <p className="text-sm font-medium text-primary">
              Multi-vendor marketplace · Pakistan
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
              Independent sellers, one checkout
            </h1>
            <p className="max-w-lg text-base text-muted-foreground text-balance sm:text-lg">
              Shop verified stores, compare thousands of products, and pay however you like —
              cash on delivery or secure online payment.
            </p>

            <form action="/products" method="get" role="search" className="max-w-lg">
              <div className="relative">
                <Search
                  size={17}
                  className="absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  type="search"
                  name="q"
                  placeholder="What are you looking for?"
                  aria-label="Search products"
                  className="h-12 w-full rounded-full border bg-background pr-4 pl-11 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring/40"
                />
                <button
                  type="submit"
                  className="absolute top-1/2 right-1.5 inline-flex h-9 -translate-y-1/2 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                  Search
                </button>
              </div>
            </form>

            <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-1 text-sm text-muted-foreground">
              {trust.map((item) => (
                <li key={item.title} className="flex items-center gap-2">
                  <item.icon size={15} className="text-primary" aria-hidden />
                  <span>
                    <span className="font-medium text-foreground">{item.title}</span> ·{" "}
                    {item.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Category quick-links panel */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {home.categories.slice(0, 6).map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="group flex flex-col gap-2 rounded-2xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
              >
                <span className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-muted">
                  {category.imageUrl ? (
                    <Image
                      src={category.imageUrl}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 50vw, 200px"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <span className="text-2xl font-semibold text-muted-foreground/50">
                      {category.name.charAt(0)}
                    </span>
                  )}
                </span>
                <span className="text-sm font-medium transition group-hover:text-primary">
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Banners */}
      {banners.length > 0 ? (
        <section className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {banners.map((banner) => (
              <Link
                key={banner.id}
                href={banner.link || "/products"}
                className="group relative flex min-h-40 flex-col justify-center gap-1 overflow-hidden rounded-2xl bg-foreground p-6 text-background sm:p-8"
              >
                <p className="text-lg font-semibold tracking-tight sm:text-xl">{banner.title}</p>
                {banner.subtitle ? (
                  <p className="max-w-sm text-sm text-background/70">{banner.subtitle}</p>
                ) : null}
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-background/90 transition group-hover:gap-2">
                  Shop now <ArrowRight size={14} aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Offers */}
      {home.offers.length > 0 ? (
        <section className="mx-auto w-full max-w-7xl px-4 pt-12 sm:px-6">
          <SectionHeader
            title="Deals right now"
            subtitle="Limited-time prices from independent stores"
            href="/products?sort=price_asc"
          />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {home.offers.slice(0, 8).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                wishlisted={wishIds.has(product.id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Trending */}
      {home.featured.length > 0 ? (
        <section className="mx-auto w-full max-w-7xl px-4 pt-12 sm:px-6">
          <SectionHeader
            title="Trending products"
            subtitle="Most loved across the marketplace"
            href="/products?sort=popular"
          />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {home.featured.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                wishlisted={wishIds.has(product.id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Stores */}
      {home.topShops.length > 0 ? (
        <section className="mx-auto w-full max-w-7xl px-4 pt-12 sm:px-6">
          <SectionHeader title="Featured stores" subtitle="Sellers with the best ratings" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {home.topShops.map((shop) => {
              const rating = formatRating(shop.ratingSum, shop.ratingCount);
              return (
                <Link
                  key={shop.id}
                  href={`/store/${shop.slug}`}
                  className="group flex items-center gap-4 rounded-2xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
                >
                  <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-lg font-semibold text-primary">
                    {shop.logoUrl ? (
                      <Image
                        src={shop.logoUrl}
                        alt=""
                        width={56}
                        height={56}
                        className="size-14 rounded-xl object-cover"
                      />
                    ) : (
                      shop.name.charAt(0)
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-medium transition group-hover:text-primary">
                      <span className="truncate">{shop.name}</span>
                      <Store size={13} className="shrink-0 text-muted-foreground" aria-hidden />
                    </span>
                    {shop.tagline ? (
                      <span className="block truncate text-sm text-muted-foreground">
                        {shop.tagline}
                      </span>
                    ) : null}
                    <span className="mt-1 flex items-center gap-2">
                      <RatingStars value={rating} count={shop.ratingCount} size={12} />
                      <span className="text-xs text-muted-foreground">
                        {shop.productCount} products
                      </span>
                    </span>
                  </span>
                  <ArrowRight
                    size={16}
                    className="shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden
                  />
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* New arrivals */}
      {home.newArrivals.length > 0 ? (
        <section className="mx-auto w-full max-w-7xl px-4 pt-12 sm:px-6">
          <SectionHeader title="New arrivals" href="/products?sort=newest" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {home.newArrivals.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                wishlisted={wishIds.has(product.id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Seller CTA */}
      <section className="mx-auto mt-14 w-full max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 rounded-3xl bg-foreground px-6 py-10 text-background sm:px-10 md:flex-row">
          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Have something to sell?
            </h2>
            <p className="max-w-lg text-sm text-background/70">
              Open your store on Nexus Market — we handle discovery, payments, and buyer
              protection. Commission starts at{" "}
              {Math.round(settings.defaultCommissionBps / 100)}% per order.
            </p>
          </div>
          <Link
            href="/sell"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-background px-6 text-sm font-medium text-foreground transition hover:bg-background/90"
          >
            Become a seller
            <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}
