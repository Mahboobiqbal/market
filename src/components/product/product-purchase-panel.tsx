"use client";

import { useState } from "react";
import { Check, Truck } from "lucide-react";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { WishlistButton } from "@/components/product/wishlist-button";
import { QuantityStepper } from "@/components/shared/quantity-stepper";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type Variant = {
  id: string;
  name: string;
  price: number | null;
  options: unknown;
};

type ProductPurchasePanelProps = {
  productId: string;
  variants: Variant[];
  basePrice: number;
  inStock: boolean;
  stock: number;
  wishlisted: boolean;
};

export function ProductPurchasePanel({
  productId,
  variants,
  basePrice,
  inStock,
  stock,
  wishlisted,
}: ProductPurchasePanelProps) {
  const [variantId, setVariantId] = useState<string | null>(
    variants.length > 0 ? variants[0].id : null,
  );
  const [quantity, setQuantity] = useState(1);

  const selected = variants.find((variant) => variant.id === variantId) ?? null;
  const maxQty = Math.max(1, Math.min(99, inStock ? stock : 0));

  return (
    <div className="space-y-5">
      {variants.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Option:{" "}
            <span className="font-normal text-muted-foreground">{selected?.name}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => setVariantId(variant.id)}
                aria-pressed={variant.id === variantId}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
                  variant.id === variantId
                    ? "border-primary bg-primary/5 text-primary"
                    : "hover:border-foreground/40",
                )}
              >
                <span>{variant.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatMoney(variant.price ?? basePrice)}
                </span>
                {variant.id === variantId ? <Check size={13} aria-hidden /> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          max={maxQty}
        />
        <span className="text-sm text-muted-foreground">
          {inStock ? `${stock} in stock` : "Out of stock"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <AddToCartButton
          productId={productId}
          variantId={variantId}
          quantity={quantity}
          size="lg"
          disabled={!inStock}
          className="h-11 flex-1 min-w-44 rounded-full px-6"
        />
        <WishlistButton
          productId={productId}
          initialChecked={wishlisted}
          variant="full"
          className="h-11 rounded-full px-5"
        />
      </div>

      <ul className="space-y-1.5 text-xs text-muted-foreground">
        <li className="flex items-center gap-2">
          <Truck size={13} className="text-primary" aria-hidden />
          Dispatch in 1–3 business days · free delivery over Rs 30,000
        </li>
        <li className="flex items-center gap-2">
          <Check size={13} className="text-primary" aria-hidden />
          Cash on delivery available · 7-day returns
        </li>
      </ul>
    </div>
  );
}
