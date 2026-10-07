import Link from "next/link";
import { brand } from "@/config/brand";

const columns = [
  {
    title: "Shop",
    links: [
      { href: "/products", label: "All products" },
      { href: "/products?sort=newest", label: "New arrivals" },
      { href: "/products?sort=rating", label: "Top rated" },
      { href: "/wishlist", label: "Wishlist" },
      { href: "/cart", label: "Cart" },
    ],
  },
  {
    title: "Sell",
    links: [
      { href: "/sell", label: "Start selling" },
      { href: "/info/fees", label: "Fees & commissions" },
      { href: "/login", label: "Seller sign in" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/info/faq", label: "FAQ" },
      { href: "/info/contact", label: "Contact us" },
      { href: "/info/shipping", label: "Shipping" },
      { href: "/info/returns", label: "Returns & refunds" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/info/about", label: "About" },
      { href: "/info/privacy", label: "Privacy" },
      { href: "/info/terms", label: "Terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-muted/30">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-6">
        <div className="space-y-3 lg:col-span-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              {brand.appName.charAt(0)}
            </span>
            <span className="text-base font-semibold tracking-tight">{brand.appName}</span>
          </Link>
          <p className="max-w-xs text-sm text-muted-foreground">{brand.tagline}.</p>
          <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            {["Cash on delivery", "Card", "Online payment"].map((method) => (
              <span key={method} className="rounded-full border bg-background px-2.5 py-1">
                {method}
              </span>
            ))}
          </div>
        </div>

        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title} className="space-y-3">
            <p className="text-sm font-semibold">{column.title}</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {column.links.map((link) => (
                <li key={`${column.title}-${link.label}`}>
                  <Link href={link.href} className="transition hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>
            © {new Date().getFullYear()} {brand.appName}. All rights reserved.
          </p>
          <p>Made for verified sellers across Pakistan</p>
        </div>
      </div>
    </footer>
  );
}
