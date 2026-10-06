import { z } from "zod";
import { moneyInput } from "@/lib/validation/money";

/** Admin forms: categories, coupons, banners, settings, moderation. */

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, "Name required").max(60),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only")
    .max(80),
  parentId: z.string().optional().nullable(),
  imageUrl: z.string().trim().max(400).optional().or(z.literal("")),
  position: z.coerce.number().int().min(0).max(9999),
  isActive: z.boolean(),
  metaTitle: z.string().trim().max(160).optional().or(z.literal("")),
  metaDescription: z.string().trim().max(320).optional().or(z.literal("")),
});

export const categoryDeleteSchema = z.object({ id: z.string().min(1) });

export const couponFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Code required")
      .max(30)
      .transform((v) => v.toUpperCase()),
    type: z.enum(["PERCENT", "FIXED"]),
    /** Percent entered as percent (10) → stored as bps (1000); FIXED as rupees → paisa. */
    value: z.union([z.string(), z.number()]),
    minOrder: z.union([z.string(), z.number()]).optional().or(z.literal("")),
    maxUses: z.coerce.number().int().min(1).max(1_000_000).optional().nullable(),
    startsAt: z.string().optional().or(z.literal("")),
    expiresAt: z.string().optional().or(z.literal("")),
    isActive: z.boolean(),
  })
  .transform((data, ctx) => {
    const raw = String(data.value).replace(/[,\s%]/g, "");
    if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
      ctx.addIssue({ code: "custom", message: "Enter a valid value", path: ["value"] });
      return z.NEVER;
    }
    const num = parseFloat(raw);
    if (num <= 0) {
      ctx.addIssue({ code: "custom", message: "Value must be greater than 0", path: ["value"] });
      return z.NEVER;
    }
    const value = data.type === "PERCENT" ? Math.round(num * 100) : Math.round(num * 100);
    if (data.type === "PERCENT" && num > 100) {
      ctx.addIssue({ code: "custom", message: "Percentage cannot exceed 100", path: ["value"] });
      return z.NEVER;
    }
    let minOrder: number | null = null;
    if (data.minOrder !== "" && data.minOrder != null) {
      const m = String(data.minOrder).replace(/[,\s]/g, "");
      if (!/^\d+(\.\d{1,2})?$/.test(m)) {
        ctx.addIssue({ code: "custom", message: "Invalid minimum order", path: ["minOrder"] });
        return z.NEVER;
      }
      minOrder = Math.round(parseFloat(m) * 100);
    }
    return {
      code: data.code,
      type: data.type,
      value,
      minOrder,
      maxUses: data.maxUses ?? null,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      isActive: data.isActive,
    };
  });

export const bannerFormSchema = z.object({
  title: z.string().trim().min(2, "Title required").max(120),
  subtitle: z.string().trim().max(200).optional().or(z.literal("")),
  imageUrl: z.string().trim().min(1, "Image required").max(400),
  link: z.string().trim().max(300).optional().or(z.literal("")),
  position: z.coerce.number().int().min(0).max(999),
  status: z.enum(["ACTIVE", "SCHEDULED", "DISABLED"]),
  startsAt: z.string().optional().or(z.literal("")),
  endsAt: z.string().optional().or(z.literal("")),
});

export const settingsFormSchema = z.object({
  defaultCommissionBps: z.coerce.number().int().min(0).max(10_000),
  codEnabled: z.boolean(),
  onlinePaymentsEnabled: z.boolean(),
  taxBps: z.coerce.number().int().min(0).max(10_000),
  shippingPerSeller: moneyInput,
  freeShippingOver: moneyInput,
  minPayoutRequest: moneyInput,
});

export const sellerApplicationReviewSchema = z.object({
  sellerId: z.string().min(1),
  action: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export const productModerationSchema = z.object({
  productId: z.string().min(1),
  action: z.enum(["APPROVED", "REJECTED", "DISABLED"]),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});

export const payoutActionSchema = z.object({
  payoutId: z.string().min(1),
  action: z.enum(["APPROVED", "REJECTED", "PAID"]),
  reference: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const returnActionSchema = z.object({
  returnId: z.string().min(1),
  action: z.enum(["APPROVED", "REJECTED", "RECEIVED", "REFUNDED"]),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export const orderStatusSchema = z.object({
  orderNumber: z.string().min(1),
  status: z.enum([
    "CONFIRMED",
    "PROCESSING",
    "PACKED",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "RETURNED",
    "REFUNDED",
  ]),
});

export const commissionRuleSchema = z.object({
  scope: z.enum(["GLOBAL", "CATEGORY", "SELLER", "PRODUCT"]),
  targetId: z.string().optional().nullable(),
  rateBps: z.coerce.number().int().min(0).max(10_000),
});
