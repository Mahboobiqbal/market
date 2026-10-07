"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/dal";
import { addressFormSchema } from "@/lib/validation/address.schema";
import { createAddress, deleteAddress, setDefaultAddress, updateAddress } from "@/services/address.service";

export type AddressActionResult = {
  ok: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function saveAddressAction(
  id: string | null,
  formData: FormData,
): Promise<AddressActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Sign in required." };

  const parsed = addressFormSchema.safeParse({
    type: String(formData.get("type") ?? "HOME"),
    label: String(formData.get("label") ?? ""),
    line1: String(formData.get("line1") ?? ""),
    line2: String(formData.get("line2") ?? ""),
    city: String(formData.get("city") ?? ""),
    region: String(formData.get("region") ?? ""),
    postalCode: String(formData.get("postalCode") ?? ""),
    country: String(formData.get("country") ?? "PK"),
    phone: String(formData.get("phone") ?? ""),
    isDefault: formData.get("isDefault") === "on" || formData.get("isDefault") === "true",
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const payload = {
      ...parsed.data,
      label: parsed.data.label || null,
      line2: parsed.data.line2 || null,
      country: parsed.data.country || undefined,
      phone: parsed.data.phone || null,
    };
    if (id) {
      await updateAddress(user.id, id, payload);
    } else {
      await createAddress(user.id, payload);
    }
  } catch (error) {
    console.error("[address] save failed:", error);
    return { ok: false, message: "Could not save the address." };
  }

  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  return { ok: true, message: id ? "Address updated" : "Address added" };
}

export async function deleteAddressAction(addressId: string): Promise<AddressActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Sign in required." };

  await deleteAddress(user.id, addressId);
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  return { ok: true, message: "Address removed" };
}

const defaultAddressSchema = z.string().min(1);

export async function setDefaultAddressAction(addressId: string): Promise<AddressActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Sign in required." };
  if (!defaultAddressSchema.safeParse(addressId).success) {
    return { ok: false, message: "Invalid address." };
  }

  await setDefaultAddress(user.id, addressId);
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  return { ok: true, message: "Default address updated" };
}
