import Stripe from "stripe";
import type {
  CreatePaymentIntentInput,
  PaymentIntent,
  PaymentIntentStatus,
  PaymentProvider,
  PaymentWebhookEvent,
  RefundResult,
} from "./types";

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function mapIntentStatus(status: Stripe.PaymentIntent.Status): PaymentIntentStatus {
  switch (status) {
    case "requires_payment_method":
    case "requires_confirmation":
    case "requires_action":
      return "requires_action";
    case "processing":
    case "requires_capture":
      return "processing";
    case "succeeded":
      return "succeeded";
    case "canceled":
      return "cancelled";
    default:
      return "pending";
  }
}

function mapIntent(intent: Stripe.PaymentIntent): PaymentIntent {
  return {
    id: intent.id,
    provider: "stripe",
    status: mapIntentStatus(intent.status),
    amountMinor: intent.amount,
    currency: intent.currency,
    clientSecret: intent.client_secret ?? undefined,
  };
}

/**
 * Lazily constructed Stripe provider. Requires STRIPE_SECRET_KEY; webhooks
 * additionally require STRIPE_WEBHOOK_SECRET.
 */
export function createStripeProvider(): PaymentProvider {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY to enable card payments.");
  }

  const stripe = new Stripe(secretKey);

  return {
    id: "stripe",

    isConfigured() {
      return true;
    },

    async createIntent(input: CreatePaymentIntentInput): Promise<PaymentIntent> {
      const intent = await stripe.paymentIntents.create({
        amount: input.amountMinor,
        currency: input.currency,
        description: input.description,
        metadata: { ...input.metadata, orderId: input.orderId },
        automatic_payment_methods: { enabled: true },
      });
      return mapIntent(intent);
    },

    async captureIntent(intent: PaymentIntent): Promise<PaymentIntent> {
      const current = await stripe.paymentIntents.retrieve(intent.id);
      if (current.status === "requires_capture") {
        return mapIntent(await stripe.paymentIntents.capture(intent.id));
      }
      return mapIntent(current);
    },

    async cancelIntent(intent: PaymentIntent): Promise<PaymentIntent> {
      const current = await stripe.paymentIntents.retrieve(intent.id);
      if (current.status === "requires_payment_method" || current.status === "requires_capture") {
        return mapIntent(await stripe.paymentIntents.cancel(intent.id));
      }
      return mapIntent(current);
    },

    async refund(input: { intentId: string; amountMinor: number }): Promise<RefundResult> {
      const refund = await stripe.refunds.create({
        payment_intent: input.intentId,
        amount: input.amountMinor,
      });
      const status =
        refund.status === "succeeded"
          ? "succeeded"
          : refund.status === "failed"
            ? "failed"
            : "pending";
      return {
        id: refund.id,
        status,
        amountMinor: refund.amount ?? input.amountMinor,
      };
    },

    async parseWebhook(
      rawBody: string,
      signature: string | null,
    ): Promise<PaymentWebhookEvent | null> {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret || !signature) return null;

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } catch {
        return null;
      }

      const rawPaymentIntent =
        typeof event.data.object === "object" &&
        event.data.object !== null &&
        "payment_intent" in event.data.object
          ? (event.data.object.payment_intent as string | Stripe.PaymentIntent | null | undefined)
          : undefined;

      const paymentIntentId =
        typeof rawPaymentIntent === "string"
          ? rawPaymentIntent
          : rawPaymentIntent !== null && rawPaymentIntent !== undefined
            ? rawPaymentIntent.id
            : undefined;

      const objectId =
        typeof event.data.object === "object" && event.data.object !== null && "id" in event.data.object
          ? (event.data.object.id as string)
          : undefined;

      const orderId =
        typeof event.data.object === "object" &&
        event.data.object !== null &&
        "metadata" in event.data.object &&
        typeof event.data.object.metadata === "object" &&
        event.data.object.metadata !== null
          ? ((event.data.object.metadata as Record<string, string | undefined>).orderId ?? undefined)
          : undefined;

      return {
        provider: "stripe",
        type: event.type,
        orderId,
        paymentIntentId: paymentIntentId ?? (event.type.startsWith("payment_intent.") ? objectId : undefined),
      };
    },
  };
}
