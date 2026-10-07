import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type RatingStarsProps = {
  /** 0..5, fractions supported (rendered as a clipped overlay). */
  value: number;
  count?: number;
  size?: number;
  className?: string;
};

export function RatingStars({ value, count, size = 14, className }: RatingStarsProps) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className="relative inline-flex"
        aria-label={`${value.toFixed(1)} out of 5 stars`}
        role="img"
      >
        <span className="flex gap-0.5 text-muted-foreground/35">
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} size={size} className="fill-current" />
          ))}
        </span>
        <span
          className="absolute inset-0 flex gap-0.5 overflow-hidden text-amber-400"
          style={{ width: `${pct}%` }}
          aria-hidden
        >
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} size={size} className="shrink-0 fill-current" />
          ))}
        </span>
      </span>
      <span className="text-xs font-medium tabular-nums text-foreground">
        {value.toFixed(1)}
      </span>
      {typeof count === "number" ? (
        <span className="text-xs text-muted-foreground">
          ({count.toLocaleString("en-PK")})
        </span>
      ) : null}
    </span>
  );
}
