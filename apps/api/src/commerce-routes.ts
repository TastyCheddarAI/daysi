import { createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import {
  checkoutConfirmRequestSchema,
  checkoutConfirmResponseSchema,
  checkoutQuoteRequestSchema,
  checkoutQuoteResponseSchema,
  membershipPlansResponseSchema,
  membershipSubscriptionCreateRequestSchema,
  membershipSubscriptionCreateResponseSchema,
  membershipSubscriptionResponseSchema,
  membershipSubscriptionsResponseSchema,
  orderResponseSchema,
  ordersResponseSchema,
  refundOrderRequestSchema,
  stripeWebhookEventSchema,
  stripeWebhookResponseSchema,
} from "../../../packages/contracts/src";
import {
  activateMembershipSubscription,
  buildCheckoutQuote,
  buildEducationPurchaseProvisioningEffects,
  buildMembershipLearningProvisioningEffects,
  buildMembershipProvisioningEffects,
  buildMembershipServiceAllowanceApplications,
  buildMembershipUsageProvisioningEffects,
  buildRemainingServicePackageBalances,
  buildServicePackageProvisioningEffects,
  buildServicePackageRedemptionApplications,
  buildServicePackageUsageProvisioningEffects,
  calculateAccountCreditBalance,
  cancelMembershipSubscription,
  createCreditEntry,
  createLearningEntitlementFromProvisioningEffect,
  createMembershipUsageRecord,
  createOrderFromQuote,
  createPendingMembershipSubscription,
  createPendingServicePackagePurchase,
  createServicePackageUsageRecord,
  getServicePackageBySlug,
  getEducationOfferBySlug,
  getMembershipPlanBySlug,
  listMembershipPlansForLocation,
  listProductsForLocation,
  markOrderPaid,
  markOrderPaymentFailed,
  markOrderRefunded,
  reverseMembershipUsageRecord,
  reverseServicePackageUsageRecord,
  revokeServicePackagePurchase,
  activateServicePackagePurchase,
  type AppActor,
  type OrderRecord,
  type QuoteItemInput,
} from "../../../packages/domain/src";

import { getRuntimeClinicData } from "./clinic-runtime";
import type { AppEnv } from "./config";
import { recordPaidBookingMetricEvents } from "./analytics-support";
import { recordCustomerEvent } from "./customer-context-support";
import { readJsonBody, readRawBody, sendError, sendJson } from "./http";
import { isLocationFeatureEnabled } from "./location-feature-support";
import type { AppRepositories } from "./persistence/app-repositories";
import type {
  StoredBookingRecord,
  StoredOrderRecord,
} from "./persistence/commerce-repository";
import { processReferralQualificationForOrder } from "./referral-support";
import {
  revokeLearningEntitlementsBySourceOrder,
  saveLearningEntitlement,
} from "./bootstrap-store";

const matchOrderPath = (
  pathname: string,
): { type: "get"; orderId: string } | { type: "refund"; orderId: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 3 && segments[0] === "v1" && segments[1] === "orders") {
    return {
      type: "get",
      orderId: segments[2],
    };
  }

  if (
    segments.length === 4 &&
    segments[0] === "v1" &&
    segments[1] === "orders" &&
    segments[3] === "refund"
  ) {
    return {
      type: "refund",
      orderId: segments[2],
    };
  }

  return null;
};

const matchMembershipSubscriptionPath = (
  pathname: string,
): { subscriptionId: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 4 &&
    segments[0] === "v1" &&
    segments[1] === "memberships" &&
    segments[2] === "subscriptions"
  ) {
    return {
      subscriptionId: segments[3],
    };
  }

  return null;
};

const requireIdempotencyKey = (request: IncomingMessage): string | null => {
  const header = request.headers["idempotency-key"];

  if (typeof header === "string" && header.trim().length > 0) {
    return header.trim();
  }

  return null;
};

const respondFromIdempotencyCache = async (
  repositories: AppRepositories,
  response: ServerResponse,
  scope: string,
  key: string,
): Promise<boolean> => {
  const cached = await repositories.reliability.idempotency.get(scope, key);
  if (!cached) {
    return false;
  }

  sendJson(response, cached.statusCode, cached.payload);
  return true;
};

const canAccessStoredBooking = (input: {
  stored: StoredBookingRecord;
  actor: AppActor | null;
  managementToken?: string;
}): boolean =>
  !!(
    input.actor?.roles.some((role) => ["staff", "admin", "owner"].includes(role)) ||
    (input.actor?.userId && input.stored.booking.actorUserId === input.actor.userId) ||
    (input.managementToken && input.managementToken === input.stored.managementToken)
  );

const canAccessStoredOrder = (input: {
  stored: StoredOrderRecord;
  actor: AppActor | null;
  managementToken?: string;
}): boolean =>
  !!(
    input.actor?.roles.some((role) => ["staff", "admin", "owner"].includes(role)) ||
    (input.actor?.userId && input.stored.order.actorUserId === input.actor.userId) ||
    (input.managementToken && input.managementToken === input.stored.managementToken)
  );

