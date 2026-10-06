import "server-only";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import {
  CUSTOMER_CANCELLABLE,
  CUSTOMER_RETURNABLE,
  SELLER_ORDER_TRANSITIONS,
  orderNumberPrefix,
} from "@/constants";
import { calculateCommission, resolveCommissionBps } from "@/services/commission.service";
import { checkCoupon } from "@/services/coupon.service";
import { getPlatformSettings } from "@/services/settings.service";
import { notify } from "@/services/notification.service";

/**
 * Order placement + lifecycle.
 *
 * Financial integrity: every price, commission, shipping and discount
 * number is computed HERE, server-side, inside a single transaction.
 * The client never supplies money values.
 *
 * Parent marketplace order → per-seller SellerOrders (spec §11).
 */

export type PlaceOrderInput = {
  addressId: string;
  paymentMethod: PaymentMethod;
  couponCode?: string | null;
  note?: string | null;
};

export type PlaceOrderResult =
  | { ok: true; orderNumber: string }
  | { ok: false; error: string };

type CartRow = {
  id: string;
  quantity: number;
  variantId: string | null;
  product: {
    id: string;
    name: string;
    slug: string;
    sku: string;
    status: string;
    price: number;
    salePrice: number | null;
    effectivePrice: number;
    sellerId: string;
    shopId: string;
    categoryId: string | null;
    brandId: string | null;
    images: { url: string }[];
    inventory: { id: string; quantity: number; reserved: number } | null;
    shop: { id: string; name: string; slug: string };
  };
  variant: { id: string; name: string; sku: string; price: number | null } | null;
};

const cartCheckoutSelect = {
  id: true,
  quantity: true,
  variantId: true,
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      status: true,
      price: true,
      salePrice: true,
      effectivePrice: true,
      sellerId: true,
      shopId: true,
      categoryId: true,
      brandId: true,
      images: { orderBy: { position: "asc" as const }, take: 1, select: { url: true } },
      inventory: { select: { id: true, quantity: true, reserved: true } },
      shop: { select: { id: true, name: true, slug: true } },
    },
  },
  variant: { select: { id: true, name: true, sku: true, price: true } },
} as const;

