import { z } from "zod";

export const checkoutFormSchema = z.object({
  addressId: z.string().min(1, "Select a shipping address"),
  paymentMethod: z.enum(["COD", "ONLINE", "CARD"]),
  couponCode: z.string().trim().max(40).optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

export const couponCheckSchema = z.object({
  code: z.string().trim().min(3).max(40),
  subtotal: z.number().int().min(0),
});
