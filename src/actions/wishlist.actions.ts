"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/dal";
import { toggleWishlist } from "@/services/wishlist.service";

export type WishlistResult = { ok: boolean; added: boolean; message: string };

export async function toggleWishlistAction(productId: string): Promise<WishlistResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, added: false, message: "Sign in to save items to your wishlist." };
  }

  const added = await toggleWishlist(user.id, productId);
  revalidatePath("/", "layout");
  return {
    ok: true,
    added,
    message: added ? "Saved to wishlist" : "Removed from wishlist",
  };
}
