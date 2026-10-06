import { z } from "zod";

/** Seller application + shop profile forms. */

export const sellerApplicationSchema = z.object({
  businessName: z.string().trim().min(3, "Business name required").max(120),
  businessType: z.enum(["INDIVIDUAL", "REGISTERED_COMPANY", "OTHER"]),
  cnic: z
    .string()
    .trim()
    .regex(/^\d{5}-\d{7}-\d$/, "CNIC format: 12345-1234567-1"),
  phone: z.string().trim().regex(/^(\+92|0)?3\d{2}[-\s]?\d{7}$/, "Enter a valid phone number"),
});

export type SellerApplicationValues = z.infer<typeof sellerApplicationSchema>;

export const shopFormSchema = z.object({
  name: z.string().trim().min(3, "Shop name required").max(80),
  tagline: z.string().trim().max(140).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  contactEmail: z.string().trim().email("Enter a valid email").max(120).optional().or(z.literal("")),
  contactPhone: z
    .string()
    .trim()
    .regex(/^(\+92|0)?3\d{2}[-\s]?\d{7}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  logoUrl: z.string().trim().max(400).optional().or(z.literal("")),
  bannerUrl: z.string().trim().max(400).optional().or(z.literal("")),
});

export type ShopFormValues = z.infer<typeof shopFormSchema>;
