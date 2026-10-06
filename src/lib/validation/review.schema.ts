import { z } from "zod";

export const reviewFormSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Pick a rating").max(5),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  comment: z.string().trim().max(2000).optional().or(z.literal("")),
});
