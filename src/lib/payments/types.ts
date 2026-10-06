/**
 * Payment provider abstraction.
 *
 * Conventions:
 *  - All amounts are INTEGER MINOR UNITS (e.g. paisa) — never floats.
 *  - Currencies are lowercase ISO 4217 codes (e.g. "pkr").
 *  - The marketplace records orders; providers only move money. Reconciliation
 *    (updating Order/Payment rows) happens in the checkout service, which is
 *    wired to these interfaces in a later phase.
 */

export type PaymentProviderId = "cod" | "stripe";

export type PaymentIntentStatus =
  | "pending"
  | "requires_action"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface CreatePaymentIntentInput {
  /** Our order id — stored on the intent so webhooks can reconcile. */
  orderId: string;
  amountMinor: number;
  currency: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntent {
  id: string;
  provider: PaymentProviderId;
  status: PaymentIntentStatus;
  amountMinor: number;
  currency: string;
  /** Client secret for hosted checkout (Stripe). Undefined for COD. */
  clientSecret?: string;
}

export interface RefundResult {
  id: string;
  status: "pending" | "succeeded" | "failed";
  amountMinor: number;
}

export interface PaymentWebhookEvent {
  provider: PaymentProviderId;
  /** Normalized event type, e.g. "payment_intent.succeeded". */
  type: string;
  orderId?: string;
  paymentIntentId?: string;
}

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  /** Whether this provider can be offered at checkout in this environment. */
  isConfigured(): boolean;
  createIntent(input: CreatePaymentIntentInput): Promise<PaymentIntent>;
  /** Mark the intent as collected (COD: cash taken on delivery). */
  captureIntent(intent: PaymentIntent): Promise<PaymentIntent>;
  cancelIntent(intent: PaymentIntent): Promise<PaymentIntent>;
  refund(input: { intentId: string; amountMinor: number }): Promise<RefundResult>;
  /**
   * Verify a provider webhook signature and parse it into a normalized event.
   * Returns null when the signature is missing/invalid.
   */
  parseWebhook(rawBody: string, signature: string | null): Promise<PaymentWebhookEvent | null>;
}
