import { z } from "zod";

/**
 * Money inputs arrive from forms as rupees ("1,999.50") and are converted
 * to integer minor units (paisa) BEFORE validation — the DB only ever
 * stores integers.
 */

export function parseRupees(value: string | number): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) return null;
    return Math.round(value * 100);
  }
  const cleaned = value.replace(/[,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}

/** String/number rupees → non-negative integer paisa. */
export const moneyInput = z
  .union([z.string(), z.number()])
  .transform((value, ctx): number => {
    const minor = parseRupees(value);
    if (minor === null) {
      ctx.addIssue({ code: "custom", message: "Enter a valid amount (e.g. 1,499.00)" });
      return z.NEVER;
    }
    return minor;
  });

/** Optional empty → null money field (sale price etc.). */
export const optionalMoneyInput = moneyInput.optional();

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
