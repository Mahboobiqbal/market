import { cn } from "@/lib/utils";
import { discountPercent, formatMoney } from "@/lib/utils/format";

type PriceProps = {
  /** Current price in minor units. */
  amount: number;
  /** Pre-discount price to strike through (optional). */
  original?: number | null;
  size?: "sm" | "md" | "lg";
  showDiscount?: boolean;
  className?: string;
};

const SIZE_CLASS: Record<NonNullable<PriceProps["size"]>, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
};

export function Price({
  amount,
  original,
  size = "md",
  showDiscount = true,
  className,
}: PriceProps) {
  const discount = original ? discountPercent(original, amount) : null;
  const onSale = discount !== null;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-1.5", className)}>
      <span
        className={cn(
          "font-semibold tabular-nums",
          onSale && "text-rose-600 dark:text-rose-400",
          SIZE_CLASS[size ?? "md"],
        )}
      >
        {formatMoney(amount)}
      </span>
      {onSale && original ? (
        <span className="text-xs text-muted-foreground line-through tabular-nums">
          {formatMoney(original)}
        </span>
      ) : null}
      {onSale && showDiscount ? (
        <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[11px] font-medium text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
          -{discount}%
        </span>
      ) : null}
    </span>
  );
}
