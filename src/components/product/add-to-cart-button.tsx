"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { addToCartAction } from "@/actions/cart.actions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AddToCartButtonProps = {
  productId: string;
  quantity?: number;
  variantId?: string | null;
  /** Rendered as primary CTA on product detail (full width, large). */
  size?: "default" | "lg";
  className?: string;
  disabled?: boolean;
};

export function AddToCartButton({
  productId,
  quantity = 1,
  variantId = null,
  size = "default",
  className,
  disabled,
}: AddToCartButtonProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleAdd() {
    if (pending) return;
    const formData = new FormData();
    formData.set("productId", productId);
    formData.set("quantity", String(quantity));
    if (variantId) formData.set("variantId", variantId);

    startTransition(async () => {
      const result = await addToCartAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={pending || disabled}
      className={cn(
        buttonVariants({ size }),
        "h-9 gap-2 rounded-lg bg-foreground text-background hover:bg-foreground/85",
        className,
      )}
    >
      {pending ? (
        <Loader2 size={16} className="animate-spin" aria-hidden />
      ) : (
        <ShoppingCart size={16} aria-hidden />
      )}
      Add to cart
    </button>
  );
}
