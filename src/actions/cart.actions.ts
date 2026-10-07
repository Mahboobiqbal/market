"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/dal";
import { addCartItem, clearCart, removeCartItem, updateCartItem } from "@/services/cart.service";

export type ActionResult = { ok: boolean; message: string };

export async function addToCartAction(formData: FormData): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Sign in to add items to your cart." };

  const productId = String(formData.get("productId") ?? "");
  const variantRaw = formData.get("variantId");
  const variantId = typeof variantRaw === "string" && variantRaw ? variantRaw : null;
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1) || 1);
  if (!productId) return { ok: false, message: "Missing product." };

  const result = await addCartItem(user.id, { productId, variantId, quantity });
  if (!result.ok) return { ok: false, message: result.error };

  revalidatePath("/", "layout");
  return { ok: true, message: "Added to cart" };
}

export async function updateCartItemAction(
  itemId: string,
  quantity: number,
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Sign in required." };

  const result = await updateCartItem(user.id, itemId, quantity);
  if (!result.ok) return { ok: false, message: result.error };

  revalidatePath("/", "layout");
  return { ok: true, message: quantity <= 0 ? "Removed from cart" : "Cart updated" };
}

export async function removeCartItemAction(itemId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Sign in required." };

  await removeCartItem(user.id, itemId);
  revalidatePath("/", "layout");
  return { ok: true, message: "Removed from cart" };
}

export async function clearCartAction(): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Sign in required." };

  await clearCart(user.id);
  revalidatePath("/", "layout");
  return { ok: true, message: "Cart cleared" };
}