const resolveQuoteItems = async (input: {
  env: AppEnv;
  repositories: AppRepositories;
  actor: AppActor | null;
  locationSlug: string;
  items: Array<
    | { kind: "booking"; bookingId: string; managementToken?: string }
    | { kind: "membershipPlan"; planSlug: string }
    | { kind: "product"; productSlug: string; quantity: number }
    | { kind: "servicePackage"; packageSlug: string; quantity: number }
    | { kind: "educationOffer"; offerSlug: string; quantity: number }
  >;
}): Promise<QuoteItemInput[]> => {
  const clinicData = getRuntimeClinicData(input.env);

  return Promise.all(input.items.map(async (item) => {
    if (item.kind === "booking") {
      const storedBooking = await input.repositories.commerce.bookings.getStored(item.bookingId);
      if (!storedBooking) {
        throw new Error(`Booking ${item.bookingId} not found.`);
      }

      if (
        !canAccessStoredBooking({
          stored: storedBooking,
          actor: input.actor,
          managementToken: item.managementToken,
        })
      ) {
        throw new Error(`Booking ${item.bookingId} is not authorized for checkout.`);
      }

      return {
        kind: "booking",
        booking: storedBooking.booking,
      };
    }

    if (item.kind === "membershipPlan") {
      if (!isLocationFeatureEnabled(input.env, input.locationSlug, "memberships")) {
        throw new Error("Memberships are not enabled at this location.");
      }
      const plan = getMembershipPlanBySlug(
        clinicData.membershipPlans,
        input.locationSlug,
        item.planSlug,
      );

      if (!plan) {
        throw new Error(`Membership plan ${item.planSlug} not found.`);
      }

      return {
        kind: "membershipPlan",
        plan,
      };
    }

    if (item.kind === "product") {
      const product = listProductsForLocation(clinicData.catalog, input.locationSlug).find(
        (entry) => entry.slug === item.productSlug,
      );

      if (!product) {
        throw new Error(`Product ${item.productSlug} not found.`);
      }

      return {
        kind: "product",
        product,
        quantity: item.quantity,
      };
    }

    if (item.kind === "servicePackage") {
      const servicePackage = getServicePackageBySlug(
        clinicData.catalog.servicePackages,
        input.locationSlug,
        item.packageSlug,
      );

      if (!servicePackage) {
        throw new Error(`Service package ${item.packageSlug} not found.`);
      }

      return {
        kind: "servicePackage",
        servicePackage,
        quantity: item.quantity,
      };
    }

    const offer = getEducationOfferBySlug(
      clinicData.catalog,
      input.locationSlug,
      item.offerSlug,
    );
    if (!isLocationFeatureEnabled(input.env, input.locationSlug, "education")) {
      throw new Error("Education is not enabled at this location.");
    }

    if (!offer) {
      throw new Error(`Education offer ${item.offerSlug} not found.`);
    }

    return {
      kind: "educationOffer",
      offer,
      quantity: item.quantity,
    };
  }));
};

const parseStripeSignature = (
  headerValue: string,
): { timestamp: string; signature: string } | null => {
  const parts = headerValue.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signature = parts.find((part) => part.startsWith("v1="))?.slice(3);

  if (!timestamp || !signature) {
    return null;
  }

  return {
    timestamp,
    signature,
  };
};

const verifyStripeSignature = (input: {
  rawBody: string;
  signatureHeader: string | undefined;
  secret: string | undefined;
}): boolean => {
  if (!input.secret) {
    return true;
  }

  if (!input.signatureHeader) {
    return false;
  }

  const parsed = parseStripeSignature(input.signatureHeader);
  if (!parsed) {
    return false;
  }

  const signedPayload = `${parsed.timestamp}.${input.rawBody}`;
  const expectedSignature = createHmac("sha256", input.secret)
    .update(signedPayload, "utf8")
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(parsed.signature, "utf8"),
      Buffer.from(expectedSignature, "utf8"),
    );
  } catch {
    return false;
  }
};

const getAvailableAccountCreditCents = async (
  repositories: AppRepositories,
  actor: AppActor | null,
): Promise<number> => {
  if (!actor) {
    return 0;
  }

  const entries = await repositories.commerce.credits.listForActor({
    actorUserId: actor.userId,
    actorEmail: actor.email,
  });

  return Math.max(0, calculateAccountCreditBalance(entries).amountCents);
};

const resolveServiceAllowanceApplications = async (input: {
  env: AppEnv;
  repositories: AppRepositories;
  actor: AppActor | null;
  quoteItems: QuoteItemInput[];
}) => {
  if (!input.actor) {
    return [];
  }

  const bookings = input.quoteItems
    .filter(
      (item): item is Extract<QuoteItemInput, { kind: "booking" }> =>
        item.kind === "booking",
    )
    .map((item) => item.booking);

  if (bookings.length === 0) {
    return [];
  }

  const clinicData = getRuntimeClinicData(input.env);
  const subscriptions =
    await input.repositories.commerce.memberships.listSubscriptionsForActor({
    actorUserId: input.actor.userId,
    actorEmail: input.actor.email,
  });

  if (subscriptions.length === 0) {
    return [];
  }

  return buildMembershipServiceAllowanceApplications({
    plans: clinicData.membershipPlans,
    subscriptions,
    usageRecords: await input.repositories.commerce.memberships.listAllUsageRecords(),
    bookings,
  });
};

const resolvePackageRedemptionApplications = async (input: {
  env: AppEnv;
  repositories: AppRepositories;
  actor: AppActor | null;
  quoteItems: QuoteItemInput[];
}) => {
  if (!input.actor) {
    return [];
  }

  const bookings = input.quoteItems
    .filter(
      (item): item is Extract<QuoteItemInput, { kind: "booking" }> =>
        item.kind === "booking",
    )
    .map((item) => item.booking);

  if (bookings.length === 0) {
    return [];
  }

  const clinicData = getRuntimeClinicData(input.env);
  const purchases = await input.repositories.commerce.packages.listPurchasesForActor({
    actorUserId: input.actor.userId,
    actorEmail: input.actor.email,
  });

  if (purchases.length === 0) {
    return [];
  }

  return buildServicePackageRedemptionApplications({
    offers: clinicData.catalog.servicePackages,
    purchases,
    usageRecords: await input.repositories.commerce.packages.listAllUsageRecords(),
    bookings,
  });
};

