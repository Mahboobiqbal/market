import { z } from "zod";

export const addressFormSchema = z.object({
  type: z.enum(["HOME", "OFFICE", "OTHER"]),
  label: z.string().trim().max(60).optional().or(z.literal("")),
  line1: z.string().trim().min(3, "Street address required").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(2, "City required").max(80),
  region: z.string().trim().min(2, "Province/region required").max(80),
  postalCode: z.string().trim().min(1, "Postal code required").max(12),
  country: z.string().trim().min(2).max(56).optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(/^(\+92|0)?3\d{2}[-\s]?\d{7}$/, "Enter a valid Pakistani phone number")
    .optional()
    .or(z.literal("")),
  isDefault: z.boolean().optional(),
});

export type AddressFormValues = z.infer<typeof addressFormSchema>;
