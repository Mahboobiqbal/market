import Image from "next/image";
import Link from "next/link";
import { PackageX } from "lucide-react";
import { Price } from "@/components/shared/price";
import { RatingStars } from "@/components/shared/rating-stars";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { WishlistButton } from "@/components/product/wishlist-button";
import type { ProductCardData } from "@/services/product.service";

type ProductCardProps = {
  product: ProductCardData;
  wishlisted?: boolean;
};

export function ProductCard({ product, wishlisted = false }: ProductCardProps) {
  const image = product.images[0]?.url ?? "/images/products/placeholder.svg";
  const outOfStock = !product.inStock;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:border-primary/30 hover:shadow-[0_8px_30px_rgb(0_0_0/0.06)] dark:hover:shadow-none">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Image
          src={image}
          alt={product.images[0]?.alt ?? product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {product.discount ? (
          <span className="absolute top-2 left-2 z-10 rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-semibold text-white">
            -{product.discount}%
          </span>
        ) : null}

        {outOfStock ? (
          <span className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <PackageX size={13} aria-hidden />
              Out of stock
            </span>
          </span>
        ) : null}

        <div className="absolute top-2 right-2 z-20">
          <WishlistButton productId={product.id} initialChecked={wishlisted} variant="icon" />
        </div>

        {/* Invisible full-card link (buttons above sit at higher z-index). */}
        <Link
          href={`/products/${product.slug}`}
          className="absolute inset-0 z-10"
          aria-label={product.name}
        />

        {!outOfStock ? (
          <div className="absolute inset-x-2 bottom-2 z-20 translate-y-12 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 focus-within:translate-y-0 focus-within:opacity-100 max-sm:hidden">
            <AddToCartButton productId={product.id} className="w-full" />
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {product.shop ? (
          <Link
            href={`/store/${product.shop.slug}`}
            className="w-fit text-xs text-muted-foreground transition hover:text-primary"
          >
            {product.shop.name}
          </Link>
        ) : null}

        <Link
          href={`/products/${product.slug}`}
          className="line-clamp-2 min-h-10 text-sm font-medium leading-5 transition hover:text-primary"
        >
          {product.name}
        </Link>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <Price
            amount={product.effectivePrice}
            original={product.price}
            size="sm"
            className="[&>span:first-child]:text-[15px]"
          />
          <RatingStars value={product.rating} count={product.ratingCount} size={12} />
        </div>

        {product.totalSold > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            {product.totalSold.toLocaleString("en-PK")} sold
          </p>
        ) : null}
      </div>
    </article>
  );
}
