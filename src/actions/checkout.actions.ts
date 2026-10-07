"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/dal";
import { checkoutFormSchema } from "@/lib/validation/checkout.schema";
import { placeOrder } from "@/services/order.service";

export type CheckoutState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string[]>;
};

export async function placeOrderAction(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/checkout");

  const parsed = checkoutFormSchema.safeParse({
    addressId: String(formData.get("addressId") ?? ""),
    paymentMethod: String(formData.get("paymentMethod") ?? "COD"),
    couponCode: String(formData.get("couponCode") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await placeOrder(user.id, {
    addressId: parsed.data.addressId,
    paymentMethod: parsed.data.paymentMethod,
    couponCode: parsed.data.couponCode || null,
    note: parsed.data.note || null,
  });

  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  revalidatePath("/", "layout");
  redirect(`/account/orders/${result.orderNumber}`);
}
