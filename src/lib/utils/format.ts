/**
 * Formatting helpers shared by storefront, dashboards, and emails.
 * Money is always integer minor units (paisa) — never floats.
 */

const numberFormat = new Intl.NumberFormat("en-PK");

const dateFormat = new Intl.DateTimeFormat("en-PK", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormat = new Intl.DateTimeFormat("en-PK", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/**
 * Format minor units as PKR, e.g. `1_000_00` → `Rs 1,000` and
 * `1_000_50` → `Rs 1,000.50`. Decimals appear only when needed.
 */
export function formatMoney(
  minor: number,
  opts?: { decimals?: "auto" | "always" | "never"; prefix?: string },
): string {
  const prefix = opts?.prefix ?? "Rs";
  const showDecimals =
    opts?.decimals === "always" ||
    (opts?.decimals !== "never" && Math.abs(minor) % 100 !== 0);
  const amount = minor / 100;
  const body = new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);
  return `${prefix} ${body}`;
}

/** `1234567` → `1.23M` style compact number (for stats only). */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-PK", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatCount(value: number): string {
  return numberFormat.format(value);
}

export function formatDate(value: Date | string | number): string {
  return dateFormat.format(new Date(value));
}

export function formatDateTime(value: Date | string | number): string {
  return dateTimeFormat.format(new Date(value));
}

/** Short relative label like `2h ago`, `3d ago`. Falls back to date after 7 days. */
export function formatRelative(value: Date | string | number): string {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return dateFormat.format(date);
}

/** Discount percentage between original and sale price (minor units). */
export function discountPercent(price: number, salePrice?: number | null): number | null {
  if (!salePrice || salePrice >= price || price <= 0) return null;
  return Math.round((1 - salePrice / price) * 100);
}

/** Rating out of 5 with one decimal, e.g. `4.3`. */
export function formatRating(ratingSum: number, ratingCount: number): number {
  if (ratingCount <= 0) return 0;
  return Math.round((ratingSum / ratingCount) * 10) / 10;
}

/** Basis points → `10%` (or `7.5%`). */
export function formatBps(bps: number): string {
  const percent = bps / 100;
  return `${Number.isInteger(percent) ? percent : percent.toFixed(1)}%`;
}

/** Basis points → `0.10` fraction (for calculations in UI previews only). */
export function bpsToFraction(bps: number): number {
  return bps / 10_000;
}