function randomSuffix(length = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/** Effective parent status derived from its seller orders. */
export function rollupParentStatus(children: { status: OrderStatus }[]): OrderStatus {
  if (children.length === 0) return "PENDING";
  if (children.some((c) => c.status === "RETURN_REQUESTED")) return "RETURN_REQUESTED";

  const flow: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED"];
  const active = children.filter(
    (c) => c.status !== "CANCELLED" && c.status !== "RETURNED" && c.status !== "REFUNDED",
  );
  if (active.length === 0) {
    if (children.every((c) => c.status === "REFUNDED")) return "REFUNDED";
    if (children.every((c) => c.status === "RETURNED")) return "RETURNED";
    return "CANCELLED";
  }
  const indices = active.map((c) => flow.indexOf(c.status)).filter((i) => i >= 0);
  return indices.length > 0 ? flow[Math.min(...indices)] : "PENDING";
}

export async function placeOrder(
  userId: string,
  input: PlaceOrderInput,
): Promise<PlaceOrderResult> {
  const settings = await getPlatformSettings();

  const address = await prisma.address.findFirst({
    where: { id: input.addressId, userId },
  });
  if (!address) return { ok: false, error: "Select a valid shipping address." };

  if (input.paymentMethod === "COD" && !settings.codEnabled) {
    return { ok: false, error: "Cash on delivery is not available." };
  }
  if (input.paymentMethod !== "COD" && !settings.onlinePaymentsEnabled) {
    return { ok: false, error: "Online payments are not available." };
  }

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: cartCheckoutSelect, orderBy: { createdAt: "asc" } } },
  });
  if (!cart || cart.items.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }
  const rows = cart.items as unknown as CartRow[];

  // Validate availability up-front (transaction re-checks with locks).
  for (const row of rows) {
    if (row.product.status !== "ACTIVE") {
      return { ok: false, error: `"${row.product.name}" is no longer available.` };
    }
    const stock = row.product.inventory
      ? row.product.inventory.quantity - row.product.inventory.reserved
      : 0;
    if (stock < row.quantity) {
      return {
        ok: false,
        error:
          stock <= 0
            ? `"${row.product.name}" is out of stock.`
            : `Only ${stock} of "${row.product.name}" left in stock.`,
      };
    }
  }

  // Snapshot money values (never client-supplied).
  type Line = {
    cartItemId: string;
    productId: string;
    variantId: string | null;
    sellerId: string;
    shopId: string;
    categoryId: string | null;
    title: string;
    sku: string;
    imageUrl: string | null;
    variantLabel: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  };

  const lines: Line[] = rows.map((row) => {
    const unitPrice = row.variant?.price ?? row.product.effectivePrice;
    return {
      cartItemId: row.id,
      productId: row.product.id,
      variantId: row.variant?.id ?? null,
      sellerId: row.product.sellerId,
      shopId: row.product.shopId,
      categoryId: row.product.categoryId,
      title: row.product.name,
      sku: row.variant?.sku ?? row.product.sku,
      imageUrl: row.product.images[0]?.url ?? null,
      variantLabel: row.variant ? row.variant.name : null,
      quantity: row.quantity,
      unitPrice,
      lineTotal: unitPrice * row.quantity,
    };
  });

  const parentSubtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);

  // Coupon (validated against the pre-discount subtotal).
  let discount = 0;
  let couponCode: string | null = null;
  if (input.couponCode?.trim()) {
    const check = await checkCoupon(input.couponCode, parentSubtotal);
    if (!check.ok) return { ok: false, error: check.error };
    discount = check.discount;
    couponCode = check.code;
  }

  const discountedSubtotal = Math.max(0, parentSubtotal - discount);
  const taxTotal = Math.round((discountedSubtotal * settings.taxBps) / 10_000);

  // Group by seller.
  const byShop = new Map<string, Line[]>();
  for (const line of lines) {
    const key = line.shopId;
    if (!byShop.has(key)) byShop.set(key, []);
    byShop.get(key)!.push(line);
  }

  // Allocate the discount proportionally across seller orders (largest remainder).
  const allocations = new Map<string, number>();
  let allocated = 0;
  const entries = [...byShop.entries()];
  entries.forEach(([shopId, shopLines], index) => {
    const shopSubtotal = shopLines.reduce((sum, l) => sum + l.lineTotal, 0);
    let share: number;
    if (index === entries.length - 1) {
      share = discount - allocated; // last group absorbs rounding remainder
    } else {
      share = Math.round((discount * shopSubtotal) / parentSubtotal);
      allocated += share;
    }
    allocations.set(shopId, Math.max(0, share));
  });

  const orderNumber = `${orderNumberPrefix()}-${randomSuffix()}`;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Re-validate stock inside the transaction.
      for (const row of rows) {
        const inv = await tx.inventory.findUnique({
          where: { productId: row.product.id },
          select: { quantity: true, reserved: true },
        });
        const stock = inv ? inv.quantity - inv.reserved : 0;
        if (stock < row.quantity) {
          throw new Error(`STOCK:${row.product.name}`);
        }
      }

      // 2. Parent order.
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          status: "PENDING",
          subtotal: parentSubtotal,
          shippingTotal: 0, // filled below
          discountTotal: discount,
          taxTotal,
          total: 0, // filled below
          shippingAddress: JSON.parse(JSON.stringify(address)),
          couponCode,
          note: input.note?.slice(0, 500) ?? null,
          placedAt: new Date(),
        },
      });

      // 3. Per-seller orders + items.
      let shippingTotal = 0;
      let childIndex = 0;

      for (const [shopId, shopLines] of entries) {
        childIndex += 1;
        const shopSubtotal = shopLines.reduce((sum, l) => sum + l.lineTotal, 0);
        const allocatedDiscount = allocations.get(shopId) ?? 0;
        const grossItems = shopSubtotal - allocatedDiscount;

        const sellerId = shopLines[0].sellerId;
        const shipping =
          grossItems >= settings.freeShippingOver ? 0 : settings.shippingPerSeller;
        shippingTotal += shipping;

        // Commission per line (scope-aware), with per-line discount allocation.
        const childItems: {
          orderItemId: string;
          line: Line;
          commission: number;
          earning: number;
        }[] = [];
        let lineAllocated = 0;
        let commissionTotal = 0;
        let earningTotal = 0;

        for (let i = 0; i < shopLines.length; i++) {
          const line = shopLines[i];
          let lineDiscount: number;
          if (i === shopLines.length - 1) {
            lineDiscount = allocatedDiscount - lineAllocated;
          } else {
            lineDiscount = Math.round((allocatedDiscount * line.lineTotal) / shopSubtotal);
            lineAllocated += lineDiscount;
          }
          lineDiscount = Math.max(0, lineDiscount);
          const lineGross = line.lineTotal - lineDiscount;

          const bps = await resolveCommissionBps({
            productId: line.productId,
            categoryId: line.categoryId,
            sellerId,
          });
          const commission = calculateCommission(lineGross, bps);
          const earning = lineGross - commission;
          commissionTotal += commission;
          earningTotal += earning;
          childItems.push({ orderItemId: "", line, commission, earning });
        }

        const effectiveBps =
          grossItems > 0 ? Math.round((commissionTotal / grossItems) * 10_000) : 0;

        const sellerOrder = await tx.sellerOrder.create({
          data: {
            orderId: order.id,
            sellerId,
            shopId,
            orderNumber: `${orderNumber}-S${childIndex}`,
            status: "PENDING",
            subtotal: shopSubtotal,
            shippingTotal: shipping,
            commissionTotal,
            earningTotal,
            commissionBps: effectiveBps,
            items: {
              create: shopLines.map((line, i) => ({
                orderItemId: "",
                productId: line.productId,
                variantId: line.variantId,
                title: line.title,
                sku: line.sku,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                lineTotal: line.lineTotal,
                commission: childItems[i].commission,
                earning: childItems[i].earning,
              })),
            },
          },
          include: { items: true },
        });

        // Link seller order items to parent order items.
        for (let i = 0; i < shopLines.length; i++) {
          const line = shopLines[i];
          const orderItem = await tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: line.productId,
              variantId: line.variantId,
              sellerId: line.sellerId,
              shopId: line.shopId,
              title: line.title,
              sku: line.sku,
              imageUrl: line.imageUrl,
              variantLabel: line.variantLabel,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: line.lineTotal,
            },
          });
          await tx.sellerOrderItem.update({
            where: { id: sellerOrder.items[i].id },
            data: { orderItemId: orderItem.id },
          });
        }

        // 4. Decrement stock + bump sold counters.
        for (const line of shopLines) {
          await tx.inventory.update({
            where: { productId: line.productId },
            data: { quantity: { decrement: line.quantity } },
          });
          await tx.product.update({
            where: { id: line.productId },
            data: { totalSold: { increment: line.quantity } },
          });
        }
      }

      const total = parentSubtotal - discount + shippingTotal + taxTotal;

      // 5. Payment record (never raw card data).
      const paymentStatus: PaymentStatus =
        input.paymentMethod === "COD" ? "PENDING" : "AUTHORIZED";
      await tx.payment.create({
        data: {
          orderId: order.id,
          method: input.paymentMethod,
          provider: input.paymentMethod === "COD" ? "cod" : "online",
          amount: total,
          currency: settings.currency,
          status: paymentStatus,
        },
      });

      // 6. Coupon usage.
      if (couponCode) {
        const coupon = await tx.coupon.findUnique({ where: { code: couponCode } });
        if (coupon) {
          await tx.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });
          await tx.couponUsage.create({
            data: {
              couponId: coupon.id,
              userId,
              orderId: order.id,
              amount: discount,
            },
          });
        }
      }

      // 7. Finalize parent totals.
      await tx.order.update({
        where: { id: order.id },
        data: { shippingTotal, total },
      });

      // 8. Clear the cart.
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("STOCK:")) {
      const name = error.message.slice("STOCK:".length);
      return { ok: false, error: `"${name}" just sold out. Please review your cart.` };
    }
    console.error("[order] placeOrder failed:", error);
    return { ok: false, error: "Could not place the order. Please try again." };
  }

  // Out-of-transaction: notifications (best-effort).
  const placed = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      id: true,
      total: true,
      sellerOrders: { select: { sellerId: true, shopId: true } },
      customer: { select: { email: true } },
    },
  });
  if (placed) {
    const shopIds = placed.sellerOrders.map((s) => s.shopId);
    const shops = await prisma.shop.findMany({
      where: { id: { in: shopIds } },
      select: { sellerId: true },
    });
    await notify(userId, "ORDER_PLACED", `Order ${orderNumber} placed`, {
      body: `Total Rs ${(placed.total / 100).toLocaleString()}. We'll notify you when it ships.`,
      link: `/account/orders/${orderNumber}`,
    });
    for (const shop of shops) {
      await notify(shop.sellerId, "ORDER_PLACED", `New order ${orderNumber}`, {
        body: "A customer ordered from your shop.",
        link: `/seller/orders/${orderNumber}`,
      });
    }
  }

  return { ok: true, orderNumber };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listCustomerOrders(userId: string, page = 1, pageSize = 10) {
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        subtotal: true,
        shippingTotal: true,
        discountTotal: true,
        taxTotal: true,
        total: true,
        placedAt: true,
        items: {
          select: { title: true, imageUrl: true, quantity: true },
          take: 4,
        },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where: { userId } }),
  ]);
  return { orders, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getCustomerOrder(userId: string, orderNumber: string) {
  return prisma.order.findFirst({
    where: { orderNumber, userId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      subtotal: true,
      shippingTotal: true,
      discountTotal: true,
      taxTotal: true,
      total: true,
      couponCode: true,
      note: true,
      shippingAddress: true,
      placedAt: true,
      confirmedAt: true,
      deliveredAt: true,
      createdAt: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          productId: true,
          title: true,
          sku: true,
          imageUrl: true,
          variantLabel: true,
          quantity: true,
          unitPrice: true,
          lineTotal: true,
          shopId: true,
        },
      },
      sellerOrders: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          subtotal: true,
          shippingTotal: true,
          commissionTotal: true,
          earningTotal: true,
          shop: { select: { id: true, name: true, slug: true } },
          createdAt: true,
        },
      },
      payments: {
        select: { id: true, method: true, provider: true, amount: true, status: true, createdAt: true },
      },
      returnRequests: {
        select: { id: true, orderItemId: true, reason: true, status: true, createdAt: true },
      },
    },
  });
}

