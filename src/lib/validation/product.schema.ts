import { z } from "zod";
import { moneyInput, optionalMoneyInput } from "@/lib/validation/money";

/** Seller product form (create / update). Prices are rupees in, paisa out. */

export const productVariantInput = z.object({
  name: z.string().trim().min(1, "Option name required").max(80),
  sku: z.string().trim().min(1, "SKU required").max(64),
  price: optionalMoneyInput.nullable(),
  options: z.record(z.string().min(1).max(40), z.string().min(1).max(60)),
});

export const productFormSchema = z
  .object({
    name: z.string().trim().min(3, "Name must be at least 3 characters").max(160),
    description: z.string().trim().min(10, "Description must be at least 10 characters").max(8000),
    shortDescription: z.string().trim().max(240).optional().or(z.literal("")),
    price: moneyInput.refine((v) => v > 0, "Price must be greater than 0"),
    salePrice: optionalMoneyInput
      .nullable()
      .optional()
      .refine((v) => v === null || v === undefined || v === 0 || v > 0, "Sale price must be greater than 0"),
    sku: z.string().trim().min(2, "SKU required").max(64),
    categoryId: z.string().optional().nullable(),
    brandId: z.string().optional().nullable(),
    status: z.enum(["DRAFT", "PENDING_REVIEW"]),
    images: z.array(z.string().trim().min(1)).max(10, "Up to 10 images"),
    variants: z.array(productVariantInput).max(20, "Up to 20 variants"),
    attributes: z.record(z.string().max(60), z.string().max(200)).optional(),
    specifications: z.record(z.string().max(60), z.string().max(300)).optional(),
    metaTitle: z.string().trim().max(160).optional().or(z.literal("")),
    metaDescription: z.string().trim().max(320).optional().or(z.literal("")),
    initialStock: z.coerce.number().int().min(0).max(999_999),
    lowStockThreshold: z.coerce.number().int().min(0).max(9999),
  })
  .refine((data) => {
    if (data.salePrice == null || data.salePrice === 0) return true;
    return data.salePrice < data.price;
  }, { message: "Sale price must be lower than the regular price", path: ["salePrice"] });

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const inventoryFormSchema = z.object({
  quantity: z.coerce.number().int().min(0).max(999_999),
  lowStockThreshold: z.coerce.number().int().min(0).max(9999),
});

export const productStatusSchema = z.object({
  productId: z.string().min(1),
  status: z.enum(["DRAFT", "PENDING_REVIEW"]),
});
