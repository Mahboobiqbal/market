import type { PaymentMethod } from "@/generated/prisma/enums";
import { codProvider } from "./cod";
import { createStripeProvider, isStripeConfigured } from "./stripe";
import type { PaymentProvider, PaymentProviderId } from "./types";

export * from "./types";

let stripeProvider: PaymentProvider | null = null;

export function isPaymentProviderConfigured(id: PaymentProviderId): boolean {
  if (id === "cod") return codProvider.isConfigured();
  return isStripeConfigured();
}

export function getPaymentProvider(id: PaymentProviderId): PaymentProvider {
  if (id === "cod") return codProvider;

  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY to enable card payments.");
  }
  stripeProvider ??= createStripeProvider();
  return stripeProvider;
}

/** Bridge from the Prisma PaymentMethod enum to a provider id. */
export function providerForMethod(method: PaymentMethod): PaymentProviderId {
  return method === "COD" ? "cod" : "stripe";
}
