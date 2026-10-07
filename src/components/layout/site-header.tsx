import Link from "next/link";
import { Heart, Search, ShoppingCart, UserRound } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavCategories } from "@/components/layout/nav-categories";
import { buttonVariants } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/dal";
import { getCartItemCount } from "@/services/cart.service";
import { getCategoryTree } from "@/services/category.service";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

function CartBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1.5 -right-1.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 py-px text-[10px] leading-tight font-semibold text-primary-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export async function SiteHeader() {
  const user = await getSessionUser();
  const [cartCount, categories] = await Promise.all([
    user ? getCartItemCount(user.id) : Promise.resolve(0),
    getCategoryTree(),
  ]);
  const roots = categories.slice(0, 10);

  return (
    <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      {/* Announcement strip */}
      <div className="bg-foreground text-background">
        <div className="mx-auto flex h-8 w-full max-w-7xl items-center justify-center gap-4 px-4 text-[11px] font-medium tracking-wide sm:px-6">
          <span className="hidden sm:inline">Free delivery over Rs 30,000</span>
          <span aria-hidden className="hidden text-background/40 sm:inline">
            ·
          </span>
          <span>7-day easy returns</span>
          <span aria-hidden className="text-background/40">
            ·
          </span>
          <span>Verified seller stores</span>
        </div>
      </div>

      {/* Main bar */}
      <div className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
          <div className="md:hidden">
            <MobileNav
              user={user ? { name: user.name, role: user.role } : null}
              categories={roots}
            />
          </div>

          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label={brand.appName}>
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              {brand.appName.charAt(0)}
            </span>
            <span className="text-base font-semibold tracking-tight sm:text-lg">
              {brand.appName}
            </span>
          </Link>

          {/* Desktop search */}
          <form
            action="/products"
            method="get"
            role="search"
            className="hidden flex-1 items-center justify-center md:flex"
          >
            <div className="relative w-full max-w-xl">
              <Search
                size={15}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                name="q"
                placeholder="Search products, brands and stores…"
                aria-label="Search products"
                className="h-9 w-full rounded-full border bg-muted/40 pr-3 pl-9 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>
          </form>

          <nav className="ml-auto flex shrink-0 items-center gap-0.5">
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="relative hidden size-9 items-center justify-center rounded-lg text-foreground transition hover:bg-muted sm:flex"
            >
              <Heart size={18} aria-hidden />
            </Link>
            <Link
              href="/cart"
              aria-label="Cart"
              className="relative flex size-9 items-center justify-center rounded-lg text-foreground transition hover:bg-muted"
            >
              <ShoppingCart size={18} aria-hidden />
              <CartBadge count={cartCount} />
            </Link>

            {user ? (
              <div className="flex items-center gap-1">
                {user.role !== "CUSTOMER" ? (
                  <Link
                    href={user.role === "SELLER" ? "/seller" : "/admin"}
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden md:inline-flex")}
                  >
                    Dashboard
                  </Link>
                ) : null}
                <Link
                  href="/account"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "hidden gap-2 md:inline-flex",
                  )}
                >
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                    {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
                  </span>
                  Account
                </Link>
                <div className="hidden lg:block">
                  <SignOutButton variant="ghost" className="h-8 px-2 text-xs" />
                </div>
                <Link
                  href="/account"
                  aria-label="Account"
                  className="flex size-9 items-center justify-center rounded-lg text-foreground transition hover:bg-muted md:hidden"
                >
                  <UserRound size={18} aria-hidden />
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/login"
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}
                >
                  Sign in
                </Link>
                <Link href="/register" className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}>
                  Create account
                </Link>
                <Link
                  href="/login"
                  aria-label="Sign in"
                  className="flex size-9 items-center justify-center rounded-lg text-foreground transition hover:bg-muted sm:hidden"
                >
                  <UserRound size={18} aria-hidden />
                </Link>
              </div>
            )}
          </nav>
        </div>

        {/* Mobile search */}
        <div className="px-4 pb-3 md:hidden">
          <form action="/products" method="get" role="search">
            <div className="relative">
              <Search
                size={15}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                name="q"
                placeholder="Search products…"
                aria-label="Search products"
                className="h-9 w-full rounded-full border bg-muted/40 pr-3 pl-9 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>
          </form>
        </div>
      </div>

      {/* Category nav */}
      <div className="hidden border-b bg-background md:block">
        <div className="mx-auto flex h-11 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <NavCategories categories={roots} />
          <Link
            href="/sell"
            className="shrink-0 text-xs font-medium text-primary transition hover:underline"
          >
            Sell on Nexus Market
          </Link>
        </div>
      </div>
    </header>
  );
}
