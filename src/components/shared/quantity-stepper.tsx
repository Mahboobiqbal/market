"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
};

export function QuantityStepper({ value, onChange, min = 1, max = 99, className }: QuantityStepperProps) {
  function clamp(next: number) {
    onChange(Math.max(min, Math.min(max, next)));
  }

  return (
    <div
      className={cn(
        "inline-flex h-10 items-center rounded-lg border bg-background",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => clamp(value - 1)}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className="flex size-10 items-center justify-center text-muted-foreground transition hover:text-foreground disabled:opacity-40"
      >
        <Minus size={14} />
      </button>
      <input
        type="number"
        value={value}
        onChange={(event) => clamp(Number(event.target.value) || min)}
        aria-label="Quantity"
        className="w-10 border-0 bg-transparent text-center text-sm font-medium tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => clamp(value + 1)}
        disabled={value >= max}
        aria-label="Increase quantity"
        className="flex size-10 items-center justify-center text-muted-foreground transition hover:text-foreground disabled:opacity-40"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