export async function canCustomerCancel(order: {
  status: OrderStatus;
  sellerOrders: { status: OrderStatus }[];
}): Promise<boolean> {
  if (!CUSTOMER_CANCELLABLE.includes(order.status)) return false;
  return order.sellerOrders.every((so) => CUSTOMER_CANCELLABLE.includes(so.status));
}

export async function canCustomerReturn(order: { status: OrderStatus }): Promise<boolean> {
  return CUSTOMER_RETURNABLE.includes(order.status);
}

// ---------------------------------------------------------------------------
// Mutations (customer)
// ---------------------------------------------------------------------------

export async function cancelCustomerOrder(
  userId: string,
  orderNumber: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const order = await prisma.order.findFirst({
    where: { orderNumber, userId },
    include: { sellerOrders: { select: { id: true, status: true } } },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (!(await canCustomerCancel(order))) {
    return { ok: false, error: "This order can no longer be cancelled." };
  }

  await prisma.$transaction(async (tx) => {
    const sellerOrders = await tx.sellerOrder.findMany({
      where: { orderId: order.id },
      select: { id: true, status: true },
    });
    for (const so of sellerOrders) {
      if (!CUSTOMER_CANCELLABLE.includes(so.status)) continue;
      const items = await tx.sellerOrderItem.findMany({
        where: { sellerOrderId: so.id },
        select: { productId: true, quantity: true },
      });
      for (const item of items) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: { quantity: { increment: item.quantity } },
        });
        await tx.product.update({
          where: { id: item.productId },
          data: { totalSold: { decrement: item.quantity } },
        });
      }
      await tx.sellerOrder.update({ where: { id: so.id }, data: { status: "CANCELLED" } });
    }
    await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
  });

  return { ok: true };
}

