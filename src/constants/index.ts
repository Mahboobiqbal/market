import type {
  OrderStatus,
  PaymentStatus,
  PayoutStatus,
  ProductStatus,
  ReturnStatus,
} from "@/generated/prisma/enums";

/**
 * Shared presentation metadata for domain statuses.
 * `tone` maps to StatusBadge color styles (see components/shared/status-badge).
 */

export type Tone = "neutral" | "info" | "accent" | "warning" | "success" | "danger";

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Pending", tone: "neutral" },
  CONFIRMED: { label: "Confirmed", tone: "info" },
  PROCESSING: { label: "Processing", tone: "info" },
  PACKED: { label: "Packed", tone: "accent" },
  SHIPPED: { label: "Shipped", tone: "accent" },
  DELIVERED: { label: "Delivered", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
  RETURN_REQUESTED: { label: "Return requested", tone: "warning" },
  RETURNED: { label: "Returned", tone: "warning" },
  REFUNDED: { label: "Refunded", tone: "success" },
};

export const PRODUCT_STATUS_META: Record<ProductStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  PENDING_REVIEW: { label: "Pending review", tone: "warning" },
  ACTIVE: { label: "Active", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  DISABLED: { label: "Disabled", tone: "neutral" },
  OUT_OF_STOCK: { label: "Out of stock", tone: "warning" },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Pending", tone: "neutral" },
  AUTHORIZED: { label: "Authorized", tone: "info" },
  CAPTURED: { label: "Paid", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
  REFUNDED: { label: "Refunded", tone: "warning" },
  PARTIALLY_REFUNDED: { label: "Partially refunded", tone: "warning" },
};

export const PAYOUT_STATUS_META: Record<PayoutStatus, { label: string; tone: Tone }> = {
  REQUESTED: { label: "Requested", tone: "warning" },
  APPROVED: { label: "Approved", tone: "info" },
  REJECTED: { label: "Rejected", tone: "danger" },
  PAID: { label: "Paid", tone: "success" },
};

export const RETURN_STATUS_META: Record<ReturnStatus, { label: string; tone: Tone }> = {
  REQUESTED: { label: "Requested", tone: "warning" },
  APPROVED: { label: "Approved", tone: "info" },
  REJECTED: { label: "Rejected", tone: "danger" },
  RECEIVED: { label: "Received", tone: "accent" },
  REFUNDED: { label: "Refunded", tone: "success" },
  CLOSED: { label: "Closed", tone: "neutral" },
};

/** Happy-path order progression used by tracking timelines. */
export const ORDER_FLOW: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
];

/** Terminal states that sit outside the linear flow on a timeline. */
export const ORDER_TERMINAL_STATUSES: OrderStatus[] = [
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
  "REFUNDED",
];

/** Allowed seller status transitions (server enforces these too). */
export const SELLER_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
  RETURN_REQUESTED: ["RETURNED"],
  RETURNED: ["REFUNDED"],
  REFUNDED: [],
};

/** Statuses in which a customer may cancel their order. */
export const CUSTOMER_CANCELLABLE: OrderStatus[] = ["PENDING", "CONFIRMED"];

/** Statuses in which a customer may request a return. */
export const CUSTOMER_RETURNABLE: OrderStatus[] = ["DELIVERED"];

/** Public catalog sorting options (URL value → label). */
export const PRODUCT_SORTS = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating", label: "Highest rated" },
  { value: "popular", label: "Most popular" },
] as const;

export type ProductSort = (typeof PRODUCT_SORTS)[number]["value"];

export const PRODUCT_SORT_VALUES = PRODUCT_SORTS.map((s) => s.value) as ProductSort[];

/** Pagination defaults for public catalog pages. */
export const CATALOG_PAGE_SIZE = 12;
export const CATALOG_MAX_PAGE_SIZE = 48;

/** Hash-based order number helpers: NX-20261007-8F3K2A */
export function orderNumberPrefix(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `NX-${y}${m}${d}`;
}
