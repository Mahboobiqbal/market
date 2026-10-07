"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/dal";
import { sellerApplicationSchema } from "@/lib/validation/seller.schema";
import { submitSellerApplication } from "@/services/seller.service";

export type SellerApplyState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string[]>;
};

export async function submitSellerApplicationAction(
  _prev: SellerApplyState,
  formData: FormData,
): Promise<SellerApplyState> {
  const user = await getSessionUser();
  if (!user) return { status: "error", message: "Sign in before applying." };

  const parsed = sellerApplicationSchema.safeParse({
    businessName: String(formData.get("businessName") ?? ""),
    businessType: String(formData.get("businessType") ?? "INDIVIDUAL"),
    cnic: String(formData.get("cnic") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await submitSellerApplication(user.id, parsed.data);
  if (!result.ok) return { status: "error", message: result.error };

  revalidatePath("/sell");
  return { status: "success", message: "Application submitted for review." };
}
