import Link from "next/link";
import { brand } from "@/config/brand";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div className="space-y-2">
          <p className="text-lg font-semibold tracking-tight">{brand.appName}</p>
          <p className="text-sm text-muted-foreground">{brand.tagline}.</p>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-medium">Marketplace</p>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>
              <Link href="/login" className="hover:text-foreground">
                Sign in
              </Link>
            </li>
            <li>
              <Link href="/register" className="hover:text-foreground">
                Create account
              </Link>
            </li>
            <li>
              <Link href="/account" className="hover:text-foreground">
                Your account
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-medium">For sellers</p>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>
              <Link href="/register" className="hover:text-foreground">
                Start selling
              </Link>
            </li>
            <li>
              <Link href="/seller" className="hover:text-foreground">
                Seller center
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {brand.appName}. All rights reserved.
      </div>
    </footer>
  );
}
