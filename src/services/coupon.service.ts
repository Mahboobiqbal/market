import "server-only";
import { prisma } from "@/lib/db/prisma";

/**
 * Coupon validation. Amounts are computed server-side at checkout time —
 * this helper only previews/validates. All checks are re-run inside the
 * order transaction (see order.service placeOrder).
 */

export type CouponCheck =
  | { ok: true; code: string; discount: number; label: string }
  | { ok: false; error: string };

export async function checkCoupon(code: string, subtotal: number): Promise<CouponCheck> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, error: "Enter a coupon code." };

  const coupon = await prisma.coupon.findUnique({ where: { code: normalized } });
  const now = new Date();

  if (!coupon || !coupon.isActive) return { ok: false, error: "Invalid coupon code." };
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, error: "Coupon not active yet." };
  if (coupon.expiresAt && coupon.expiresAt < now) return { ok: false, error: "Coupon has expired." };
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, error: "Coupon usage limit reached." };
  }
  if (coupon.minOrder != null && subtotal < coupon.minOrder) {
    return {
      ok: false,
      error: `Minimum order for this coupon is Rs ${Math.ceil(coupon.minOrder / 100).toLocaleString()}.`,
    };
  }

  const discount =
    coupon.type === "PERCENT"
      ? Math.round((subtotal * coupon.value) / 10_000) // value = basis points
      : Math.min(coupon.value, subtotal);

  if (discount <= 0) return { ok: false, error: "Coupon does not apply to this order." };

  return {
    ok: true,
    code: coupon.code,
    discount,
    label:
      coupon.type === "PERCENT" ? `${coupon.value / 100}% off` : `Rs ${coupon.value / 100} off`,
  };
}
