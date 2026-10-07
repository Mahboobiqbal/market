"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { toggleWishlistAction } from "@/actions/wishlist.actions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WishlistButtonProps = {
  productId: string;
  initialChecked?: boolean;
  variant?: "icon" | "full";
  className?: string;
};

export function WishlistButton({
  productId,
  initialChecked = false,
  variant = "icon",
  className,
}: WishlistButtonProps) {
  const [checked, setChecked] = useState(initialChecked);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    const next = !checked;
    setChecked(next); // optimistic
    startTransition(async () => {
      const result = await toggleWishlistAction(productId);
      if (!result.ok) {
        setChecked(!next);
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-pressed={checked}
        className={cn(
          buttonVariants({ variant: checked ? "default" : "outline", size: "lg" }),
          "gap-2",
          className,
        )}
      >
        <Heart size={16} className={checked ? "fill-current" : ""} aria-hidden />
        {checked ? "Saved" : "Add to wishlist"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={checked}
      aria-label={checked ? "Remove from wishlist" : "Add to wishlist"}
      className={cn(
        "flex size-9 items-center justify-center rounded-full border bg-background/90 text-foreground shadow-sm backdrop-blur transition hover:bg-background hover:text-rose-500",
        checked && "text-rose-500",
        className,
      )}
    >
      <Heart size={16} className={checked ? "fill-current" : ""} aria-hidden />
    </button>
  );
}
