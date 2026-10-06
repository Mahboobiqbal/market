import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

const highlights = [
  {
    title: "Curated seller stores",
    description: "Discover products from verified vendors, each with their own storefront and reviews.",
  },
  {
    title: "Flexible payments",
    description: "Pay cash on delivery or securely online — the checkout flow adapts to what you choose.",
  },
  {
    title: "Buyer protection",
    description: "Clear order tracking, straightforward returns, and support that has your back.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="border-b bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6 md:py-28">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            Multi-vendor marketplace
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Everything you love, from sellers you can trust
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground text-balance">
            {brand.tagline} — thousands of products, independent stores, and a checkout that takes
            seconds.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className={cn(buttonVariants({ size: "lg" }))}>
              Create an account
            </Link>
            <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          {highlights.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
