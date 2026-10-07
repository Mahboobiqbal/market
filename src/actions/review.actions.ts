"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/dal";
import { reviewFormSchema } from "@/lib/validation/review.schema";
import { createOrUpdateReview, deleteReview } from "@/services/review.service";

export type ReviewState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string[]>;
};

export async function submitReviewAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const user = await getSessionUser();
  if (!user) return { status: "error", message: "Sign in to leave a review." };

  const parsed = reviewFormSchema.safeParse({
    productId: String(formData.get("productId") ?? ""),
    rating: String(formData.get("rating") ?? ""),
    title: String(formData.get("title") ?? ""),
    comment: String(formData.get("comment") ?? ""),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await createOrUpdateReview(user.id, parsed.data);
  if (!result.ok) return { status: "error", message: result.error };

  revalidatePath(`/products/[slug]`, "page");
  revalidatePath("/account/reviews");
  return { status: "success", message: "Review published" };
}

export async function deleteReviewAction(reviewId: string): Promise<{ ok: boolean }> {
  const user = await getSessionUser();
  if (!user) return { ok: false };

  await deleteReview(user.id, reviewId);
  revalidatePath("/account/reviews");
  return { ok: true };
}
