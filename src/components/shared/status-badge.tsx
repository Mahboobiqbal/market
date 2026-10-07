import { cn } from "@/lib/utils";
import type { Tone } from "@/constants";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "border-transparent bg-muted text-muted-foreground",
  info: "border-sky-200/60 bg-sky-50 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/15 dark:text-sky-300",
  accent: "border-teal-200/60 bg-teal-50 text-teal-700 dark:border-teal-500/25 dark:bg-teal-500/15 dark:text-teal-300",
  warning: "border-amber-200/60 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300",
  success: "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300",
  danger: "border-rose-200/60 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/15 dark:text-rose-300",
};

type StatusBadgeProps = {
  label: string;
  tone: Tone;
  dot?: boolean;
  className?: string;
};

export function StatusBadge({ label, tone, dot = true, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
    >
      {dot ? (
        <span
          aria-hidden
          className="size-1.5 rounded-full bg-current opacity-70"
        />
      ) : null}
      {label}
    </span>
  );
}