const recordOrderLifecycleEvent = async (
  repositories: AppRepositories,
  order: OrderRecord,
  eventType: "order.paid" | "order.refunded" | "order.payment_failed",
  occurredAt?: string,
): Promise<void> => {
  await recordCustomerEvent({
    repositories,
    locationSlug: order.locationSlug,
    customerEmail: order.customer.email,
    customerName: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
    actorUserId: order.actorUserId,
    source: "commerce",
    eventType,
    payload: {
      orderId: order.id,
      totalAmountCents: order.totalAmount.amountCents,
      revenueStreams: order.revenueBreakdown.map((entry) => entry.revenueStream),
    },
    occurredAt,
  });
};

const redeemOrderAccountCredit = async (input: {
  repositories: AppRepositories;
  orderId: string;
  actor: AppActor | null;
  now?: string;
}): Promise<void> => {
  const storedOrder = await input.repositories.commerce.orders.getStored(input.orderId);
  if (!storedOrder) {
    return;
  }

  if (
    storedOrder.order.appliedAccountCreditAmount.amountCents <= 0 ||
    (await input.repositories.commerce.credits.hasEntryForOrderAndType(
      input.orderId,
      "redeem",
    ))
  ) {
    return;
  }

  await input.repositories.commerce.credits.saveEntry(
    createCreditEntry({
      locationSlug: storedOrder.order.locationSlug,
      type: "redeem",
      amount: storedOrder.order.appliedAccountCreditAmount,
      customerEmail: storedOrder.order.customer.email,
      actorUserId: storedOrder.order.actorUserId ?? input.actor?.userId,
      sourceOrderId: input.orderId,
      note: "Applied to order checkout.",
      now: input.now,
    }),
  );
};

const restoreOrderAccountCredit = async (
  repositories: AppRepositories,
  orderId: string,
  now = new Date().toISOString(),
): Promise<void> => {
  const storedOrder = await repositories.commerce.orders.getStored(orderId);
  if (!storedOrder) {
    return;
  }

  if (
    storedOrder.order.appliedAccountCreditAmount.amountCents <= 0 ||
    !(await repositories.commerce.credits.hasEntryForOrderAndType(orderId, "redeem")) ||
    (await repositories.commerce.credits.hasEntryForOrderAndType(orderId, "restore"))
  ) {
    return;
  }

  await repositories.commerce.credits.saveEntry(
    createCreditEntry({
      locationSlug: storedOrder.order.locationSlug,
      type: "restore",
      amount: storedOrder.order.appliedAccountCreditAmount,
      customerEmail: storedOrder.order.customer.email,
      actorUserId: storedOrder.order.actorUserId,
      sourceOrderId: orderId,
      note: "Restored from failed or refunded order.",
      now,
    }),
  );
};

const applyOrderProvisioningEffects = async (
  repositories: AppRepositories,
  orderId: string,
  now = new Date().toISOString(),
): Promise<void> => {
  const storedOrder = await repositories.commerce.orders.getStored(orderId);
  if (!storedOrder) {
    return;
  }

  for (const effect of storedOrder.order.provisioning) {
    if (effect.kind === "activate-membership-subscription") {
      const subscription = await repositories.commerce.memberships.getSubscription(
        effect.subscriptionId,
      );
      if (!subscription) {
        continue;
      }

      await repositories.commerce.memberships.updateSubscription(
        activateMembershipSubscription(
          {
            ...subscription,
            sourceOrderId: subscription.sourceOrderId ?? storedOrder.order.id,
          },
          now,
        ),
      );
      await recordCustomerEvent({
        repositories,
        locationSlug: subscription.locationSlug,
        customerEmail: subscription.customerEmail,
        customerName: subscription.customerName,
        actorUserId: subscription.actorUserId,
        source: "commerce",
        eventType: "membership.subscription_activated",
        payload: {
          subscriptionId: subscription.id,
          planSlug: subscription.planSlug,
          sourceOrderId: storedOrder.order.id,
        },
        occurredAt: now,
      });
      continue;
    }

    if (effect.kind === "activate-service-package-purchase") {
      const purchase = await repositories.commerce.packages.getPurchase(
        effect.packagePurchaseId,
      );
      if (!purchase) {
        continue;
      }

      await repositories.commerce.packages.updatePurchase(
        activateServicePackagePurchase(
          {
            ...purchase,
            sourceOrderId: purchase.sourceOrderId ?? storedOrder.order.id,
          },
          now,
        ),
      );
      await recordCustomerEvent({
        repositories,
        locationSlug: purchase.locationSlug,
        customerEmail: purchase.customerEmail,
        customerName: purchase.customerName,
        actorUserId: purchase.actorUserId,
        source: "commerce",
        eventType: "package.purchase_activated",
        payload: {
          packagePurchaseId: purchase.id,
          packageSlug: purchase.packageSlug,
          sourceOrderId: storedOrder.order.id,
        },
        occurredAt: now,
      });
      continue;
    }

    if (effect.kind === "consume-membership-service-allowance") {
      if (
        await repositories.commerce.memberships.hasUsageRecord({
          sourceOrderId: storedOrder.order.id,
          subscriptionId: effect.subscriptionId,
          serviceSlug: effect.serviceSlug,
          bookingId: effect.bookingId,
        })
      ) {
        continue;
      }

      await repositories.commerce.memberships.saveUsageRecord(
        createMembershipUsageRecord({
          subscriptionId: effect.subscriptionId,
          planSlug: effect.planSlug,
          serviceSlug: effect.serviceSlug,
          bookingId: effect.bookingId,
          quantity: effect.quantity,
          sourceOrderId: storedOrder.order.id,
          now,
        }),
      );
      continue;
    }

    if (effect.kind === "consume-service-package-credit") {
      if (
        await repositories.commerce.packages.hasUsageRecord({
          sourceOrderId: storedOrder.order.id,
          packagePurchaseId: effect.packagePurchaseId,
          serviceSlug: effect.serviceSlug,
          bookingId: effect.bookingId,
        })
      ) {
        continue;
      }

      await repositories.commerce.packages.saveUsageRecord(
        createServicePackageUsageRecord({
          packagePurchaseId: effect.packagePurchaseId,
          packageSlug: effect.packageSlug,
          serviceSlug: effect.serviceSlug,
          bookingId: effect.bookingId,
          quantity: effect.quantity,
          sourceOrderId: storedOrder.order.id,
          now,
        }),
      );
      await recordCustomerEvent({
        repositories,
        locationSlug: storedOrder.order.locationSlug,
        customerEmail: storedOrder.order.customer.email,
        customerName: `${storedOrder.order.customer.firstName} ${storedOrder.order.customer.lastName}`.trim(),
        actorUserId: storedOrder.order.actorUserId,
        source: "commerce",
        eventType: "package.credit_consumed",
        payload: {
          packagePurchaseId: effect.packagePurchaseId,
          packageSlug: effect.packageSlug,
          bookingId: effect.bookingId,
          serviceSlug: effect.serviceSlug,
          quantity: effect.quantity,
        },
        occurredAt: now,
      });
      continue;
    }

    saveLearningEntitlement(
      createLearningEntitlementFromProvisioningEffect(effect, {
        sourceOrderId: storedOrder.order.id,
        now,
      }),
    );
  }
};

