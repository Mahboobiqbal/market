import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db/prisma";

/**
 * Customer cart — database-backed, grouped by seller for checkout.
 * Prices are always re-derived from the product record, never trusted
 * from the client.
 */

export type CartLine = {
  id: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  available: boolean;
  unavailableReason: string | null;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    salePrice: number | null;
    effectivePrice: number;
    imageUrl: string | null;
    stock: number;
    status: string;
    shop: { id: string; name: string; slug: string };
  };
  variant: { id: string; name: string; price: number | null; options: unknown } | null;
};

export type CartGroup = {
  shop: { id: string; name: string; slug: string };
  items: CartLine[];
  subtotal: number;
};

export type CartView = {
  groups: CartGroup[];
  itemCount: number;
  subtotal: number;
  /** Lines that cannot be purchased right now (out of stock / delisted). */
  hasIssues: boolean;
};

const EMPTY_CART: CartView = { groups: [], itemCount: 0, subtotal: 0, hasIssues: false };

const itemInclude = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      salePrice: true,
      effectivePrice: true,
      status: true,
      images: { orderBy: { position: "asc" as const }, take: 1, select: { url: true } },
      shop: { select: { id: true, name: true, slug: true } },
      inventory: { select: { quantity: true, reserved: true } },
    },
  },
  variant: { select: { id: true, name: true, price: true, options: true } },
};

type ItemRow = {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    salePrice: number | null;
    effectivePrice: number;
    status: string;
    images: { url: string }[];
    shop: { id: string; name: string; slug: string };
    inventory: { quantity: number; reserved: number } | null;
  };
  variant: { id: string; name: string; price: number | null; options: unknown } | null;
};

function toLine(row: ItemRow): CartLine {
  const stock = row.product.inventory
    ? row.product.inventory.quantity - row.product.inventory.reserved
    : 0;
  const unitPrice = row.variant?.price ?? row.product.effectivePrice;
  let available = true;
  let unavailableReason: string | null = null;
  if (row.product.status !== "ACTIVE") {
    available = false;
    unavailableReason = "No longer available";
  } else if (stock < row.quantity) {
    available = false;
    unavailableReason = stock <= 0 ? "Out of stock" : `Only ${stock} left`;
  }
  return {
    id: row.id,
    quantity: row.quantity,
    unitPrice,
    lineTotal: unitPrice * row.quantity,
    available,
    unavailableReason,
    product: {
      id: row.product.id,
      name: row.product.name,
      slug: row.product.slug,
      price: row.product.price,
      salePrice: row.product.salePrice,
      effectivePrice: row.product.effectivePrice,
      imageUrl: row.product.images[0]?.url ?? null,
      stock,
      status: row.product.status,
      shop: row.product.shop,
    },
    variant: row.variant,
  };
}

export async function getCartView(userId: string): Promise<CartView> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: itemInclude, orderBy: { createdAt: "asc" } } },
  });
  if (!cart || cart.items.length === 0) return EMPTY_CART;

  const lines = cart.items.map(toLine);
  const groupsMap = new Map<string, CartGroup>();
  for (const line of lines) {
    const shopId = line.product.shop.id;
    if (!groupsMap.has(shopId)) {
      groupsMap.set(shopId, {
        shop: line.product.shop,
        items: [],
        subtotal: 0,
      });
    }
    const group = groupsMap.get(shopId)!;
    group.items.push(line);
    if (line.available) group.subtotal += line.lineTotal;
  }

  const groups = [...groupsMap.values()];
  const subtotal = groups.reduce((sum, g) => sum + g.subtotal, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const hasIssues = lines.some((l) => !l.available);
  return { groups, itemCount, subtotal, hasIssues };
}

/** Header badge count (cheap projection). */
export const getCartItemCount = cache(async (userId: string): Promise<number> => {
  const items = await prisma.cartItem.findMany({
    where: { cart: { userId } },
    select: { quantity: true },
  });
  return items.reduce((sum, i) => sum + i.quantity, 0);
});

function stockOf(product: { inventory: { quantity: number; reserved: number } | null }): number {
  return product.inventory ? product.inventory.quantity - product.inventory.reserved : 0;
}

export type AddItemResult = { ok: true } | { ok: false; error: string };

export async function addCartItem(
  userId: string,
  input: { productId: string; variantId?: string | null; quantity?: number },
): Promise<AddItemResult> {
  const quantity = Math.max(1, Math.min(99, Math.floor(input.quantity ?? 1)));

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      salePrice: true,
      effectivePrice: true,
      status: true,
      images: { orderBy: { position: "asc" as const }, take: 1, select: { url: true } },
      shop: { select: { id: true, name: true, slug: true } },
      inventory: { select: { quantity: true, reserved: true } },
    },
  });
  if (!product || product.status !== "ACTIVE") {
    return { ok: false, error: "This product is not available." };
  }

  let variant: { id: string; price: number | null } | null = null;
  if (input.variantId) {
    variant = await prisma.productVariant.findFirst({
      where: { id: input.variantId, productId: product.id, isActive: true },
      select: { id: true, price: true },
    });
    if (!variant) return { ok: false, error: "Selected option is no longer available." };
  }

  const cart = await prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
    select: { id: true },
  });

  const existing = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId: product.id,
      variantId: variant?.id ?? null,
    },
    select: { id: true, quantity: true },
  });

  const stock = stockOf(product);
  const nextQuantity = (existing?.quantity ?? 0) + quantity;
  if (nextQuantity > stock) {
    return {
      ok: false,
      error: stock <= 0 ? "This product is out of stock." : `Only ${stock} in stock.`,
    };
  }

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: nextQuantity },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        variantId: variant?.id ?? null,
        quantity,
      },
    });
  }
  return { ok: true };
}

export async function updateCartItem(
  userId: string,
  itemId: string,
  quantity: number,
): Promise<AddItemResult> {
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
    include: { product: { select: { inventory: { select: { quantity: true, reserved: true } } } } },
  });
  if (!item) return { ok: false, error: "Cart item not found." };

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
    return { ok: true };
  }

  const stock = stockOf(item.product);
  if (quantity > stock) {
    return { ok: false, error: stock <= 0 ? "Out of stock." : `Only ${stock} in stock.` };
  }
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
  return { ok: true };
}

export async function removeCartItem(userId: string, itemId: string): Promise<void> {
  await prisma.cartItem.deleteMany({ where: { id: itemId, cart: { userId } } });
}

export async function clearCart(userId: string): Promise<void> {
  await prisma.cartItem.deleteMany({ where: { cart: { userId } } });
}
