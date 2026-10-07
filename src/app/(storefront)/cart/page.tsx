import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ShoppingCart, Truck } from "lucide-react";
import { CartItemControls } from "@/components/cart/cart-item-controls";
import { EmptyState } from "@/components/shared/empty-state";
import { Price } from "@/components/shared/price";
import { getSessionUser } from "@/lib/auth/dal";
import { getCartView } from "@/services/cart.service";
import { getPlatformSettings } from "@/services/settings.service";
import { formatMoney } from "@/lib/utils/format";

export const metadata = { title: "Cart" };

export default async function CartPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/cart");

  const [cart, settings] = await Promise.all([getCartView(user.id), getPlatformSettings()]);

  if (cart.groups.length === 0) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Browse the catalog and add products — items from different stores checkout together."
          action={{ href: "/products", label: "Start shopping" }}
        />
      </div>
    );
  }

  const freeShippingGap = settings.freeShippingOver - cart.subtotal;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Shopping cart</h1>
        <p className="text-sm text-muted-foreground">
          {cart.itemCount} item{cart.itemCount === 1 ? "" : "s"} from{" "}
          {cart.groups.length} store{cart.groups.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr,320px]">
        <div className="space-y-6">
          {cart.groups.map((group) => (
            <section key={group.shop.id} className="overflow-hidden rounded-2xl border">
              <header className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3">
                <Link
                  href={`/store/${group.shop.slug}`}
                  className="text-sm font-medium transition hover:text-primary"
                >
                  {group.shop.name}
                </Link>
                <span className="text-sm font-medium tabular-nums">
                  {formatMoney(group.subtotal)}
                </span>
              </header>

              <ul className="divide-y">
                {group.items.map((item) => (
                  <li key={item.id} className="flex gap-4 p-4">
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="relative size-20 shrink-0 overflow-hidden rounded-xl border bg-muted sm:size-24"
                    >
                      <Image
                        src={item.product.imageUrl ?? "/images/products/placeholder.svg"}
                        alt={item.product.name}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/products/${item.product.slug}`}
                            className="line-clamp-2 text-sm font-medium transition hover:text-primary"
                          >
                            {item.product.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {item.product.shop.name}
                            {item.variant?.name ? ` · ${item.variant.name}` : ""}
                          </p>
                          {!item.available && item.unavailableReason ? (
                            <p className="mt-1 text-xs font-medium text-destructive">
                              {item.unavailableReason}
                            </p>
                          ) : null}
                        </div>
                        <Price
                          amount={item.lineTotal}
                          original={
                            item.product.salePrice == null ? item.product.price * item.quantity : null
                          }
                          size="sm"
                          showDiscount={false}
                        />
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">
                          {formatMoney(item.unitPrice)} each
                        </span>
                        <CartItemControls
                          itemId={item.id}
                          quantity={item.quantity}
                          max={item.product.stock}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {cart.hasIssues ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              Some items can&apos;t be purchased right now — remove them or adjust quantities to
              continue.
            </p>
          ) : null}
        </div>

        <aside className="h-fit space-y-4 rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Order summary</h2>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-medium tabular-nums">{formatMoney(cart.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery</dt>
              <dd className="text-muted-foreground">
                {freeShippingGap <= 0 ? "Free" : "Calculated at checkout"}
              </dd>
            </div>
          </dl>

          {freeShippingGap > 0 ? (
            <p className="flex items-start gap-2 rounded-xl bg-primary/5 px-3 py-2.5 text-xs text-muted-foreground">
              <Truck size={14} className="mt-0.5 shrink-0 text-primary" aria-hidden />
              Add {formatMoney(freeShippingGap)} more to unlock free delivery.
            </p>
          ) : (
            <p className="flex items-start gap-2 rounded-xl bg-primary/5 px-3 py-2.5 text-xs text-muted-foreground">
              <Truck size={14} className="mt-0.5 shrink-0 text-primary" aria-hidden />
              You&apos;ve unlocked free delivery.
            </p>
          )}

          <div className="border-t pt-3">
            <div className="flex justify-between text-sm font-semibold">
              <span>Estimated total</span>
              <span className="tabular-nums">{formatMoney(cart.subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Taxes and delivery fees shown at checkout.
            </p>
          </div>

          <Link
            href="/checkout"
            className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium transition ${
              cart.hasIssues || cart.itemCount === 0
                ? "pointer-events-none bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            Proceed to checkout
            <ArrowRight size={15} aria-hidden />
          </Link>

          <Link
            href="/products"
            className="block text-center text-sm text-primary transition hover:underline"
          >
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
