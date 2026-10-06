import type {
  CreatePaymentIntentInput,
  PaymentIntent,
  PaymentProvider,
  RefundResult,
} from "./types";

/**
 * Cash on delivery. No external calls — the "intent" exists so the order
 * lifecycle (pending → captured at the door → refunded in cash) flows through
 * the same code path as online payments.
 */
export const codProvider: PaymentProvider = {
  id: "cod",

  isConfigured() {
    return true;
  },

  async createIntent(input: CreatePaymentIntentInput): Promise<PaymentIntent> {
    return {
      id: `cod_${input.orderId}`,
      provider: "cod",
      status: "pending",
      amountMinor: input.amountMinor,
      currency: input.currency,
    };
  },

  async captureIntent(intent: PaymentIntent): Promise<PaymentIntent> {
    return { ...intent, status: "succeeded" };
  },

  async cancelIntent(intent: PaymentIntent): Promise<PaymentIntent> {
    return { ...intent, status: "cancelled" };
  },

  async refund(input: { intentId: string; amountMinor: number }): Promise<RefundResult> {
    return {
      id: `rfnd_${input.intentId}`,
      status: "succeeded",
      amountMinor: input.amountMinor,
    };
  },

  async parseWebhook() {
    return null;
  },
};
