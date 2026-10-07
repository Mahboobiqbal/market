"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { removeCartItemAction, updateCartItemAction } from "@/actions/cart.actions";
import { QuantityStepper } from "@/components/shared/quantity-stepper";

type CartItemControlsProps = {
  itemId: string;
  quantity: number;
  max: number;
};

export function CartItemControls({ itemId, quantity, max }: CartItemControlsProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function changeQuantity(next: number) {
    if (pending) return;
    startTransition(async () => {
      const result = await updateCartItemAction(itemId, next);
      if (result.ok) router.refresh();
      else toast.error(result.message);
    });
  }

  function remove() {
    if (pending) return;
    startTransition(async () => {
      const result = await removeCartItemAction(itemId);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <QuantityStepper
        value={quantity}
        onChange={changeQuantity}
        max={Math.max(1, Math.min(99, max))}
      />
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        aria-label="Remove item"
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
      >
        {pending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
      </button>
    </div>
  );
}
