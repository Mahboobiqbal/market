import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getSessionUser } from "@/lib/auth/dal";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {brand.appName}
        </Link>

        <form action="/" role="search" className="hidden flex-1 items-center gap-2 md:flex">
          <input
            type="search"
            name="q"
            placeholder="Search products, brands and stores…"
            aria-label="Search"
            className="h-9 w-full max-w-lg rounded-md border border-input bg-background/60 px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "shrink-0")}
          >
            Search
          </button>
        </form>

        <nav className="ml-auto flex items-center gap-1">
          {user ? (
            <>
              {user.role !== "CUSTOMER" && (
                <Link
                  href={user.role === "SELLER" ? "/seller" : "/admin"}
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                >
                  Dashboard
                </Link>
              )}
              <Link href="/account" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                Account
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                Sign in
              </Link>
              <Link href="/register" className={cn(buttonVariants({ size: "sm" }))}>
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