const reverseOrderProvisioningEffects = async (
  repositories: AppRepositories,
  orderId: string,
  now = new Date().toISOString(),
): Promise<void> => {
  const storedOrder = await repositories.commerce.orders.getStored(orderId);
  if (!storedOrder) {
    return;
  }

  for (const effect of storedOrder.order.provisioning) {
    if (effect.kind === "activate-membership-subscription") {
      const subscription = await repositories.commerce.memberships.getSubscription(
        effect.subscriptionId,
      );
      if (!subscription || subscription.status === "cancelled") {
        continue;
      }

      await repositories.commerce.memberships.updateSubscription(
        cancelMembershipSubscription(subscription, now),
      );
      await recordCustomerEvent({
        repositories,
        locationSlug: subscription.locationSlug,
        customerEmail: subscription.customerEmail,
        customerName: subscription.customerName,
        actorUserId: subscription.actorUserId,
        source: "commerce",
        eventType: "membership.subscription_cancelled",
        payload: {
          subscriptionId: subscription.id,
          planSlug: subscription.planSlug,
          sourceOrderId: orderId,
        },
        occurredAt: now,
      });
      continue;
    }

    if (effect.kind !== "activate-service-package-purchase") {
      continue;
    }

    const purchase = await repositories.commerce.packages.getPurchase(
      effect.packagePurchaseId,
    );
    if (!purchase || purchase.status === "revoked") {
      continue;
    }

    await repositories.commerce.packages.updatePurchase(
      revokeServicePackagePurchase(purchase, now),
    );
    await recordCustomerEvent({
      repositories,
      locationSlug: purchase.locationSlug,
      customerEmail: purchase.customerEmail,
      customerName: purchase.customerName,
      actorUserId: purchase.actorUserId,
      source: "commerce",
      eventType: "package.purchase_revoked",
      payload: {
        packagePurchaseId: purchase.id,
        packageSlug: purchase.packageSlug,
        sourceOrderId: orderId,
      },
      occurredAt: now,
    });
  }

  await repositories.commerce.memberships.reverseUsageBySourceOrder(orderId, (usage) =>
    reverseMembershipUsageRecord(usage, now),
  );
  await repositories.commerce.packages.reverseUsageBySourceOrder(orderId, (usage) =>
    reverseServicePackageUsageRecord(usage, now),
  );

  revokeLearningEntitlementsBySourceOrder(orderId, (entitlement) =>
    ({
      ...entitlement,
      status: "revoked",
      revokedAt: now,
    }),
  );
};

