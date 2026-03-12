/**
 * Stripe service
 *
 * Thin wrapper around the Stripe SDK. All Stripe interactions flow through here
 * so there is one place to configure, mock in tests, and swap behaviour.
 */

import Stripe from "stripe";

export type StripePaymentIntentResult = {
  paymentIntentId: string;
  clientSecret: string;
};

let _client: Stripe | null = null;

const getClient = (secretKey: string): Stripe => {
  if (!_client) {
    _client = new Stripe(secretKey, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return _client;
};

export const createPaymentIntent = async (input: {
  stripeSecretKey: string;
  amountCents: number;
  currency: string;
  orderId: string;
  customerEmail?: string;
  description?: string;
  metadata?: Record<string, string>;
}): Promise<StripePaymentIntentResult> => {
  const stripe = getClient(input.stripeSecretKey);

  const intent = await stripe.paymentIntents.create({
    amount: input.amountCents,
    currency: input.currency.toLowerCase(),
    description: input.description ?? `Order ${input.orderId}`,
    receipt_email: input.customerEmail,
    metadata: {
      orderId: input.orderId,
      ...input.metadata,
    },
    automatic_payment_methods: { enabled: true },
  });

  if (!intent.client_secret) {
    throw new Error(`Stripe did not return a client_secret for payment intent ${intent.id}`);
  }

  return {
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret,
  };
};

export const cancelPaymentIntent = async (input: {
  stripeSecretKey: string;
  paymentIntentId: string;
}): Promise<void> => {
  const stripe = getClient(input.stripeSecretKey);
  await stripe.paymentIntents.cancel(input.paymentIntentId);
};