export async function requestReturn(
  userId: string,
  input: { orderNumber: string; orderItemId: string; reason: string; note?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const order = await prisma.order.findFirst({
    where: { orderNumber: input.orderNumber, userId },
    select: { id: true, status: true, items: { where: { id: input.orderItemId }, select: { id: true, shopId: true } } },
  });
  if (!order || order.items.length === 0) return { ok: false, error: "Item not found." };
  if (!CUSTOMER_RETURNABLE.includes(order.status)) {
    return { ok: false, error: "Returns are only available for delivered orders." };
  }

  const existing = await prisma.returnRequest.findFirst({
    where: { orderId: order.id, orderItemId: input.orderItemId, status: { notIn: ["REJECTED", "CLOSED"] } },
    select: { id: true },
  });
  if (existing) return { ok: false, error: "A return request already exists for this item." };

  const item = order.items[0];
  const sellerOrder = await prisma.sellerOrder.findFirst({
    where: { orderId: order.id, shopId: item.shopId },
    select: { id: true, sellerId: true },
  });

  await prisma.returnRequest.create({
    data: {
      orderId: order.id,
      orderItemId: input.orderItemId,
      sellerOrderId: sellerOrder?.id ?? null,
      reason: input.reason.slice(0, 200),
      note: input.note?.slice(0, 1000) ?? null,
      status: "REQUESTED",
    },
  });
  if (sellerOrder) {
    await prisma.sellerOrder.update({
      where: { id: sellerOrder.id },
      data: { status: "RETURN_REQUESTED" },
    });
  }
  const children = await prisma.sellerOrder.findMany({
    where: { orderId: order.id },
    select: { status: true },
  });
  await prisma.order.update({
    where: { id: order.id },
    data: { status: rollupParentStatus(children) },
  });

  if (sellerOrder) {
    await notify(sellerOrder.sellerId, "NEW_RETURN_REQUEST", `Return requested — ${input.orderNumber}`, {
      body: input.reason,
      link: `/seller/orders/${input.orderNumber}`,
    });
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Mutations (seller)
// ---------------------------------------------------------------------------

export async function updateSellerOrderStatus(
  sellerId: string,
  orderNumber: string,
  next: OrderStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sellerOrder = await prisma.sellerOrder.findFirst({
    where: { orderNumber, sellerId },
    select: { id: true, orderId: true, status: true },
  });
  if (!sellerOrder) return { ok: false, error: "Order not found." };

  const allowed = SELLER_ORDER_TRANSITIONS[sellerOrder.status] ?? [];
  if (!allowed.includes(next)) {
    return { ok: false, error: `Cannot move from ${sellerOrder.status} to ${next}.` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.sellerOrder.update({
      where: { id: sellerOrder.id },
      data: {
        status: next,
        ...(next === "SHIPPED" ? { shipment: { shippedAt: new Date().toISOString() } } : {}),
      },
    });

    const children = await tx.sellerOrder.findMany({
      where: { orderId: sellerOrder.orderId },
      select: { status: true },
    });
    const rolled = rollupParentStatus(children);
    const parent = await tx.order.findUnique({
      where: { id: sellerOrder.orderId },
      select: { confirmedAt: true, deliveredAt: true },
    });
    const allDelivered = children.every((c) => c.status === "DELIVERED");

    await tx.order.update({
      where: { id: sellerOrder.orderId },
      data: {
        status: rolled,
        confirmedAt: rolled !== "PENDING" && !parent?.confirmedAt ? new Date() : undefined,
        deliveredAt: allDelivered && !parent?.deliveredAt ? new Date() : undefined,
      },
    });
  });

  return { ok: true };
}