export const handleCommerceAndMembershipRoutes = async (input: {
  method: string;
  pathname: string;
  request: IncomingMessage;
  response: ServerResponse;
  env: AppEnv;
  actor: AppActor | null;
  repositories: AppRepositories;
}): Promise<boolean> => {
  if (input.method === "GET" && input.pathname === "/v1/memberships/plans") {
    const clinicData = getRuntimeClinicData(input.env);
    const locationSlug =
      new URL(
        input.request.url ?? "/",
        `http://${input.request.headers.host ?? `${input.env.DAYSI_API_HOST}:${input.env.DAYSI_API_PORT}`}`,
      ).searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    if (!isLocationFeatureEnabled(input.env, locationSlug, "memberships")) {
      sendError(input.response, 409, "conflict", "Memberships are not enabled at this location.");
      return true;
    }

    sendJson(
      input.response,
      200,
      membershipPlansResponseSchema.parse({
        ok: true,
        data: {
          locationSlug,
          plans: listMembershipPlansForLocation(clinicData.membershipPlans, locationSlug),
        },
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/me/memberships") {
    if (!input.actor) {
      sendError(input.response, 401, "unauthorized", "Authentication is required.");
      return true;
    }

      sendJson(
        input.response,
        200,
        membershipSubscriptionsResponseSchema.parse({
          ok: true,
          data: {
            subscriptions:
              await input.repositories.commerce.memberships.listSubscriptionsForActor({
                actorUserId: input.actor.userId,
                actorEmail: input.actor.email,
              }),
          },
        }),
      );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/me/orders") {
    if (!input.actor) {
      sendError(input.response, 401, "unauthorized", "Authentication is required.");
      return true;
    }

      sendJson(
        input.response,
        200,
        ordersResponseSchema.parse({
          ok: true,
          data: {
            orders: await input.repositories.commerce.orders.listForActor({
              actorUserId: input.actor.userId,
              actorEmail: input.actor.email,
            }),
          },
        }),
      );
    return true;
  }

  if (input.method === "POST" && input.pathname === "/v1/checkout/quote") {
    try {
      const payload = await readJsonBody(input.request, (body) =>
        checkoutQuoteRequestSchema.parse(body),
      );
      const clinicData = getRuntimeClinicData(input.env);
      const quoteItems = await resolveQuoteItems({
        env: input.env,
        repositories: input.repositories,
        actor: input.actor,
        locationSlug: payload.locationSlug,
        items: payload.items,
      });

      const quote = buildCheckoutQuote({
        locationSlug: payload.locationSlug,
        items: quoteItems,
        couponCodes: payload.couponCodes,
        availableCoupons: clinicData.coupons,
        serviceAllowanceApplications: await resolveServiceAllowanceApplications({
          env: input.env,
          repositories: input.repositories,
          actor: input.actor,
          quoteItems,
        }),
        packageRedemptionApplications: await resolvePackageRedemptionApplications({
          env: input.env,
          repositories: input.repositories,
          actor: input.actor,
          quoteItems,
        }),
        applyAccountCredit: payload.applyAccountCredit,
        accountCreditBalanceCents: await getAvailableAccountCreditCents(
          input.repositories,
          input.actor,
        ),
      });

      sendJson(
        input.response,
        200,
        checkoutQuoteResponseSchema.parse({
          ok: true,
          data: {
            quote,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid checkout quote request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (input.method === "POST" && input.pathname === "/v1/cart/coupons") {
    try {
      const payload = await readJsonBody(input.request, (body) =>
        checkoutQuoteRequestSchema.parse(body),
      );
      const clinicData = getRuntimeClinicData(input.env);
      const quoteItems = await resolveQuoteItems({
        env: input.env,
        repositories: input.repositories,
        actor: input.actor,
        locationSlug: payload.locationSlug,
        items: payload.items,
      });
      const quote = buildCheckoutQuote({
        locationSlug: payload.locationSlug,
        items: quoteItems,
        couponCodes: payload.couponCodes,
        availableCoupons: clinicData.coupons,
        serviceAllowanceApplications: await resolveServiceAllowanceApplications({
          env: input.env,
          repositories: input.repositories,
          actor: input.actor,
          quoteItems,
        }),
        packageRedemptionApplications: await resolvePackageRedemptionApplications({
          env: input.env,
          repositories: input.repositories,
          actor: input.actor,
          quoteItems,
        }),
        applyAccountCredit: payload.applyAccountCredit,
        accountCreditBalanceCents: await getAvailableAccountCreditCents(
          input.repositories,
          input.actor,
        ),
      });

      sendJson(
        input.response,
        200,
        checkoutQuoteResponseSchema.parse({
          ok: true,
          data: {
            quote,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid coupon application request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (input.method === "POST" && input.pathname === "/v1/checkout/confirm") {
    const idempotencyKey = requireIdempotencyKey(input.request);
    if (!idempotencyKey) {
      sendError(
        input.response,
        400,
        "bad_request",
        "Idempotency key is required for checkout confirmation.",
      );
      return true;
    }

    if (
      await respondFromIdempotencyCache(
        input.repositories,
        input.response,
        "checkout.confirm",
        idempotencyKey,
      )
    ) {
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        checkoutConfirmRequestSchema.parse(body),
      );
      const quoteItems = await resolveQuoteItems({
        env: input.env,
        repositories: input.repositories,
        actor: input.actor,
        locationSlug: payload.locationSlug,
        items: payload.items,
      });
      const serviceAllowanceApplications = await resolveServiceAllowanceApplications({
        env: input.env,
        repositories: input.repositories,
        actor: input.actor,
        quoteItems,
      });
      const packageRedemptionApplications = await resolvePackageRedemptionApplications({
        env: input.env,
        repositories: input.repositories,
        actor: input.actor,
        quoteItems,
      });
      const quote = buildCheckoutQuote({
        locationSlug: payload.locationSlug,
        items: quoteItems,
        couponCodes: payload.couponCodes,
        availableCoupons: getRuntimeClinicData(input.env).coupons,
        serviceAllowanceApplications,
        packageRedemptionApplications,
        applyAccountCredit: payload.applyAccountCredit,
        accountCreditBalanceCents: await getAvailableAccountCreditCents(
          input.repositories,
          input.actor,
        ),
      });

      const pendingSubscriptions = quoteItems
        .filter((item): item is Extract<QuoteItemInput, { kind: "membershipPlan" }> => item.kind === "membershipPlan")
        .map((item) =>
          createPendingMembershipSubscription({
            plan: item.plan,
            customer: payload.customer,
            actorUserId: input.actor?.userId,
          }),
        );

      const pendingPackagePurchases = quoteItems
        .filter(
          (item): item is Extract<QuoteItemInput, { kind: "servicePackage" }> =>
            item.kind === "servicePackage",
        )
        .flatMap((item) =>
          Array.from({ length: item.quantity }, () =>
            createPendingServicePackagePurchase({
              offer: item.servicePackage,
              customer: payload.customer,
              actorUserId: input.actor?.userId,
            }),
          ),
        );

      for (const subscription of pendingSubscriptions) {
        await input.repositories.commerce.memberships.saveSubscription(subscription);
      }
      for (const purchase of pendingPackagePurchases) {
        await input.repositories.commerce.packages.savePurchase(purchase);
        await recordCustomerEvent({
          repositories: input.repositories,
          locationSlug: purchase.locationSlug,
          customerEmail: purchase.customerEmail,
          customerName: purchase.customerName,
          actorUserId: purchase.actorUserId,
          source: "commerce",
          eventType: "package.purchase_created",
          payload: {
            packagePurchaseId: purchase.id,
            packageSlug: purchase.packageSlug,
            status: purchase.status,
          },
          occurredAt: purchase.createdAt,
        });
      }

      const educationOffers = quoteItems
        .filter(
          (
            item,
          ): item is Extract<QuoteItemInput, { kind: "educationOffer" }> =>
            item.kind === "educationOffer",
        )
        .map((item) => item.offer);
      const membershipPlans = quoteItems
        .filter(
          (
            item,
          ): item is Extract<QuoteItemInput, { kind: "membershipPlan" }> =>
            item.kind === "membershipPlan",
        )
        .map((item) => item.plan);

      const confirmed = createOrderFromQuote({
        quote,
        customer: payload.customer,
        actorUserId: input.actor?.userId,
        provisioning: [
          ...buildMembershipProvisioningEffects(pendingSubscriptions),
          ...buildMembershipUsageProvisioningEffects(serviceAllowanceApplications),
          ...buildServicePackageProvisioningEffects(pendingPackagePurchases),
          ...buildServicePackageUsageProvisioningEffects(packageRedemptionApplications),
          ...buildEducationPurchaseProvisioningEffects({
            offers: educationOffers,
            customer: payload.customer,
            actorUserId: input.actor?.userId,
          }),
          ...buildMembershipLearningProvisioningEffects({
            plans: membershipPlans,
            subscriptions: pendingSubscriptions,
            offers: getRuntimeClinicData(input.env).catalog.educationOffers,
            customer: payload.customer,
            actorUserId: input.actor?.userId,
          }),
        ],
      });

      for (const purchase of pendingPackagePurchases) {
        await input.repositories.commerce.packages.updatePurchase({
          ...purchase,
          sourceOrderId: confirmed.order.id,
        });
      }

      await input.repositories.commerce.orders.save(
        confirmed.order,
        confirmed.managementToken,
      );
      await redeemOrderAccountCredit({
        repositories: input.repositories,
        orderId: confirmed.order.id,
        actor: input.actor,
      });

      if (confirmed.order.status === "paid") {
        await applyOrderProvisioningEffects(
          input.repositories,
          confirmed.order.id,
          confirmed.order.paidAt,
        );
        await processReferralQualificationForOrder(
          input.repositories,
          confirmed.order.id,
          confirmed.order.paidAt,
        );
        await recordOrderLifecycleEvent(
          input.repositories,
          confirmed.order,
          "order.paid",
          confirmed.order.paidAt,
        );
        await recordPaidBookingMetricEvents({
          repositories: input.repositories,
          order: confirmed.order,
          bookings: await input.repositories.commerce.bookings.listAll(),
          occurredAt: confirmed.order.paidAt,
        });
      }

      const responsePayload = checkoutConfirmResponseSchema.parse({
        ok: true,
        data: {
          order: confirmed.order,
          paymentSession: confirmed.paymentSession,
          managementToken: confirmed.managementToken,
        },
      });

      await input.repositories.reliability.idempotency.save({
        scope: "checkout.confirm",
        key: idempotencyKey,
        response: {
          statusCode: 201,
          payload: responsePayload,
        },
      });
      sendJson(input.response, 201, responsePayload);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid checkout confirm request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (input.method === "POST" && input.pathname === "/v1/memberships/subscriptions") {
    const idempotencyKey = requireIdempotencyKey(input.request);
    if (!idempotencyKey) {
      sendError(
        input.response,
        400,
        "bad_request",
        "Idempotency key is required for membership subscription creation.",
      );
      return true;
    }

    if (
      await respondFromIdempotencyCache(
        input.repositories,
        input.response,
        "memberships.subscriptions.create",
        idempotencyKey,
      )
    ) {
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        membershipSubscriptionCreateRequestSchema.parse(body),
      );
      if (!isLocationFeatureEnabled(input.env, payload.locationSlug, "memberships")) {
        sendError(input.response, 409, "conflict", "Memberships are not enabled at this location.");
        return true;
      }
      const clinicData = getRuntimeClinicData(input.env);
      const plan = getMembershipPlanBySlug(
        clinicData.membershipPlans,
        payload.locationSlug,
        payload.planSlug,
      );

      if (!plan) {
        sendError(input.response, 404, "not_found", "Membership plan not found.");
        return true;
      }

      const subscription = createPendingMembershipSubscription({
        plan,
        customer: payload.customer,
        actorUserId: input.actor?.userId,
      });
      await input.repositories.commerce.memberships.saveSubscription(subscription);
      await recordCustomerEvent({
        repositories: input.repositories,
        locationSlug: subscription.locationSlug,
        customerEmail: subscription.customerEmail,
        customerName: subscription.customerName,
        actorUserId: subscription.actorUserId,
        source: "commerce",
        eventType: "membership.subscription_created",
        payload: {
          subscriptionId: subscription.id,
          planSlug: subscription.planSlug,
          status: subscription.status,
        },
        occurredAt: subscription.createdAt,
      });

      const quote = buildCheckoutQuote({
        locationSlug: payload.locationSlug,
        items: [{ kind: "membershipPlan", plan }],
        couponCodes: payload.couponCodes,
        availableCoupons: clinicData.coupons,
        applyAccountCredit: payload.applyAccountCredit,
        accountCreditBalanceCents: await getAvailableAccountCreditCents(
          input.repositories,
          input.actor,
        ),
      });
      const confirmed = createOrderFromQuote({
        quote,
        customer: payload.customer,
        actorUserId: input.actor?.userId,
        provisioning: [
          ...buildMembershipProvisioningEffects([subscription]),
          ...buildMembershipLearningProvisioningEffects({
            plans: [plan],
            subscriptions: [subscription],
            offers: clinicData.catalog.educationOffers,
            customer: payload.customer,
            actorUserId: input.actor?.userId,
          }),
        ],
      });
      await input.repositories.commerce.memberships.updateSubscription({
        ...subscription,
        sourceOrderId: confirmed.order.id,
      });
      await input.repositories.commerce.orders.save(
        confirmed.order,
        confirmed.managementToken,
      );
      await redeemOrderAccountCredit({
        repositories: input.repositories,
        orderId: confirmed.order.id,
        actor: input.actor,
      });

      if (confirmed.order.status === "paid") {
        await applyOrderProvisioningEffects(
          input.repositories,
          confirmed.order.id,
          confirmed.order.paidAt,
        );
        await processReferralQualificationForOrder(
          input.repositories,
          confirmed.order.id,
          confirmed.order.paidAt,
        );
        await recordOrderLifecycleEvent(
          input.repositories,
          confirmed.order,
          "order.paid",
          confirmed.order.paidAt,
        );
        await recordPaidBookingMetricEvents({
          repositories: input.repositories,
          order: confirmed.order,
          bookings: await input.repositories.commerce.bookings.listAll(),
          occurredAt: confirmed.order.paidAt,
        });
      }

      const responsePayload = membershipSubscriptionCreateResponseSchema.parse({
        ok: true,
        data: {
          subscription: {
            ...subscription,
            sourceOrderId: confirmed.order.id,
          },
          orderId: confirmed.order.id,
          paymentIntentId: confirmed.paymentSession.paymentIntentId,
        },
      });
      await input.repositories.reliability.idempotency.save({
        scope: "memberships.subscriptions.create",
        key: idempotencyKey,
        response: {
          statusCode: 201,
          payload: responsePayload,
        },
      });
      sendJson(input.response, 201, responsePayload);
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid membership subscription request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  const membershipSubscriptionMatch = matchMembershipSubscriptionPath(input.pathname);
  if (membershipSubscriptionMatch && input.method === "GET") {
    const subscription = await input.repositories.commerce.memberships.getSubscription(
      membershipSubscriptionMatch.subscriptionId,
    );
    if (!subscription) {
      sendError(input.response, 404, "not_found", "Membership subscription not found.");
      return true;
    }

    const canAccess =
      input.actor?.roles.some((role) => ["staff", "admin", "owner"].includes(role)) ||
      (input.actor?.userId && subscription.actorUserId === input.actor.userId) ||
      (input.actor?.email && subscription.customerEmail === input.actor.email);

    if (!canAccess) {
      sendError(input.response, 403, "forbidden", "Membership access is not authorized.");
      return true;
    }

    sendJson(
      input.response,
      200,
      membershipSubscriptionResponseSchema.parse({
        ok: true,
        data: {
          subscription,
        },
      }),
    );
    return true;
  }

  const orderMatch = matchOrderPath(input.pathname);
  if (orderMatch) {
    const storedOrder = await input.repositories.commerce.orders.getStored(
      orderMatch.orderId,
    );
    if (!storedOrder) {
      sendError(input.response, 404, "not_found", "Order not found.");
      return true;
    }

    if (orderMatch.type === "get" && input.method === "GET") {
      const managementToken = input.request.headers["x-order-token"];
      const canAccess = canAccessStoredOrder({
        stored: storedOrder,
        actor: input.actor,
        managementToken: typeof managementToken === "string" ? managementToken : undefined,
      });

      if (!canAccess) {
        sendError(input.response, 403, "forbidden", "Order access is not authorized.");
        return true;
      }

      sendJson(
        input.response,
        200,
        orderResponseSchema.parse({
          ok: true,
          data: {
            order: storedOrder.order,
          },
        }),
      );
      return true;
    }

    if (orderMatch.type === "refund" && input.method === "POST") {
      if (!input.actor?.roles.some((role) => ["admin", "owner"].includes(role))) {
        sendError(input.response, 403, "forbidden", "Refund access is restricted.");
        return true;
      }

      const idempotencyKey = requireIdempotencyKey(input.request);
      if (!idempotencyKey) {
        sendError(
          input.response,
          400,
          "bad_request",
          "Idempotency key is required for refunds.",
        );
        return true;
      }

      if (
        await respondFromIdempotencyCache(
          input.repositories,
          input.response,
          `orders.refund.${orderMatch.orderId}`,
          idempotencyKey,
        )
      ) {
        return true;
      }

      try {
        await readJsonBody(input.request, (body) => refundOrderRequestSchema.parse(body));
        const refundedOrder = markOrderRefunded(storedOrder.order);
        await input.repositories.commerce.orders.update(refundedOrder);
        await restoreOrderAccountCredit(
          input.repositories,
          refundedOrder.id,
          refundedOrder.refundedAt,
        );
        await reverseOrderProvisioningEffects(
          input.repositories,
          refundedOrder.id,
          refundedOrder.refundedAt,
        );
        if (storedOrder.order.status !== "refunded") {
          await recordOrderLifecycleEvent(
            input.repositories,
            refundedOrder,
            "order.refunded",
            refundedOrder.refundedAt,
          );
        }
        const responsePayload = orderResponseSchema.parse({
          ok: true,
          data: {
            order: refundedOrder,
          },
        });
        await input.repositories.reliability.idempotency.save({
          scope: `orders.refund.${orderMatch.orderId}`,
          key: idempotencyKey,
          response: {
            statusCode: 200,
            payload: responsePayload,
          },
        });
        sendJson(input.response, 200, responsePayload);
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid refund request.";
        sendError(input.response, 400, "validation_error", message);
        return true;
      }
    }
  }

  if (input.method === "POST" && input.pathname === "/v1/webhooks/stripe") {
    const rawBody = await readRawBody(input.request);
    const signatureHeader = input.request.headers["stripe-signature"];
    const signatureValue = typeof signatureHeader === "string" ? signatureHeader : undefined;

    if (
      !verifyStripeSignature({
        rawBody,
        signatureHeader: signatureValue,
        secret: input.env.STRIPE_WEBHOOK_SECRET,
      })
    ) {
      sendError(input.response, 401, "unauthorized", "Stripe webhook signature is invalid.");
      return true;
    }

    try {
      const event = stripeWebhookEventSchema.parse(JSON.parse(rawBody));

      if (
        await input.repositories.reliability.webhookEvents.hasProcessed({
          source: "stripe",
          eventId: event.id,
        })
      ) {
        sendJson(
          input.response,
          200,
          stripeWebhookResponseSchema.parse({
            ok: true,
            data: {
              received: true,
              eventId: event.id,
            },
          }),
        );
        return true;
      }

      const metadataOrderId = event.data.object.metadata.orderId;
      const orderId =
        metadataOrderId ||
        (await input.repositories.commerce.orders.findByPaymentIntent(
          event.data.object.id,
        ))?.order.id ||
        (event.data.object.payment_intent
          ? (
              await input.repositories.commerce.orders.findByPaymentIntent(
                event.data.object.payment_intent,
              )
            )?.order.id
          : undefined);

      if (!orderId) {
        sendError(input.response, 404, "not_found", "Webhook order target not found.");
        return true;
      }

      const storedOrder = await input.repositories.commerce.orders.getStored(orderId);
      if (!storedOrder) {
        sendError(input.response, 404, "not_found", "Webhook order target not found.");
        return true;
      }

      let nextOrder = storedOrder.order;
      if (event.type === "payment_intent.succeeded") {
        nextOrder = markOrderPaid(storedOrder.order);
      } else if (event.type === "payment_intent.payment_failed") {
        nextOrder = markOrderPaymentFailed(storedOrder.order);
      } else if (event.type === "charge.refunded") {
        nextOrder = markOrderRefunded(storedOrder.order);
      }

      await input.repositories.commerce.orders.update(nextOrder);
      if (event.type === "payment_intent.succeeded") {
        await applyOrderProvisioningEffects(
          input.repositories,
          nextOrder.id,
          nextOrder.paidAt,
        );
        await processReferralQualificationForOrder(
          input.repositories,
          nextOrder.id,
          nextOrder.paidAt,
        );
        if (storedOrder.order.status !== "paid") {
          await recordOrderLifecycleEvent(
            input.repositories,
            nextOrder,
            "order.paid",
            nextOrder.paidAt,
          );
        }
        await recordPaidBookingMetricEvents({
          repositories: input.repositories,
          order: nextOrder,
          bookings: await input.repositories.commerce.bookings.listAll(),
          occurredAt: nextOrder.paidAt,
        });
      } else if (event.type === "payment_intent.payment_failed") {
        await restoreOrderAccountCredit(
          input.repositories,
          nextOrder.id,
          nextOrder.updatedAt,
        );
        if (storedOrder.order.status !== "payment_failed") {
          await recordOrderLifecycleEvent(
            input.repositories,
            nextOrder,
            "order.payment_failed",
            nextOrder.updatedAt,
          );
        }
      } else if (event.type === "charge.refunded") {
        await restoreOrderAccountCredit(
          input.repositories,
          nextOrder.id,
          nextOrder.refundedAt,
        );
        await reverseOrderProvisioningEffects(
          input.repositories,
          nextOrder.id,
          nextOrder.refundedAt,
        );
        if (storedOrder.order.status !== "refunded") {
          await recordOrderLifecycleEvent(
            input.repositories,
            nextOrder,
            "order.refunded",
            nextOrder.refundedAt,
          );
        }
      }
      await input.repositories.reliability.webhookEvents.markProcessed({
        source: "stripe",
        eventId: event.id,
      });
      sendJson(
        input.response,
        200,
        stripeWebhookResponseSchema.parse({
          ok: true,
          data: {
            received: true,
            eventId: event.id,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid Stripe webhook payload.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  return false;
};
