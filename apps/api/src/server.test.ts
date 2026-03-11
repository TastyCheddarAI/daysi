import { createHmac } from "node:crypto";
import type { AddressInfo } from "node:net";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { listOperationalMetricEvents, resetBootstrapStore } from "./bootstrap-store";
import { resetRuntimeClinicData } from "./clinic-runtime";
import { loadAppEnv } from "./config";
import { createApiServer } from "./server";

let server: ReturnType<typeof createApiServer>;
let baseUrl: string;

const exchangeBootstrapSession = async (input: {
  email: string;
  displayName: string;
  requestedRole: "customer" | "provider" | "staff" | "admin" | "owner";
  providerUserId: string;
  locationScopes?: string[];
}): Promise<Response> =>
  fetch(`${baseUrl}/v1/auth/session/exchange`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      tenantSlug: "daysi",
      providerUserId: input.providerUserId,
      email: input.email,
      displayName: input.displayName,
      requestedRole: input.requestedRole,
      locationScopes: input.locationScopes,
    }),
  });

const createBootstrapSession = async (input: {
  email: string;
  displayName: string;
  requestedRole: "customer" | "provider" | "staff" | "admin" | "owner";
  providerUserId: string;
  locationScopes?: string[];
}): Promise<string> => {
  let response = await exchangeBootstrapSession(input);
  let payload = (await response.json()) as {
    data?: { sessionToken: string };
    error?: { message?: string };
  };

  if (
    !response.ok &&
    (input.requestedRole === "admin" || input.requestedRole === "staff") &&
    payload.error?.message?.includes("access assignment")
  ) {
    const ownerSessionResponse = await exchangeBootstrapSession({
      email: "test.owner@daysi.ca",
      displayName: "Test Owner",
      requestedRole: "owner",
      providerUserId: "test-owner-bootstrap-helper",
    });
    const ownerSessionPayload = (await ownerSessionResponse.json()) as {
      data: { sessionToken: string };
    };
    const ownerToken = ownerSessionPayload.data.sessionToken;

    const createAssignmentResponse = await fetch(`${baseUrl}/v1/admin/access-assignments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        email: input.email,
        role: input.requestedRole,
        locationScopes: input.locationScopes ?? ["daysi-flagship"],
      }),
    });

    if (![201, 409].includes(createAssignmentResponse.status)) {
      throw new Error(`Failed to seed access assignment for ${input.email}.`);
    }

    response = await exchangeBootstrapSession(input);
    payload = (await response.json()) as {
      data?: { sessionToken: string };
      error?: { message?: string };
    };
  }

  if (!response.ok || !payload.data?.sessionToken) {
    throw new Error(payload.error?.message ?? "Unable to create bootstrap session.");
  }

  return payload.data.sessionToken;
};

const postStripeWebhook = async (input: {
  eventId: string;
  paymentIntentId: string;
  orderId: string;
  timestamp: string;
}): Promise<Response> => {
  const eventPayload = JSON.stringify({
    id: input.eventId,
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: input.paymentIntentId,
        metadata: {
          orderId: input.orderId,
        },
      },
    },
  });
  const signature = createHmac("sha256", "whsec_test_secret")
    .update(`${input.timestamp}.${eventPayload}`, "utf8")
    .digest("hex");

  return fetch(`${baseUrl}/v1/webhooks/stripe`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": `t=${input.timestamp},v1=${signature}`,
    },
    body: eventPayload,
  });
};

const postSkinAnalyzerWebhook = async (input: {
  timestamp: string;
  payload: Record<string, unknown>;
}): Promise<Response> => {
  const eventPayload = JSON.stringify(input.payload);
  const signature = createHmac("sha256", "skinsec_test_secret")
    .update(`${input.timestamp}.${eventPayload}`, "utf8")
    .digest("hex");

  return fetch(`${baseUrl}/v1/webhooks/skin-analyzer`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-daysi-skin-signature": `t=${input.timestamp},v1=${signature}`,
    },
    body: eventPayload,
  });
};

beforeAll(async () => {
  const env = loadAppEnv({
    ...process.env,
    DAYSI_API_HOST: "127.0.0.1",
    DAYSI_API_PORT: "0",
    DAYSI_DEFAULT_LOCATION_SLUG: "daysi-flagship",
    DAYSI_DEFAULT_LOCATION_NAME: "Daysi Flagship",
    STRIPE_WEBHOOK_SECRET: "whsec_test_secret",
    SKIN_ANALYZER_WEBHOOK_SECRET: "skinsec_test_secret",
  });

  server = createApiServer(env);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(() => {
  resetBootstrapStore();
  resetRuntimeClinicData();
});

afterAll(async () => {
  if (!server) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});

describe("api bootstrap", () => {
  it("ingests public analytics events for the web shell", async () => {
    const response = await fetch(`${baseUrl}/v1/public/events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "vitest-shell",
      },
      body: JSON.stringify({
        eventType: "page_view",
        pagePath: "/services",
        sessionId: "sess_test_1",
        metadata: {
          utm_source: "newsletter",
        },
      }),
    });
    const payload = (await response.json()) as {
      data: { eventId: string; eventType: string };
    };

    expect(response.status).toBe(202);
    expect(payload.data.eventType).toBe("page_view");

    const [storedEvent] = listOperationalMetricEvents();
    expect(storedEvent?.id).toBe(payload.data.eventId);
    expect(storedEvent?.eventType).toBe("page_view");
    expect(storedEvent?.locationSlug).toBe("daysi-flagship");
    expect(storedEvent?.metadata.pagePath).toBe("/services");
    expect(storedEvent?.metadata.sessionId).toBe("sess_test_1");
    expect(storedEvent?.metadata.userAgent).toBe("vitest-shell");
  });

  it("builds an admin web analytics report from Daysi public events", async () => {
    const adminToken = await createBootstrapSession({
      email: "analytics.admin@daysi.ca",
      displayName: "Analytics Admin",
      requestedRole: "admin",
      providerUserId: "analytics-admin-user-1",
    });

    await fetch(`${baseUrl}/v1/public/events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
      },
      body: JSON.stringify({
        eventType: "page_view",
        locationSlug: "daysi-flagship",
        pagePath: "/services/laser-hair-removal",
        sessionId: "sess_analytics_1",
        occurredAt: "2026-03-09T10:00:00.000Z",
        metadata: {
          utm_source: "instagram",
        },
      }),
    });

    await fetch(`${baseUrl}/v1/public/events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
      },
      body: JSON.stringify({
        eventType: "cta_click",
        locationSlug: "daysi-flagship",
        pagePath: "/services/laser-hair-removal",
        sessionId: "sess_analytics_1",
        occurredAt: "2026-03-09T10:01:00.000Z",
        metadata: {
          ctaName: "Book Now",
        },
      }),
    });

    await fetch(`${baseUrl}/v1/public/events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
      },
      body: JSON.stringify({
        eventType: "booking_complete",
        locationSlug: "daysi-flagship",
        pagePath: "/booking",
        sessionId: "sess_analytics_1",
        occurredAt: "2026-03-09T10:05:00.000Z",
      }),
    });

    await fetch(`${baseUrl}/v1/public/events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        eventType: "page_view",
        locationSlug: "daysi-flagship",
        pagePath: "/pricing",
        sessionId: "sess_analytics_2",
        occurredAt: "2026-03-09T11:00:00.000Z",
        metadata: {
          referrer: "https://google.com/search?q=daysi",
        },
      }),
    });

    const analyticsResponse = await fetch(
      `${baseUrl}/v1/admin/reports/web-analytics?locationSlug=daysi-flagship&fromDate=2026-03-09&toDate=2026-03-09`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const analyticsPayload = (await analyticsResponse.json()) as {
      data: {
        summary: {
          uniqueVisitors: number;
          pageViews: number;
          totalBookings: number;
          ctaClicks: number;
        };
        devices: {
          mobile: number;
          desktop: number;
        };
        trafficSources: Array<{ source: string }>;
        topPages: Array<{ path: string; views: number }>;
        ctaPerformance: Array<{ ctaName: string; clicks: number; conversions: number }>;
      };
    };

    expect(analyticsResponse.status).toBe(200);
    expect(analyticsPayload.data.summary.uniqueVisitors).toBe(2);
    expect(analyticsPayload.data.summary.pageViews).toBe(2);
    expect(analyticsPayload.data.summary.totalBookings).toBe(1);
    expect(analyticsPayload.data.summary.ctaClicks).toBe(1);
    expect(analyticsPayload.data.devices.mobile).toBe(1);
    expect(analyticsPayload.data.devices.desktop).toBe(1);
    expect(analyticsPayload.data.trafficSources[0]?.source).toBe("instagram");
    expect(analyticsPayload.data.topPages.map((entry) => entry.path)).toEqual(
      expect.arrayContaining(["/pricing", "/services/laser-hair-removal"]),
    );
    expect(
      analyticsPayload.data.ctaPerformance.find((entry) => entry.ctaName === "Book Now")
        ?.conversions,
    ).toBe(1);
  });

  it("serves location catalog services", async () => {
    const response = await fetch(
      `${baseUrl}/v1/public/locations/daysi-flagship/catalog/services`,
    );
    const payload = (await response.json()) as {
      data: { services: Array<{ slug: string }> };
    };

    expect(response.status).toBe(200);
    expect(payload.data.services.length).toBeGreaterThan(0);
    expect(payload.data.services[0]?.slug).toBe("laser-hair-removal");
  });

  it("routes booking assistant chat and recommendation tasks through the internal AI gateway", async () => {
    const customerToken = await createBootstrapSession({
      email: "ai.customer@example.com",
      displayName: "AI Customer",
      requestedRole: "customer",
      providerUserId: "customer-ai-1",
    });

    const chatResponse = await fetch(`${baseUrl}/v1/ai/booking-assistant/chat`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        messages: [
          {
            role: "user",
            content: "I want less shaving and smoother results. Is there a membership?",
          },
        ],
      }),
    });
    const chatPayload = (await chatResponse.json()) as {
      data: {
        run: { provider: string; sourceProvenance: Array<{ kind: string }> };
        answer: {
          suggestedServiceSlugs: string[];
          suggestedMembershipPlanSlugs: string[];
        };
      };
    };

    expect(chatResponse.status).toBe(200);
    expect(chatPayload.data.run.provider).toBe("openai");
    expect(chatPayload.data.answer.suggestedServiceSlugs).toContain("laser-hair-removal");
    expect(chatPayload.data.answer.suggestedMembershipPlanSlugs).toContain(
      "glow-membership",
    );
    expect(chatPayload.data.run.sourceProvenance.some((source) => source.kind === "policy")).toBe(true);

    const recommendationsResponse = await fetch(
      `${baseUrl}/v1/ai/booking-assistant/recommendations`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          locationSlug: "daysi-flagship",
          concern: "I want better skin tone and photofacial results",
          budgetAmountCents: 25000,
          prefersMembership: true,
        }),
      },
    );
    const recommendationsPayload = (await recommendationsResponse.json()) as {
      data: {
        run: { task: string; evaluation: { groundingScore: number } };
        recommendations: Array<{ serviceSlug: string }>;
        membershipSuggestion?: { planSlug: string };
      };
    };

    expect(recommendationsResponse.status).toBe(200);
    expect(recommendationsPayload.data.run.task).toBe("assistant.booking_recommendations");
    expect(recommendationsPayload.data.recommendations[0]?.serviceSlug).toBe(
      "skin-rejuvenation",
    );
    expect(recommendationsPayload.data.membershipSuggestion?.planSlug).toBe(
      "glow-membership",
    );
    expect(recommendationsPayload.data.run.evaluation.groundingScore).toBeGreaterThan(0);
  });

  it("searches availability, creates a booking, and reads it back", async () => {
    const availabilityResponse = await fetch(`${baseUrl}/v1/public/availability/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        fromDate: "2026-03-09",
        toDate: "2026-03-09",
        pricingMode: "retail",
      }),
    });
    const availabilityPayload = (await availabilityResponse.json()) as {
      data: {
        slots: Array<{ slotId: string }>;
      };
    };

    expect(availabilityResponse.status).toBe(200);
    expect(availabilityPayload.data.slots.length).toBeGreaterThan(0);

    const bookingResponse = await fetch(`${baseUrl}/v1/public/bookings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "booking-create-test-1",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        serviceVariantSlug: "laser-hair-removal-full-body-60",
        slotId: availabilityPayload.data.slots[0]?.slotId,
        pricingMode: "retail",
        customer: {
          firstName: "Test",
          lastName: "Customer",
          email: "test.customer@example.com",
        },
      }),
    });
    const bookingPayload = (await bookingResponse.json()) as {
      data: {
        booking: { id: string; status: string };
        managementToken: string;
      };
    };

    expect(bookingResponse.status).toBe(201);
    expect(bookingPayload.data.booking.status).toBe("confirmed");

    const getResponse = await fetch(
      `${baseUrl}/v1/bookings/${bookingPayload.data.booking.id}`,
      {
        headers: {
          "x-booking-token": bookingPayload.data.managementToken,
        },
      },
    );
    const getPayload = (await getResponse.json()) as {
      data: {
        booking: { id: string };
      };
    };

    expect(getResponse.status).toBe(200);
    expect(getPayload.data.booking.id).toBe(bookingPayload.data.booking.id);
  });

  it("lets admins list, reschedule, and cancel bookings from admin routes", async () => {
    const adminToken = await createBootstrapSession({
      email: "admin.bookings@daysi.ca",
      displayName: "Daysi Admin",
      requestedRole: "admin",
      providerUserId: "admin-bookings-user-1",
    });

    const availabilityResponse = await fetch(`${baseUrl}/v1/public/availability/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        fromDate: "2026-03-09",
        toDate: "2026-03-09",
        pricingMode: "retail",
      }),
    });
    const availabilityPayload = (await availabilityResponse.json()) as {
      data: {
        slots: Array<{ slotId: string; startAt: string }>;
      };
    };

    expect(availabilityResponse.status).toBe(200);
    expect(availabilityPayload.data.slots.length).toBeGreaterThan(0);

    const bookingResponse = await fetch(`${baseUrl}/v1/public/bookings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "admin-booking-create-test-1",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        serviceVariantSlug: "laser-hair-removal-full-body-60",
        slotId: availabilityPayload.data.slots[0]?.slotId,
        pricingMode: "retail",
        customer: {
          firstName: "Admin",
          lastName: "Managed",
          email: "admin.managed.customer@example.com",
        },
      }),
    });
    const bookingPayload = (await bookingResponse.json()) as {
      data: {
        booking: { id: string; startAt: string; status: string };
      };
    };

    expect(bookingResponse.status).toBe(201);
    expect(bookingPayload.data.booking.status).toBe("confirmed");

    const listResponse = await fetch(
      `${baseUrl}/v1/admin/bookings?locationSlug=daysi-flagship&fromDate=2026-03-09&toDate=2026-03-09`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const listPayload = (await listResponse.json()) as {
      data: {
        bookings: Array<{ id: string }>;
      };
    };

    expect(listResponse.status).toBe(200);
    expect(
      listPayload.data.bookings.some(
        (booking) => booking.id === bookingPayload.data.booking.id,
      ),
    ).toBe(true);

    const rebookingOptionsResponse = await fetch(
      `${baseUrl}/v1/bookings/${bookingPayload.data.booking.id}/rebooking-options?fromDate=2026-03-09&toDate=2026-03-11`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const rebookingOptionsPayload = (await rebookingOptionsResponse.json()) as {
      data: {
        slots: Array<{ slotId: string; startAt: string }>;
      };
    };

    expect(rebookingOptionsResponse.status).toBe(200);
    const nextSlot = rebookingOptionsPayload.data.slots.find(
      (slot) => slot.startAt !== bookingPayload.data.booking.startAt,
    );
    expect(nextSlot).toBeDefined();

    const rescheduleResponse = await fetch(
      `${baseUrl}/v1/admin/bookings/${bookingPayload.data.booking.id}/reschedule`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
          "idempotency-key": "admin-booking-reschedule-test-1",
        },
        body: JSON.stringify({
          slotId: nextSlot?.slotId,
          pricingMode: "retail",
        }),
      },
    );
    const reschedulePayload = (await rescheduleResponse.json()) as {
      data: {
        booking: { startAt: string; status: string };
      };
    };

    expect(rescheduleResponse.status).toBe(200);
    expect(reschedulePayload.data.booking.status).toBe("confirmed");
    expect(reschedulePayload.data.booking.startAt).not.toBe(bookingPayload.data.booking.startAt);

    const cancelResponse = await fetch(
      `${baseUrl}/v1/admin/bookings/${bookingPayload.data.booking.id}/cancel`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
          "idempotency-key": "admin-booking-cancel-test-1",
        },
        body: JSON.stringify({
          reason: "Admin cancellation test",
        }),
      },
    );
    const cancelPayload = (await cancelResponse.json()) as {
      data: {
        booking: { status: string; cancelledReason?: string };
      };
    };

    expect(cancelResponse.status).toBe(200);
    expect(cancelPayload.data.booking.status).toBe("cancelled");
    expect(cancelPayload.data.booking.cancelledReason).toBe("Admin cancellation test");
  });

  it("lets admins manage rooms and assigns room-backed bookings end to end", async () => {
    const adminToken = await createBootstrapSession({
      email: "owner.rooms@daysi.ca",
      displayName: "Daysi Owner",
      requestedRole: "owner",
      providerUserId: "owner-user-room-ops-1",
    });

    const createLocationResponse = await fetch(`${baseUrl}/v1/admin/locations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        slug: "daysi-east",
        name: "Daysi East",
        organizationId: "org_daysi",
        enabledModules: ["memberships"],
        operatingSchedule: [
          {
            dayOfWeek: 1,
            startMinute: 9 * 60,
            endMinute: 17 * 60,
          },
        ],
      }),
    });

    expect(createLocationResponse.status).toBe(201);

    const createServiceResponse = await fetch(`${baseUrl}/v1/admin/services`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-east",
        slug: "photofacial-east",
        variantSlug: "photofacial-east-50",
        categorySlug: "skin",
        name: "Photofacial East",
        shortDescription: "Room-backed photofacial service for shared treatment suites.",
        description: "Room-aware booking path validation for shared provider, machine, and room scheduling.",
        durationMinutes: 50,
        bookable: true,
        price: {
          currency: "CAD",
          retailAmountCents: 28900,
          memberAmountCents: 24900,
          membershipRequired: false,
        },
        bookingPolicy: {
          cancellationWindowHours: 24,
          bufferMinutes: 10,
          requiresDeposit: false,
        },
        machineCapabilities: ["photofacial-east"],
        roomCapabilities: ["treatment-room"],
        featureTags: ["skin", "room-backed"],
      }),
    });

    expect(createServiceResponse.status).toBe(201);

    const createMachineResponse = await fetch(`${baseUrl}/v1/admin/machines`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-east",
        slug: "m22-east-a",
        name: "M22 East A",
        capabilities: ["photofacial-east"],
        template: [
          {
            dayOfWeek: 1,
            startMinute: 9 * 60,
            endMinute: 17 * 60,
          },
        ],
        blockedWindows: [],
      }),
    });

    expect(createMachineResponse.status).toBe(201);

    const createRoomResponse = await fetch(`${baseUrl}/v1/admin/rooms`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-east",
        slug: "treatment-suite-east-a",
        name: "Treatment Suite East A",
        capabilities: ["treatment-room"],
        template: [
          {
            dayOfWeek: 1,
            startMinute: 9 * 60,
            endMinute: 17 * 60,
          },
        ],
        blockedWindows: [],
      }),
    });

    expect(createRoomResponse.status).toBe(201);

    const patchRoomResponse = await fetch(
      `${baseUrl}/v1/admin/rooms/treatment-suite-east-a`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          locationSlug: "daysi-east",
          name: "Treatment Suite East Prime",
          blockedWindows: [
            {
              startsAt: "2026-03-10T13:00:00.000Z",
              endsAt: "2026-03-10T14:00:00.000Z",
            },
          ],
        }),
      },
    );

    expect(patchRoomResponse.status).toBe(200);

    const adminRoomsResponse = await fetch(
      `${baseUrl}/v1/admin/rooms?locationSlug=daysi-east`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const adminRoomsPayload = (await adminRoomsResponse.json()) as {
      data: {
        rooms: Array<{
          roomSlug: string;
          roomName: string;
          blockedWindows: Array<{ startsAt: string }>;
        }>;
      };
    };

    expect(adminRoomsResponse.status).toBe(200);
    expect(
      adminRoomsPayload.data.rooms.find(
        (room) => room.roomSlug === "treatment-suite-east-a",
      )?.roomName,
    ).toBe("Treatment Suite East Prime");
    expect(
      adminRoomsPayload.data.rooms.find(
        (room) => room.roomSlug === "treatment-suite-east-a",
      )?.blockedWindows,
    ).toHaveLength(1);

    const createProviderResponse = await fetch(`${baseUrl}/v1/admin/providers`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-east",
        slug: "sara-kim",
        name: "Sara Kim",
        email: "sara.kim@daysi.ca",
        serviceSlugs: ["photofacial-east"],
        template: [
          {
            dayOfWeek: 1,
            startMinute: 10 * 60,
            endMinute: 16 * 60,
          },
        ],
        blockedWindows: [],
      }),
    });

    expect(createProviderResponse.status).toBe(201);

    const availabilityResponse = await fetch(`${baseUrl}/v1/public/availability/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: "daysi-east",
        serviceSlug: "photofacial-east",
        fromDate: "2026-03-09",
        toDate: "2026-03-09",
        pricingMode: "retail",
      }),
    });
    const availabilityPayload = (await availabilityResponse.json()) as {
      data: {
        slots: Array<{
          slotId: string;
          roomSlug?: string;
          roomName?: string;
          providerSlug: string;
        }>;
      };
    };

    expect(availabilityResponse.status).toBe(200);
    expect(availabilityPayload.data.slots.length).toBeGreaterThan(0);
    expect(availabilityPayload.data.slots[0]?.providerSlug).toBe("sara-kim");
    expect(availabilityPayload.data.slots[0]?.roomSlug).toBe("treatment-suite-east-a");
    expect(availabilityPayload.data.slots[0]?.roomName).toBe("Treatment Suite East Prime");

    const bookingResponse = await fetch(`${baseUrl}/v1/public/bookings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "daysi-east-room-booking-create",
      },
      body: JSON.stringify({
        locationSlug: "daysi-east",
        serviceSlug: "photofacial-east",
        serviceVariantSlug: "photofacial-east-50",
        slotId: availabilityPayload.data.slots[0]?.slotId,
        pricingMode: "retail",
        customer: {
          firstName: "Room",
          lastName: "Customer",
          email: "room.customer@example.com",
        },
      }),
    });
    const bookingPayload = (await bookingResponse.json()) as {
      data: {
        booking: {
          id: string;
          roomSlug?: string;
          roomName?: string;
        };
        managementToken: string;
      };
    };

    expect(bookingResponse.status).toBe(201);
    expect(bookingPayload.data.booking.roomSlug).toBe("treatment-suite-east-a");
    expect(bookingPayload.data.booking.roomName).toBe("Treatment Suite East Prime");

    const getBookingResponse = await fetch(
      `${baseUrl}/v1/bookings/${bookingPayload.data.booking.id}`,
      {
        headers: {
          "x-booking-token": bookingPayload.data.managementToken,
        },
      },
    );
    const getBookingPayload = (await getBookingResponse.json()) as {
      data: {
        booking: {
          roomSlug?: string;
          roomName?: string;
        };
      };
    };

    expect(getBookingResponse.status).toBe(200);
    expect(getBookingPayload.data.booking.roomSlug).toBe("treatment-suite-east-a");
    expect(getBookingPayload.data.booking.roomName).toBe("Treatment Suite East Prime");
  });

  it("creates a membership subscription intent and activates it via Stripe webhook", async () => {
    const sessionResponse = await fetch(`${baseUrl}/v1/auth/session/exchange`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        tenantSlug: "daysi",
        providerUserId: "test-user-1",
        email: "member@example.com",
        displayName: "Member Example",
        requestedRole: "customer",
      }),
    });
    const sessionPayload = (await sessionResponse.json()) as {
      data: { sessionToken: string };
    };

    const createResponse = await fetch(`${baseUrl}/v1/memberships/subscriptions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${sessionPayload.data.sessionToken}`,
        "idempotency-key": "membership-create-test-1",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        planSlug: "glow-membership",
        customer: {
          firstName: "Member",
          lastName: "Example",
          email: "member@example.com",
        },
      }),
    });
    const createPayload = (await createResponse.json()) as {
      data: {
        subscription: { id: string; status: string };
        orderId: string;
        paymentIntentId?: string;
      };
    };

    expect(createResponse.status).toBe(201);
    expect(createPayload.data.subscription.status).toBe("pending_payment");
    expect(createPayload.data.paymentIntentId).toBeTruthy();

    const eventPayload = JSON.stringify({
      id: "evt_test_payment_succeeded_1",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: createPayload.data.paymentIntentId,
          metadata: {
            orderId: createPayload.data.orderId,
          },
        },
      },
    });
    const timestamp = "1741362000";
    const signature = createHmac("sha256", "whsec_test_secret")
      .update(`${timestamp}.${eventPayload}`, "utf8")
      .digest("hex");

    const webhookResponse = await fetch(`${baseUrl}/v1/webhooks/stripe`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": `t=${timestamp},v1=${signature}`,
      },
      body: eventPayload,
    });

    expect(webhookResponse.status).toBe(200);

    const membershipsResponse = await fetch(`${baseUrl}/v1/me/memberships`, {
      headers: {
        authorization: `Bearer ${sessionPayload.data.sessionToken}`,
      },
    });
    const membershipsPayload = (await membershipsResponse.json()) as {
      data: {
        subscriptions: Array<{ id: string; status: string }>;
      };
    };

    expect(membershipsResponse.status).toBe(200);
    expect(membershipsPayload.data.subscriptions).toHaveLength(1);
    expect(membershipsPayload.data.subscriptions[0]?.status).toBe("active");
  });

  it("updates provider schedule templates and changes future availability", async () => {
    const providerSession = await fetch(`${baseUrl}/v1/auth/session/exchange`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        tenantSlug: "daysi",
        providerUserId: "provider-user-ava",
        email: "ava.chen@daysi.ca",
        displayName: "Ava Chen",
        requestedRole: "provider",
      }),
    });
    const providerSessionPayload = (await providerSession.json()) as {
      data: { sessionToken: string };
    };

    const updateResponse = await fetch(`${baseUrl}/v1/provider/me/schedule/template`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${providerSessionPayload.data.sessionToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        template: [
          {
            dayOfWeek: 1,
            startMinute: 12 * 60,
            endMinute: 14 * 60,
          },
        ],
      }),
    });

    expect(updateResponse.status).toBe(200);

    const availabilityResponse = await fetch(`${baseUrl}/v1/public/availability/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        fromDate: "2026-03-09",
        toDate: "2026-03-09",
        preferredProviderSlug: "ava-chen",
        pricingMode: "retail",
      }),
    });
    const availabilityPayload = (await availabilityResponse.json()) as {
      data: {
        slots: Array<{ startAt: string }>;
      };
    };

    expect(availabilityResponse.status).toBe(200);
    expect(availabilityPayload.data.slots.length).toBeGreaterThan(0);
    expect(availabilityPayload.data.slots[0]?.startAt).toBe("2026-03-09T12:00:00.000Z");
  });

  it("lets admins manage education offers while public listings stay publish-only", async () => {
    const adminToken = await createBootstrapSession({
      email: "admin@daysi.ca",
      displayName: "Daysi Admin",
      requestedRole: "admin",
      providerUserId: "admin-user-1",
    });

    const initialPublicResponse = await fetch(
      `${baseUrl}/v1/public/education/offers?locationSlug=daysi-flagship`,
    );
    const initialPublicPayload = (await initialPublicResponse.json()) as {
      data: {
        educationOffers: Array<{ slug: string }>;
      };
    };

    expect(initialPublicResponse.status).toBe(200);
    expect(
      initialPublicPayload.data.educationOffers.some(
        (offer) => offer.slug === "treatment-architecture-masterclass",
      ),
    ).toBe(false);

    const createResponse = await fetch(`${baseUrl}/v1/admin/education/offers`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        slug: "growth-intelligence-bootcamp",
        title: "Growth Intelligence Bootcamp",
        shortDescription: "Operator training for pricing, SEO, and clinic growth systems.",
        moduleSlugs: ["seo-signals", "pricing-ops"],
        membershipEligible: true,
        staffGrantEnabled: true,
        status: "published",
        price: {
          currency: "CAD",
          amountCents: 59900,
          isFree: false,
        },
      }),
    });

    expect(createResponse.status).toBe(201);

    const publicAfterCreate = await fetch(
      `${baseUrl}/v1/public/education/offers?locationSlug=daysi-flagship`,
    );
    const publicAfterCreatePayload = (await publicAfterCreate.json()) as {
      data: {
        educationOffers: Array<{ slug: string }>;
      };
    };

    expect(
      publicAfterCreatePayload.data.educationOffers.some(
        (offer) => offer.slug === "growth-intelligence-bootcamp",
      ),
    ).toBe(true);

    const patchResponse = await fetch(
      `${baseUrl}/v1/admin/education/offers/growth-intelligence-bootcamp`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          locationSlug: "daysi-flagship",
          status: "draft",
        }),
      },
    );

    expect(patchResponse.status).toBe(200);

    const publicAfterPatch = await fetch(
      `${baseUrl}/v1/public/education/offers?locationSlug=daysi-flagship`,
    );
    const publicAfterPatchPayload = (await publicAfterPatch.json()) as {
      data: {
        educationOffers: Array<{ slug: string }>;
      };
    };

    expect(
      publicAfterPatchPayload.data.educationOffers.some(
        (offer) => offer.slug === "growth-intelligence-bootcamp",
      ),
    ).toBe(false);

    const adminListResponse = await fetch(
      `${baseUrl}/v1/admin/education/offers?locationSlug=daysi-flagship`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const adminListPayload = (await adminListResponse.json()) as {
      data: {
        educationOffers: Array<{ slug: string; status: string }>;
      };
    };

    expect(adminListResponse.status).toBe(200);
    expect(
      adminListPayload.data.educationOffers.find(
        (offer) => offer.slug === "growth-intelligence-bootcamp",
      )?.status,
    ).toBe("draft");
  });

  it("lets admins manage locations, services, machines, membership plans, and provider comp rules", async () => {
    const adminToken = await createBootstrapSession({
      email: "owner@daysi.ca",
      displayName: "Daysi Owner",
      requestedRole: "owner",
      providerUserId: "owner-user-ops-1",
    });

    const createLocationResponse = await fetch(`${baseUrl}/v1/admin/locations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        slug: "daysi-north",
        name: "Daysi North",
        organizationId: "org_daysi",
        enabledModules: ["education", "memberships"],
        operatingSchedule: [
          {
            dayOfWeek: 1,
            startMinute: 10 * 60,
            endMinute: 18 * 60,
          },
          {
            dayOfWeek: 2,
            startMinute: 10 * 60,
            endMinute: 18 * 60,
          },
        ],
      }),
    });

    expect(createLocationResponse.status).toBe(201);

    const patchLocationResponse = await fetch(`${baseUrl}/v1/admin/locations/daysi-north`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: "Daysi North Studio",
        enabledModules: ["education", "memberships", "skinAnalysis"],
        operatingSchedule: [
          {
            dayOfWeek: 1,
            startMinute: 9 * 60,
            endMinute: 17 * 60,
          },
          {
            dayOfWeek: 3,
            startMinute: 11 * 60,
            endMinute: 19 * 60,
          },
        ],
      }),
    });
    const patchLocationPayload = (await patchLocationResponse.json()) as {
      data: {
        location: {
          name: string;
          enabledModules: string[];
          operatingSchedule: Array<{ dayOfWeek: number; startMinute: number }>;
        };
      };
    };

    expect(patchLocationResponse.status).toBe(200);
    expect(patchLocationPayload.data.location.name).toBe("Daysi North Studio");
    expect(patchLocationPayload.data.location.enabledModules).toContain("skinAnalysis");
    expect(patchLocationPayload.data.location.operatingSchedule[0]?.startMinute).toBe(540);

    const platformConfigResponse = await fetch(`${baseUrl}/v1/platform/config`);
    const platformConfigPayload = (await platformConfigResponse.json()) as {
      data: {
        locations: Array<{ slug: string; name: string; enabledModules: string[] }>;
      };
    };

    expect(platformConfigResponse.status).toBe(200);
    expect(
      platformConfigPayload.data.locations.find((location) => location.slug === "daysi-north")
        ?.name,
    ).toBe("Daysi North Studio");
    expect(
      platformConfigPayload.data.locations.find((location) => location.slug === "daysi-north")
        ?.enabledModules,
    ).toContain("skinAnalysis");

    const createServiceResponse = await fetch(`${baseUrl}/v1/admin/services`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-north",
        slug: "pigment-correction",
        variantSlug: "pigment-correction-50",
        categorySlug: "skin",
        name: "Pigment Correction",
        shortDescription: "Corrective skin treatment for visible pigmentation.",
        description: "High-value skin treatment configured per location and machine mix.",
        durationMinutes: 50,
        bookable: true,
        price: {
          currency: "CAD",
          retailAmountCents: 25900,
          memberAmountCents: 21900,
          membershipRequired: false,
        },
        bookingPolicy: {
          cancellationWindowHours: 24,
          bufferMinutes: 10,
          requiresDeposit: false,
        },
        machineCapabilities: ["pigment-correction"],
        featureTags: ["skin", "premium"],
      }),
    });

    expect(createServiceResponse.status).toBe(201);

    const patchServiceResponse = await fetch(
      `${baseUrl}/v1/admin/services/pigment-correction`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          locationSlug: "daysi-north",
          shortDescription: "Updated corrective skin treatment for visible pigmentation.",
          price: {
            currency: "CAD",
            retailAmountCents: 26900,
            memberAmountCents: 22900,
            membershipRequired: false,
          },
        }),
      },
    );

    expect(patchServiceResponse.status).toBe(200);

    const publicServicesResponse = await fetch(
      `${baseUrl}/v1/public/locations/daysi-north/catalog/services`,
    );
    const publicServicesPayload = (await publicServicesResponse.json()) as {
      data: {
        services: Array<{
          slug: string;
          shortDescription: string;
        }>;
      };
    };

    expect(publicServicesResponse.status).toBe(200);
    expect(
      publicServicesPayload.data.services.find((service) => service.slug === "pigment-correction")
        ?.shortDescription,
    ).toBe("Updated corrective skin treatment for visible pigmentation.");

    const createMachineResponse = await fetch(`${baseUrl}/v1/admin/machines`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-north",
        slug: "m22-north-a",
        name: "M22 North A",
        capabilities: ["pigment-correction"],
        template: [
          {
            dayOfWeek: 1,
            startMinute: 9 * 60,
            endMinute: 17 * 60,
          },
        ],
        blockedWindows: [],
      }),
    });

    expect(createMachineResponse.status).toBe(201);

    const patchMachineResponse = await fetch(`${baseUrl}/v1/admin/machines/m22-north-a`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-north",
        name: "M22 North Prime",
        blockedWindows: [
          {
            startsAt: "2026-03-12T13:00:00.000Z",
            endsAt: "2026-03-12T15:00:00.000Z",
          },
        ],
      }),
    });

    expect(patchMachineResponse.status).toBe(200);

    const adminMachinesResponse = await fetch(
      `${baseUrl}/v1/admin/machines?locationSlug=daysi-north`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const adminMachinesPayload = (await adminMachinesResponse.json()) as {
      data: {
        machines: Array<{
          machineSlug: string;
          machineName: string;
          blockedWindows: Array<{ startsAt: string }>;
        }>;
      };
    };

    expect(adminMachinesResponse.status).toBe(200);
    expect(
      adminMachinesPayload.data.machines.find((machine) => machine.machineSlug === "m22-north-a")
        ?.machineName,
    ).toBe("M22 North Prime");
    expect(
      adminMachinesPayload.data.machines.find((machine) => machine.machineSlug === "m22-north-a")
        ?.blockedWindows,
    ).toHaveLength(1);

    const createMembershipPlanResponse = await fetch(
      `${baseUrl}/v1/admin/membership-plans`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          locationSlug: "daysi-north",
          slug: "north-glow-membership",
          name: "North Glow Membership",
          description: "North location membership bundle.",
          billingInterval: "month",
          price: {
            currency: "CAD",
            amountCents: 14900,
          },
          educationOnly: false,
          entitlements: {
            includedServiceSlugs: [],
            educationOfferSlugs: [],
            monthlyServiceCredits: [
              {
                serviceSlug: "pigment-correction",
                quantity: 1,
              },
            ],
            memberDiscountPercent: 10,
          },
        }),
      },
    );

    expect(createMembershipPlanResponse.status).toBe(201);

    const patchMembershipPlanResponse = await fetch(
      `${baseUrl}/v1/admin/membership-plans/north-glow-membership`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          locationSlug: "daysi-north",
          price: {
            currency: "CAD",
            amountCents: 15900,
          },
          entitlements: {
            includedServiceSlugs: [],
            educationOfferSlugs: [],
            monthlyServiceCredits: [
              {
                serviceSlug: "pigment-correction",
                quantity: 2,
              },
            ],
            memberDiscountPercent: 12,
          },
        }),
      },
    );

    expect(patchMembershipPlanResponse.status).toBe(200);

    const publicMembershipPlansResponse = await fetch(
      `${baseUrl}/v1/memberships/plans?locationSlug=daysi-north`,
    );
    const publicMembershipPlansPayload = (await publicMembershipPlansResponse.json()) as {
      data: {
        plans: Array<{
          slug: string;
          price: { amountCents: number };
          entitlements: { monthlyServiceCredits: Array<{ quantity: number }> };
        }>;
      };
    };

    expect(publicMembershipPlansResponse.status).toBe(200);
    expect(
      publicMembershipPlansPayload.data.plans.find(
        (plan) => plan.slug === "north-glow-membership",
      )?.price.amountCents,
    ).toBe(15900);
    expect(
      publicMembershipPlansPayload.data.plans.find(
        (plan) => plan.slug === "north-glow-membership",
      )?.entitlements.monthlyServiceCredits[0]?.quantity,
    ).toBe(2);

    const patchProviderCompResponse = await fetch(
      `${baseUrl}/v1/admin/provider-comp-plans/ava-chen`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          locationSlug: "daysi-flagship",
          commissionPercent: 42,
          appliesToRevenueStream: "services",
        }),
      },
    );

    expect(patchProviderCompResponse.status).toBe(200);

    const createServiceOverrideResponse = await fetch(
      `${baseUrl}/v1/admin/provider-comp-plans`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          providerSlug: "ava-chen",
          locationSlug: "daysi-flagship",
          serviceSlug: "laser-hair-removal",
          commissionPercent: 45,
          appliesToRevenueStream: "services",
        }),
      },
    );

    expect(createServiceOverrideResponse.status).toBe(201);

    const adminCompPlansResponse = await fetch(
      `${baseUrl}/v1/admin/provider-comp-plans?locationSlug=daysi-flagship`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const adminCompPlansPayload = (await adminCompPlansResponse.json()) as {
      data: {
        compPlans: Array<{
          providerSlug: string;
          serviceSlug?: string;
          commissionPercent: number;
        }>;
      };
    };

    expect(adminCompPlansResponse.status).toBe(200);
    expect(
      adminCompPlansPayload.data.compPlans.find(
        (plan) => plan.providerSlug === "ava-chen" && !plan.serviceSlug,
      )
        ?.commissionPercent,
    ).toBe(42);
    expect(
      adminCompPlansPayload.data.compPlans.find(
        (plan) =>
          plan.providerSlug === "ava-chen" &&
          plan.serviceSlug === "laser-hair-removal",
      )?.commissionPercent,
    ).toBe(45);
  });

  it("exposes role catalogs and scoped role assignments for franchise operators", async () => {
    const ownerToken = await createBootstrapSession({
      email: "owner.roles@daysi.ca",
      displayName: "Role Owner",
      requestedRole: "owner",
      providerUserId: "owner-user-role-ops-1",
    });

    const createLocationResponse = await fetch(`${baseUrl}/v1/admin/locations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        slug: "daysi-franchise-east",
        name: "Daysi Franchise East",
        organizationId: "org_daysi",
        enabledModules: ["memberships"],
        operatingSchedule: [
          {
            dayOfWeek: 1,
            startMinute: 9 * 60,
            endMinute: 17 * 60,
          },
        ],
      }),
    });

    expect(createLocationResponse.status).toBe(201);

    const rolesResponse = await fetch(`${baseUrl}/v1/admin/roles`, {
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
    });
    const rolesPayload = (await rolesResponse.json()) as {
      data: {
        roles: Array<{
          code: string;
          assignable: boolean;
          requiresLocationScope: boolean;
          permissions: string[];
        }>;
      };
    };

    expect(rolesResponse.status).toBe(200);
    expect(rolesPayload.data.roles.find((role) => role.code === "admin")?.assignable).toBe(
      true,
    );
    expect(
      rolesPayload.data.roles.find((role) => role.code === "admin")?.permissions,
    ).toContain("admin.location.manage");
    expect(rolesPayload.data.roles.find((role) => role.code === "owner")?.assignable).toBe(
      false,
    );

    const createRoleAssignmentResponse = await fetch(
      `${baseUrl}/v1/admin/role-assignments`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          email: "franchise.admin@daysi.ca",
          role: "admin",
          locationScopes: ["daysi-franchise-east"],
        }),
      },
    );

    expect(createRoleAssignmentResponse.status).toBe(201);

    const roleAssignmentsResponse = await fetch(
      `${baseUrl}/v1/admin/role-assignments?locationSlug=daysi-franchise-east`,
      {
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
      },
    );
    const roleAssignmentsPayload = (await roleAssignmentsResponse.json()) as {
      data: {
        assignments: Array<{
          email: string;
          role: string;
          locationScopes: string[];
        }>;
      };
    };

    expect(roleAssignmentsResponse.status).toBe(200);
    expect(
      roleAssignmentsPayload.data.assignments.find(
        (assignment) => assignment.email === "franchise.admin@daysi.ca",
      )?.locationScopes,
    ).toEqual(["daysi-franchise-east"]);

    const scopedSessionResponse = await fetch(`${baseUrl}/v1/auth/session/exchange`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        tenantSlug: "daysi",
        providerUserId: "franchise-admin-1",
        email: "franchise.admin@daysi.ca",
        displayName: "Franchise Admin",
        requestedRole: "admin",
        locationScopes: ["daysi-franchise-east"],
      }),
    });
    const scopedSessionPayload = (await scopedSessionResponse.json()) as {
      data: {
        actor: { locationScopes: string[] };
      };
    };

    expect(scopedSessionResponse.status).toBe(200);
    expect(scopedSessionPayload.data.actor.locationScopes).toEqual(["daysi-franchise-east"]);

    const invalidScopedSessionResponse = await fetch(`${baseUrl}/v1/auth/session/exchange`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        tenantSlug: "daysi",
        providerUserId: "franchise-admin-2",
        email: "franchise.admin@daysi.ca",
        displayName: "Franchise Admin",
        requestedRole: "admin",
        locationScopes: ["daysi-flagship"],
      }),
    });

    expect(invalidScopedSessionResponse.status).toBe(400);
  });

  it("reads and updates business profiles with scoped admin access", async () => {
    const ownerToken = await createBootstrapSession({
      email: "owner@daysi.ca",
      displayName: "Daysi Owner",
      requestedRole: "owner",
      providerUserId: "owner-user-business-profile-1",
    });

    const createLocationResponse = await fetch(`${baseUrl}/v1/admin/locations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        slug: "daysi-franchise-east",
        name: "Daysi Franchise East",
        organizationId: "org_daysi",
        enabledModules: ["memberships"],
        operatingSchedule: [
          {
            dayOfWeek: 1,
            startMinute: 9 * 60,
            endMinute: 17 * 60,
          },
        ],
      }),
    });

    expect(createLocationResponse.status).toBe(201);

    const createAssignmentResponse = await fetch(`${baseUrl}/v1/admin/role-assignments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        email: "scoped.business.admin@daysi.ca",
        role: "admin",
        locationScopes: ["daysi-flagship"],
      }),
    });

    expect(createAssignmentResponse.status).toBe(201);

    const scopedAdminToken = await createBootstrapSession({
      email: "scoped.business.admin@daysi.ca",
      displayName: "Scoped Business Admin",
      requestedRole: "admin",
      providerUserId: "scoped-business-admin-1",
    });

    const profile = {
      businessName: "Daysi Flagship Studio",
      tagline: "Advanced skin and laser care.",
      addressLine1: "123 Prairie Avenue",
      addressLine2: "Suite 400",
      city: "Regina",
      province: "SK",
      postalCode: "S4P 0A1",
      phone: "306-555-0110",
      email: "hello@daysi.ca",
      instagramUrl: "https://instagram.com/daysiskin",
      facebookUrl: "https://facebook.com/daysiskin",
      hoursWeekday: "9am - 6pm",
      hoursSaturday: "10am - 4pm",
      hoursSunday: "Closed",
      metaKeywords: "daysi, skincare, regina",
      metaDescription: "Daysi flagship business profile served from tenant settings.",
    };

    const updateProfileResponse = await fetch(`${baseUrl}/v1/admin/business-profile`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${scopedAdminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        profile,
      }),
    });
    const updateProfilePayload = (await updateProfileResponse.json()) as {
      data: {
        locationSlug: string;
        profile: {
          businessName: string;
          city: string;
        };
      };
    };

    expect(updateProfileResponse.status).toBe(200);
    expect(updateProfilePayload.data.locationSlug).toBe("daysi-flagship");
    expect(updateProfilePayload.data.profile.businessName).toBe(profile.businessName);

    const adminReadResponse = await fetch(
      `${baseUrl}/v1/admin/business-profile?locationSlug=daysi-flagship`,
      {
        headers: {
          authorization: `Bearer ${scopedAdminToken}`,
        },
      },
    );
    const adminReadPayload = (await adminReadResponse.json()) as {
      data: {
        profile: {
          businessName: string;
          city: string;
        } | null;
      };
    };

    expect(adminReadResponse.status).toBe(200);
    expect(adminReadPayload.data.profile?.businessName).toBe(profile.businessName);
    expect(adminReadPayload.data.profile?.city).toBe(profile.city);

    const publicReadResponse = await fetch(
      `${baseUrl}/v1/public/locations/daysi-flagship/business-profile`,
    );
    const publicReadPayload = (await publicReadResponse.json()) as {
      data: {
        locationSlug: string;
        profile: {
          businessName: string;
        } | null;
      };
    };

    expect(publicReadResponse.status).toBe(200);
    expect(publicReadPayload.data.locationSlug).toBe("daysi-flagship");
    expect(publicReadPayload.data.profile?.businessName).toBe(profile.businessName);

    const unknownPublicResponse = await fetch(
      `${baseUrl}/v1/public/locations/unknown-location/business-profile`,
    );

    expect(unknownPublicResponse.status).toBe(404);

    const forbiddenReadResponse = await fetch(
      `${baseUrl}/v1/admin/business-profile?locationSlug=daysi-franchise-east`,
      {
        headers: {
          authorization: `Bearer ${scopedAdminToken}`,
        },
      },
    );

    expect(forbiddenReadResponse.status).toBe(403);

    const forbiddenWriteResponse = await fetch(`${baseUrl}/v1/admin/business-profile`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${scopedAdminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-franchise-east",
        profile,
      }),
    });

    expect(forbiddenWriteResponse.status).toBe(403);
  });

  it("revokes role assignments with scope checks and invalidates revoked admin sessions", async () => {
    const ownerToken = await createBootstrapSession({
      email: "owner@daysi.ca",
      displayName: "Daysi Owner",
      requestedRole: "owner",
      providerUserId: "owner-user-revoke-1",
    });

    const createLocationResponse = await fetch(`${baseUrl}/v1/admin/locations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        slug: "daysi-franchise-east",
        name: "Daysi Franchise East",
        organizationId: "org_daysi",
        enabledModules: ["memberships"],
        operatingSchedule: [
          {
            dayOfWeek: 1,
            startMinute: 9 * 60,
            endMinute: 17 * 60,
          },
        ],
      }),
    });

    expect(createLocationResponse.status).toBe(201);

    const createFlagshipAdminResponse = await fetch(`${baseUrl}/v1/admin/role-assignments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        email: "flagship.admin@daysi.ca",
        role: "admin",
        locationScopes: ["daysi-flagship"],
      }),
    });
    const flagshipAdminPayload = (await createFlagshipAdminResponse.json()) as {
      data: {
        assignment: { id: string };
      };
    };

    expect(createFlagshipAdminResponse.status).toBe(201);

    const createFlagshipStaffResponse = await fetch(`${baseUrl}/v1/admin/role-assignments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        email: "flagship.staff@daysi.ca",
        role: "staff",
        locationScopes: ["daysi-flagship"],
      }),
    });
    const flagshipStaffPayload = (await createFlagshipStaffResponse.json()) as {
      data: {
        assignment: { id: string };
      };
    };

    expect(createFlagshipStaffResponse.status).toBe(201);

    const createEastStaffResponse = await fetch(`${baseUrl}/v1/admin/role-assignments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        email: "east.staff@daysi.ca",
        role: "staff",
        locationScopes: ["daysi-franchise-east"],
      }),
    });
    const eastStaffPayload = (await createEastStaffResponse.json()) as {
      data: {
        assignment: { id: string };
      };
    };

    expect(createEastStaffResponse.status).toBe(201);

    const flagshipAdminToken = await createBootstrapSession({
      email: "flagship.admin@daysi.ca",
      displayName: "Flagship Admin",
      requestedRole: "admin",
      providerUserId: "flagship-admin-revoke-1",
    });

    const scopedDeleteResponse = await fetch(
      `${baseUrl}/v1/admin/role-assignments/${flagshipStaffPayload.data.assignment.id}`,
      {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${flagshipAdminToken}`,
        },
      },
    );

    expect(scopedDeleteResponse.status).toBe(200);

    const forbiddenDeleteResponse = await fetch(
      `${baseUrl}/v1/admin/role-assignments/${eastStaffPayload.data.assignment.id}`,
      {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${flagshipAdminToken}`,
        },
      },
    );

    expect(forbiddenDeleteResponse.status).toBe(403);

    const ownerDeleteResponse = await fetch(
      `${baseUrl}/v1/admin/role-assignments/${flagshipAdminPayload.data.assignment.id}`,
      {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
      },
    );

    expect(ownerDeleteResponse.status).toBe(200);

    const revokedSessionRouteResponse = await fetch(
      `${baseUrl}/v1/admin/role-assignments?locationSlug=daysi-flagship`,
      {
        headers: {
          authorization: `Bearer ${flagshipAdminToken}`,
        },
      },
    );

    expect(revokedSessionRouteResponse.status).toBe(403);

    const revokedSessionExchangeResponse = await exchangeBootstrapSession({
      email: "flagship.admin@daysi.ca",
      displayName: "Flagship Admin",
      requestedRole: "admin",
      providerUserId: "flagship-admin-revoke-2",
    });
    const revokedSessionExchangePayload = (await revokedSessionExchangeResponse.json()) as {
      error?: { message?: string };
    };

    expect(revokedSessionExchangeResponse.status).toBe(400);
    expect(revokedSessionExchangePayload.error?.message).toContain("access assignment");
  });

  it("lets scoped admins list, create, and update referral programs for allowed locations", async () => {
    const ownerToken = await createBootstrapSession({
      email: "owner@daysi.ca",
      displayName: "Daysi Owner",
      requestedRole: "owner",
      providerUserId: "owner-user-referral-admin-1",
    });

    const createLocationResponse = await fetch(`${baseUrl}/v1/admin/locations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        slug: "daysi-referrals-east",
        name: "Daysi Referrals East",
        organizationId: "org_daysi",
        enabledModules: ["referrals"],
        operatingSchedule: [
          {
            dayOfWeek: 1,
            startMinute: 9 * 60,
            endMinute: 17 * 60,
          },
        ],
      }),
    });

    expect(createLocationResponse.status).toBe(201);

    const createAssignmentResponse = await fetch(`${baseUrl}/v1/admin/role-assignments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        email: "referrals.admin@daysi.ca",
        role: "admin",
        locationScopes: ["daysi-referrals-east"],
      }),
    });

    expect(createAssignmentResponse.status).toBe(201);

    const scopedAdminToken = await createBootstrapSession({
      email: "referrals.admin@daysi.ca",
      displayName: "Referrals Admin",
      requestedRole: "admin",
      providerUserId: "referrals-admin-1",
    });

    const createProgramResponse = await fetch(`${baseUrl}/v1/admin/referrals/programs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${scopedAdminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-referrals-east",
        name: "East Launch Rewards",
        status: "draft",
        codePrefix: "EAST",
        referredReward: {
          kind: "account_credit",
          amount: {
            currency: "CAD",
            amountCents: 1500,
          },
        },
        advocateReward: {
          kind: "account_credit",
          amount: {
            currency: "CAD",
            amountCents: 2500,
          },
        },
      }),
    });
    const createProgramPayload = (await createProgramResponse.json()) as {
      data: {
        program: {
          id: string;
          status: string;
          codePrefix: string;
        };
      };
    };

    expect(createProgramResponse.status).toBe(201);
    expect(createProgramPayload.data.program.status).toBe("draft");
    expect(createProgramPayload.data.program.codePrefix).toBe("EAST");

    const listProgramsResponse = await fetch(
      `${baseUrl}/v1/admin/referrals/programs?locationSlug=daysi-referrals-east`,
      {
        headers: {
          authorization: `Bearer ${scopedAdminToken}`,
        },
      },
    );
    const listProgramsPayload = (await listProgramsResponse.json()) as {
      data: {
        programs: Array<{
          id: string;
          codePrefix: string;
        }>;
      };
    };

    expect(listProgramsResponse.status).toBe(200);
    expect(listProgramsPayload.data.programs).toHaveLength(1);
    expect(listProgramsPayload.data.programs[0]?.id).toBe(createProgramPayload.data.program.id);

    const updateProgramResponse = await fetch(
      `${baseUrl}/v1/admin/referrals/programs/${createProgramPayload.data.program.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${scopedAdminToken}`,
        },
        body: JSON.stringify({
          status: "active",
          codePrefix: "SUN",
          advocateReward: {
            kind: "account_credit",
            amount: {
              currency: "CAD",
              amountCents: 3500,
            },
          },
        }),
      },
    );
    const updateProgramPayload = (await updateProgramResponse.json()) as {
      data: {
        program: {
          status: string;
          codePrefix: string;
          advocateReward?: {
            amount: {
              amountCents: number;
            };
          };
        };
      };
    };

    expect(updateProgramResponse.status).toBe(200);
    expect(updateProgramPayload.data.program.status).toBe("active");
    expect(updateProgramPayload.data.program.codePrefix).toBe("SUN");
    expect(updateProgramPayload.data.program.advocateReward?.amount.amountCents).toBe(3500);

    const forbiddenProgramResponse = await fetch(`${baseUrl}/v1/admin/referrals/programs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${scopedAdminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        name: "Out of Scope Program",
      }),
    });

    expect(forbiddenProgramResponse.status).toBe(403);
  });

  it("lets admins onboard providers into new locations and make them bookable", async () => {
    const adminToken = await createBootstrapSession({
      email: "owner@daysi.ca",
      displayName: "Daysi Owner",
      requestedRole: "owner",
      providerUserId: "owner-user-provider-ops-1",
    });

    const createLocationResponse = await fetch(`${baseUrl}/v1/admin/locations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        slug: "daysi-west",
        name: "Daysi West",
        organizationId: "org_daysi",
        enabledModules: ["memberships"],
        operatingSchedule: [
          {
            dayOfWeek: 1,
            startMinute: 9 * 60,
            endMinute: 17 * 60,
          },
        ],
      }),
    });

    expect(createLocationResponse.status).toBe(201);

    const createServiceResponse = await fetch(`${baseUrl}/v1/admin/services`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-west",
        slug: "laser-resurfacing",
        variantSlug: "laser-resurfacing-60",
        categorySlug: "laser",
        name: "Laser Resurfacing",
        shortDescription: "Resurfacing treatment for texture and tone.",
        description: "Location-scoped resurfacing service for provider onboarding validation.",
        durationMinutes: 60,
        bookable: true,
        price: {
          currency: "CAD",
          retailAmountCents: 32900,
          memberAmountCents: 28900,
          membershipRequired: false,
        },
        bookingPolicy: {
          cancellationWindowHours: 24,
          bufferMinutes: 15,
          requiresDeposit: false,
        },
        machineCapabilities: ["laser-resurfacing"],
        featureTags: ["laser", "bookable"],
      }),
    });

    expect(createServiceResponse.status).toBe(201);

    const createMachineResponse = await fetch(`${baseUrl}/v1/admin/machines`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-west",
        slug: "co2-west-a",
        name: "CO2 West A",
        capabilities: ["laser-resurfacing"],
        template: [
          {
            dayOfWeek: 1,
            startMinute: 9 * 60,
            endMinute: 17 * 60,
          },
        ],
        blockedWindows: [],
      }),
    });

    expect(createMachineResponse.status).toBe(201);

    const createProviderResponse = await fetch(`${baseUrl}/v1/admin/providers`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-west",
        slug: "noor-ali",
        name: "Noor Ali",
        email: "noor.ali@daysi.ca",
        serviceSlugs: ["laser-resurfacing"],
        template: [
          {
            dayOfWeek: 1,
            startMinute: 10 * 60,
            endMinute: 17 * 60,
          },
        ],
        blockedWindows: [],
      }),
    });

    expect(createProviderResponse.status).toBe(201);

    const patchProviderResponse = await fetch(`${baseUrl}/v1/admin/providers/noor-ali`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-west",
        name: "Noor Ali West",
        template: [
          {
            dayOfWeek: 1,
            startMinute: 12 * 60,
            endMinute: 16 * 60,
          },
        ],
      }),
    });

    expect(patchProviderResponse.status).toBe(200);

    const adminProvidersResponse = await fetch(
      `${baseUrl}/v1/admin/providers?locationSlug=daysi-west`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const adminProvidersPayload = (await adminProvidersResponse.json()) as {
      data: {
        providers: Array<{ providerSlug: string; providerName: string }>;
      };
    };

    expect(adminProvidersResponse.status).toBe(200);
    expect(
      adminProvidersPayload.data.providers.find((provider) => provider.providerSlug === "noor-ali")
        ?.providerName,
    ).toBe("Noor Ali West");

    const providerToken = await createBootstrapSession({
      email: "noor.ali@daysi.ca",
      displayName: "Noor Ali West",
      requestedRole: "provider",
      providerUserId: "provider-user-noor-west",
    });

    const providerScheduleResponse = await fetch(`${baseUrl}/v1/provider/me/schedule`, {
      headers: {
        authorization: `Bearer ${providerToken}`,
      },
    });
    const providerSchedulePayload = (await providerScheduleResponse.json()) as {
      data: {
        schedule: {
          providerSlug: string;
          template: Array<{ startMinute: number }>;
        };
      };
    };

    expect(providerScheduleResponse.status).toBe(200);
    expect(providerSchedulePayload.data.schedule.providerSlug).toBe("noor-ali");
    expect(providerSchedulePayload.data.schedule.template[0]?.startMinute).toBe(720);

    const availabilityResponse = await fetch(`${baseUrl}/v1/public/availability/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: "daysi-west",
        serviceSlug: "laser-resurfacing",
        fromDate: "2026-03-09",
        toDate: "2026-03-09",
        pricingMode: "retail",
      }),
    });
    const availabilityPayload = (await availabilityResponse.json()) as {
      data: {
        slots: Array<{ slotId: string; providerSlug: string; startAt: string }>;
      };
    };

    expect(availabilityResponse.status).toBe(200);
    expect(availabilityPayload.data.slots.length).toBeGreaterThan(0);
    expect(availabilityPayload.data.slots[0]?.providerSlug).toBe("noor-ali");
    expect(availabilityPayload.data.slots[0]?.startAt).toBe("2026-03-09T12:00:00.000Z");

    const bookingResponse = await fetch(`${baseUrl}/v1/public/bookings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "daysi-west-booking-create",
      },
      body: JSON.stringify({
        locationSlug: "daysi-west",
        serviceSlug: "laser-resurfacing",
        serviceVariantSlug: "laser-resurfacing-60",
        slotId: availabilityPayload.data.slots[0]?.slotId,
        pricingMode: "retail",
        customer: {
          firstName: "West",
          lastName: "Customer",
          email: "west.customer@example.com",
        },
      }),
    });
    const bookingPayload = (await bookingResponse.json()) as {
      data: {
        booking: { providerSlug: string; machineSlug: string };
      };
    };

    expect(bookingResponse.status).toBe(201);
    expect(bookingPayload.data.booking.providerSlug).toBe("noor-ali");
    expect(bookingPayload.data.booking.machineSlug).toBe("co2-west-a");
  });

  it("enforces location-scoped admin access for franchise-style operations", async () => {
    const ownerToken = await createBootstrapSession({
      email: "owner@daysi.ca",
      displayName: "Daysi Owner",
      requestedRole: "owner",
      providerUserId: "owner-user-1",
      locationScopes: ["daysi-flagship"],
    });

    const createOrganizationResponse = await fetch(`${baseUrl}/v1/admin/organizations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        slug: "daysi-franchise-group-1",
        name: "Daysi Franchise Group 1",
        operatingMode: "franchise",
      }),
    });
    const createOrganizationPayload = (await createOrganizationResponse.json()) as {
      data: {
        organization: { id: string; slug: string };
      };
    };

    expect(createOrganizationResponse.status).toBe(201);

    const createLocationResponse = await fetch(`${baseUrl}/v1/admin/locations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        slug: "daysi-franchise-1",
        name: "Daysi Franchise 1",
        organizationId: createOrganizationPayload.data.organization.id,
        enabledModules: ["memberships"],
        operatingSchedule: [
          {
            dayOfWeek: 1,
            startMinute: 9 * 60,
            endMinute: 17 * 60,
          },
        ],
      }),
    });

    expect(createLocationResponse.status).toBe(201);

    const createAssignmentResponse = await fetch(`${baseUrl}/v1/admin/access-assignments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        email: "franchise.manager@daysi.ca",
        role: "admin",
        locationScopes: ["daysi-franchise-1"],
      }),
    });

    expect(createAssignmentResponse.status).toBe(201);

    const franchiseAdminToken = await createBootstrapSession({
      email: "franchise.manager@daysi.ca",
      displayName: "Franchise Manager",
      requestedRole: "admin",
      providerUserId: "franchise-admin-1",
    });

    const locationsResponse = await fetch(`${baseUrl}/v1/admin/locations`, {
      headers: {
        authorization: `Bearer ${franchiseAdminToken}`,
      },
    });
    const locationsPayload = (await locationsResponse.json()) as {
      data: {
        locations: Array<{ slug: string }>;
      };
    };

    expect(locationsResponse.status).toBe(200);
    expect(locationsPayload.data.locations.map((location) => location.slug)).toEqual([
      "daysi-franchise-1",
    ]);

    const organizationsResponse = await fetch(`${baseUrl}/v1/admin/organizations`, {
      headers: {
        authorization: `Bearer ${franchiseAdminToken}`,
      },
    });
    const organizationsPayload = (await organizationsResponse.json()) as {
      data: {
        organizations: Array<{ slug: string }>;
      };
    };

    expect(organizationsResponse.status).toBe(200);
    expect(organizationsPayload.data.organizations.map((organization) => organization.slug)).toEqual([
      createOrganizationPayload.data.organization.slug,
    ]);

    const restrictedServicesResponse = await fetch(
      `${baseUrl}/v1/admin/services?locationSlug=daysi-flagship`,
      {
        headers: {
          authorization: `Bearer ${franchiseAdminToken}`,
        },
      },
    );

    expect(restrictedServicesResponse.status).toBe(403);
  });

  it("builds multi-location benchmarks and respects scoped franchise reporting access", async () => {
    const ownerToken = await createBootstrapSession({
      email: "owner.benchmark@daysi.ca",
      displayName: "Benchmark Owner",
      requestedRole: "owner",
      providerUserId: "owner-user-benchmark-1",
    });

    const flagshipBookingResponse = await fetch(`${baseUrl}/v1/public/bookings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "benchmark-flagship-booking-create",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        serviceVariantSlug: "laser-hair-removal-full-body-60",
        slotId:
          "daysi-flagship__laser-hair-removal-full-body-60__ava-chen__gentlemax-pro-a__2026-03-09T09:00:00.000Z",
        pricingMode: "retail",
        customer: {
          firstName: "Flagship",
          lastName: "Benchmark",
          email: "flagship.benchmark@example.com",
        },
      }),
    });
    const flagshipBookingPayload = (await flagshipBookingResponse.json()) as {
      data: {
        booking: { id: string };
        managementToken: string;
      };
    };

    expect(flagshipBookingResponse.status).toBe(201);

    const flagshipCheckoutResponse = await fetch(`${baseUrl}/v1/checkout/confirm`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "benchmark-flagship-checkout-confirm",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        items: [
          {
            kind: "booking",
            bookingId: flagshipBookingPayload.data.booking.id,
            managementToken: flagshipBookingPayload.data.managementToken,
          },
        ],
        customer: {
          firstName: "Flagship",
          lastName: "Benchmark",
          email: "flagship.benchmark@example.com",
        },
        paymentMethod: "stripe",
      }),
    });
    const flagshipCheckoutPayload = (await flagshipCheckoutResponse.json()) as {
      data: {
        order: { id: string };
        paymentSession: { paymentIntentId: string };
      };
    };

    expect(flagshipCheckoutResponse.status).toBe(201);

    const flagshipWebhookResponse = await postStripeWebhook({
      eventId: "evt_benchmark_flagship_paid",
      paymentIntentId: flagshipCheckoutPayload.data.paymentSession.paymentIntentId,
      orderId: flagshipCheckoutPayload.data.order.id,
      timestamp: "1741364000",
    });

    expect(flagshipWebhookResponse.status).toBe(200);

    const createLocationResponse = await fetch(`${baseUrl}/v1/admin/locations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        slug: "daysi-benchmark-west",
        name: "Daysi Benchmark West",
        organizationId: "org_daysi",
        enabledModules: ["memberships"],
        operatingSchedule: [
          {
            dayOfWeek: 1,
            startMinute: 9 * 60,
            endMinute: 17 * 60,
          },
        ],
      }),
    });

    expect(createLocationResponse.status).toBe(201);

    const createServiceResponse = await fetch(`${baseUrl}/v1/admin/services`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-benchmark-west",
        slug: "laser-resurfacing",
        variantSlug: "laser-resurfacing-60",
        categorySlug: "laser",
        name: "Laser Resurfacing",
        shortDescription: "Benchmark west resurfacing service.",
        description: "Higher-value resurfacing service for multi-location benchmark proof.",
        durationMinutes: 60,
        bookable: true,
        price: {
          currency: "CAD",
          retailAmountCents: 34900,
          memberAmountCents: 30900,
          membershipRequired: false,
        },
        bookingPolicy: {
          cancellationWindowHours: 24,
          bufferMinutes: 10,
          requiresDeposit: false,
        },
        machineCapabilities: ["laser-resurfacing"],
        featureTags: ["laser", "benchmark"],
      }),
    });

    expect(createServiceResponse.status).toBe(201);

    const createMachineResponse = await fetch(`${baseUrl}/v1/admin/machines`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-benchmark-west",
        slug: "co2-benchmark-west-a",
        name: "CO2 Benchmark West A",
        capabilities: ["laser-resurfacing"],
        template: [
          {
            dayOfWeek: 1,
            startMinute: 9 * 60,
            endMinute: 17 * 60,
          },
        ],
        blockedWindows: [],
      }),
    });

    expect(createMachineResponse.status).toBe(201);

    const createProviderResponse = await fetch(`${baseUrl}/v1/admin/providers`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-benchmark-west",
        slug: "noor-benchmark",
        name: "Noor Benchmark",
        email: "noor.benchmark@daysi.ca",
        serviceSlugs: ["laser-resurfacing"],
        template: [
          {
            dayOfWeek: 1,
            startMinute: 12 * 60,
            endMinute: 16 * 60,
          },
        ],
        blockedWindows: [],
      }),
    });

    expect(createProviderResponse.status).toBe(201);

    const westAvailabilityResponse = await fetch(`${baseUrl}/v1/public/availability/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: "daysi-benchmark-west",
        serviceSlug: "laser-resurfacing",
        fromDate: "2026-03-09",
        toDate: "2026-03-09",
        pricingMode: "retail",
      }),
    });
    const westAvailabilityPayload = (await westAvailabilityResponse.json()) as {
      data: {
        slots: Array<{ slotId: string }>;
      };
    };

    expect(westAvailabilityResponse.status).toBe(200);
    expect(westAvailabilityPayload.data.slots.length).toBeGreaterThan(0);

    const westBookingResponse = await fetch(`${baseUrl}/v1/public/bookings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "benchmark-west-booking-create",
      },
      body: JSON.stringify({
        locationSlug: "daysi-benchmark-west",
        serviceSlug: "laser-resurfacing",
        serviceVariantSlug: "laser-resurfacing-60",
        slotId: westAvailabilityPayload.data.slots[0]?.slotId,
        pricingMode: "retail",
        customer: {
          firstName: "West",
          lastName: "Benchmark",
          email: "west.benchmark@example.com",
        },
      }),
    });
    const westBookingPayload = (await westBookingResponse.json()) as {
      data: {
        booking: { id: string };
        managementToken: string;
      };
    };

    expect(westBookingResponse.status).toBe(201);

    const westCheckoutResponse = await fetch(`${baseUrl}/v1/checkout/confirm`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "benchmark-west-checkout-confirm",
      },
      body: JSON.stringify({
        locationSlug: "daysi-benchmark-west",
        items: [
          {
            kind: "booking",
            bookingId: westBookingPayload.data.booking.id,
            managementToken: westBookingPayload.data.managementToken,
          },
        ],
        customer: {
          firstName: "West",
          lastName: "Benchmark",
          email: "west.benchmark@example.com",
        },
        paymentMethod: "stripe",
      }),
    });
    const westCheckoutPayload = (await westCheckoutResponse.json()) as {
      data: {
        order: { id: string };
        paymentSession: { paymentIntentId: string };
      };
    };

    expect(westCheckoutResponse.status).toBe(201);

    const westWebhookResponse = await postStripeWebhook({
      eventId: "evt_benchmark_west_paid",
      paymentIntentId: westCheckoutPayload.data.paymentSession.paymentIntentId,
      orderId: westCheckoutPayload.data.order.id,
      timestamp: "1741364300",
    });

    expect(westWebhookResponse.status).toBe(200);

    const createAssignmentResponse = await fetch(`${baseUrl}/v1/admin/role-assignments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        email: "benchmark.manager@daysi.ca",
        role: "admin",
        locationScopes: ["daysi-benchmark-west"],
      }),
    });

    expect(createAssignmentResponse.status).toBe(201);

    const scopedAdminToken = await createBootstrapSession({
      email: "benchmark.manager@daysi.ca",
      displayName: "Benchmark Manager",
      requestedRole: "admin",
      providerUserId: "benchmark-admin-1",
    });

    const ownerReportResponse = await fetch(
      `${baseUrl}/v1/admin/reports/multi-location-benchmark?organizationId=org_daysi&fromDate=2026-03-08&toDate=2026-03-15`,
      {
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
      },
    );
    const ownerReportPayload = (await ownerReportResponse.json()) as {
      data: {
        organization?: { id: string };
        totals: {
          locationCount: number;
          netRevenueAmount: { amountCents: number };
        };
        locations: Array<{
          locationSlug: string;
          revenueRank: number;
          netRevenueAmount: { amountCents: number };
          peerDelta: {
            peerLocationCount: number;
            netRevenueAmount: { amountCents: number };
          };
        }>;
      };
    };

    expect(ownerReportResponse.status).toBe(200);
    expect(ownerReportPayload.data.organization?.id).toBe("org_daysi");
    expect(ownerReportPayload.data.totals.locationCount).toBe(2);
    expect(ownerReportPayload.data.totals.netRevenueAmount.amountCents).toBe(64800);
    expect(ownerReportPayload.data.locations[0]?.locationSlug).toBe("daysi-benchmark-west");
    expect(ownerReportPayload.data.locations[0]?.revenueRank).toBe(1);
    expect(ownerReportPayload.data.locations[0]?.netRevenueAmount.amountCents).toBe(34900);
    expect(ownerReportPayload.data.locations[0]?.peerDelta.peerLocationCount).toBe(1);
    expect(ownerReportPayload.data.locations[0]?.peerDelta.netRevenueAmount.amountCents).toBe(
      5000,
    );
    expect(ownerReportPayload.data.locations[1]?.locationSlug).toBe("daysi-flagship");

    const scopedReportResponse = await fetch(
      `${baseUrl}/v1/admin/reports/multi-location-benchmark?organizationId=org_daysi&fromDate=2026-03-08&toDate=2026-03-15`,
      {
        headers: {
          authorization: `Bearer ${scopedAdminToken}`,
        },
      },
    );
    const scopedReportPayload = (await scopedReportResponse.json()) as {
      data: {
        totals: {
          locationCount: number;
        };
        locations: Array<{
          locationSlug: string;
          peerDelta: {
            peerLocationCount: number;
            netRevenueAmount: { amountCents: number };
          };
        }>;
      };
    };

    expect(scopedReportResponse.status).toBe(200);
    expect(scopedReportPayload.data.totals.locationCount).toBe(1);
    expect(scopedReportPayload.data.locations.map((location) => location.locationSlug)).toEqual([
      "daysi-benchmark-west",
    ]);
    expect(scopedReportPayload.data.locations[0]?.peerDelta.peerLocationCount).toBe(0);
    expect(scopedReportPayload.data.locations[0]?.peerDelta.netRevenueAmount.amountCents).toBe(0);
  });

  it("creates, approves, and pays provider payout runs by location", async () => {
    const adminToken = await createBootstrapSession({
      email: "admin@daysi.ca",
      displayName: "Daysi Admin",
      requestedRole: "admin",
      providerUserId: "admin-user-payout-run-1",
      locationScopes: ["daysi-flagship"],
    });

    const bookingResponse = await fetch(`${baseUrl}/v1/public/bookings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "payout-run-booking-create",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        serviceVariantSlug: "laser-hair-removal-full-body-60",
        slotId:
          "daysi-flagship__laser-hair-removal-full-body-60__ava-chen__gentlemax-pro-a__2026-03-09T09:00:00.000Z",
        pricingMode: "retail",
        customer: {
          firstName: "Payout",
          lastName: "Customer",
          email: "payout.customer@example.com",
        },
      }),
    });
    const bookingPayload = (await bookingResponse.json()) as {
      data: {
        booking: { id: string };
        managementToken: string;
      };
    };

    expect(bookingResponse.status).toBe(201);

    const checkoutResponse = await fetch(`${baseUrl}/v1/checkout/confirm`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "payout-run-checkout-confirm",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        items: [
          {
            kind: "booking",
            bookingId: bookingPayload.data.booking.id,
            managementToken: bookingPayload.data.managementToken,
          },
        ],
        customer: {
          firstName: "Payout",
          lastName: "Customer",
          email: "payout.customer@example.com",
        },
        paymentMethod: "stripe",
      }),
    });
    const checkoutPayload = (await checkoutResponse.json()) as {
      data: {
        order: { id: string };
        paymentSession: { paymentIntentId: string };
      };
    };

    expect(checkoutResponse.status).toBe(201);

    const webhookResponse = await postStripeWebhook({
      eventId: "evt_payout_run_payment_succeeded",
      paymentIntentId: checkoutPayload.data.paymentSession.paymentIntentId,
      orderId: checkoutPayload.data.order.id,
      timestamp: "1741363700",
    });

    expect(webhookResponse.status).toBe(200);

    const createServiceOverrideResponse = await fetch(
      `${baseUrl}/v1/admin/provider-comp-plans`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          providerSlug: "ava-chen",
          locationSlug: "daysi-flagship",
          serviceSlug: "laser-hair-removal",
          commissionPercent: 45,
          appliesToRevenueStream: "services",
        }),
      },
    );

    expect(createServiceOverrideResponse.status).toBe(201);

    const createPayoutRunResponse = await fetch(`${baseUrl}/v1/admin/payout-runs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        fromDate: "2026-03-01",
        toDate: "2026-03-31",
      }),
    });
    const createPayoutRunPayload = (await createPayoutRunResponse.json()) as {
      data: {
        payoutRun: {
          id: string;
          status: string;
          coveredOrderIds: string[];
        };
      };
    };

    expect(createPayoutRunResponse.status).toBe(201);
    expect(createPayoutRunPayload.data.payoutRun.status).toBe("draft");
    expect(createPayoutRunPayload.data.payoutRun.coveredOrderIds).toContain(
      checkoutPayload.data.order.id,
    );

    const approveResponse = await fetch(
      `${baseUrl}/v1/admin/payout-runs/${createPayoutRunPayload.data.payoutRun.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: "approved",
        }),
      },
    );

    expect(approveResponse.status).toBe(200);

    const payResponse = await fetch(
      `${baseUrl}/v1/admin/payout-runs/${createPayoutRunPayload.data.payoutRun.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: "paid",
        }),
      },
    );
    const payPayload = (await payResponse.json()) as {
      data: {
        payoutRun: {
          status: string;
          providerPayouts: Array<{
            providerSlug: string;
            totalPayoutAmountCents: number;
            lineItems: Array<{ serviceSlug: string; commissionPercent: number }>;
          }>;
        };
      };
    };

    expect(payResponse.status).toBe(200);
    expect(payPayload.data.payoutRun.status).toBe("paid");
    expect(payPayload.data.payoutRun.providerPayouts[0]?.providerSlug).toBe("ava-chen");
    expect(payPayload.data.payoutRun.providerPayouts[0]?.totalPayoutAmountCents).toBe(13455);
    expect(payPayload.data.payoutRun.providerPayouts[0]?.lineItems[0]?.serviceSlug).toBe(
      "laser-hair-removal",
    );
    expect(
      payPayload.data.payoutRun.providerPayouts[0]?.lineItems[0]?.commissionPercent,
    ).toBe(45);

    const listPayoutRunsResponse = await fetch(
      `${baseUrl}/v1/admin/payout-runs?locationSlug=daysi-flagship`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const listPayoutRunsPayload = (await listPayoutRunsResponse.json()) as {
      data: {
        payoutRuns: Array<{ id: string; status: string }>;
      };
    };

    expect(listPayoutRunsResponse.status).toBe(200);
    expect(listPayoutRunsPayload.data.payoutRuns[0]?.id).toBe(
      createPayoutRunPayload.data.payoutRun.id,
    );
    expect(listPayoutRunsPayload.data.payoutRuns[0]?.status).toBe("paid");
  });

  it("builds a location finance dashboard with revenue and payout totals", async () => {
    const adminToken = await createBootstrapSession({
      email: "admin@daysi.ca",
      displayName: "Daysi Admin",
      requestedRole: "admin",
      providerUserId: "admin-user-finance-1",
      locationScopes: ["daysi-flagship"],
    });

    const bookingResponse = await fetch(`${baseUrl}/v1/public/bookings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "location-finance-booking-create",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        serviceVariantSlug: "laser-hair-removal-full-body-60",
        slotId:
          "daysi-flagship__laser-hair-removal-full-body-60__ava-chen__gentlemax-pro-a__2026-03-09T09:00:00.000Z",
        pricingMode: "retail",
        customer: {
          firstName: "Finance",
          lastName: "Customer",
          email: "finance.customer@example.com",
        },
      }),
    });
    const bookingPayload = (await bookingResponse.json()) as {
      data: {
        booking: { id: string };
        managementToken: string;
      };
    };

    expect(bookingResponse.status).toBe(201);

    const checkoutResponse = await fetch(`${baseUrl}/v1/checkout/confirm`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "location-finance-checkout-confirm",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        items: [
          {
            kind: "booking",
            bookingId: bookingPayload.data.booking.id,
            managementToken: bookingPayload.data.managementToken,
          },
        ],
        customer: {
          firstName: "Finance",
          lastName: "Customer",
          email: "finance.customer@example.com",
        },
        paymentMethod: "stripe",
      }),
    });
    const checkoutPayload = (await checkoutResponse.json()) as {
      data: {
        order: { id: string };
        paymentSession: { paymentIntentId: string };
      };
    };

    expect(checkoutResponse.status).toBe(201);

    const webhookResponse = await postStripeWebhook({
      eventId: "evt_location_finance_paid",
      paymentIntentId: checkoutPayload.data.paymentSession.paymentIntentId,
      orderId: checkoutPayload.data.order.id,
      timestamp: "1741363800",
    });

    expect(webhookResponse.status).toBe(200);

    const createPayoutRunResponse = await fetch(`${baseUrl}/v1/admin/payout-runs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        fromDate: "2026-03-01",
        toDate: "2026-03-31",
      }),
    });
    const createPayoutRunPayload = (await createPayoutRunResponse.json()) as {
      data: {
        payoutRun: { id: string };
      };
    };

    expect(createPayoutRunResponse.status).toBe(201);

    const approveResponse = await fetch(
      `${baseUrl}/v1/admin/payout-runs/${createPayoutRunPayload.data.payoutRun.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: "approved",
        }),
      },
    );

    expect(approveResponse.status).toBe(200);

    const payResponse = await fetch(
      `${baseUrl}/v1/admin/payout-runs/${createPayoutRunPayload.data.payoutRun.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: "paid",
        }),
      },
    );

    expect(payResponse.status).toBe(200);

    const financeDashboardResponse = await fetch(
      `${baseUrl}/v1/admin/reports/location-finance?locationSlug=daysi-flagship`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const financeDashboardPayload = (await financeDashboardResponse.json()) as {
      data: {
        locationSlug: string;
        totals: {
          netAmount: { amountCents: number };
        };
        payoutRunCount: number;
        totalPayoutAmountCents: number;
        paidPayoutAmountCents: number;
        latestPayoutRunStatus?: string;
      };
    };

    expect(financeDashboardResponse.status).toBe(200);
    expect(financeDashboardPayload.data.locationSlug).toBe("daysi-flagship");
    expect(financeDashboardPayload.data.totals.netAmount.amountCents).toBe(29900);
    expect(financeDashboardPayload.data.payoutRunCount).toBe(1);
    expect(financeDashboardPayload.data.totalPayoutAmountCents).toBe(11362);
    expect(financeDashboardPayload.data.paidPayoutAmountCents).toBe(11362);
    expect(financeDashboardPayload.data.latestPayoutRunStatus).toBe("paid");
  });

  it("tracks onboarding readiness as a location moves from setup required to core ready", async () => {
    const ownerToken = await createBootstrapSession({
      email: "owner@daysi.ca",
      displayName: "Daysi Owner",
      requestedRole: "owner",
      providerUserId: "owner-user-onboarding-1",
    });

    const createLocationResponse = await fetch(`${baseUrl}/v1/admin/locations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        slug: "daysi-south",
        name: "Daysi South",
        organizationId: "org_daysi",
        enabledModules: ["memberships"],
        operatingSchedule: [
          {
            dayOfWeek: 1,
            startMinute: 9 * 60,
            endMinute: 17 * 60,
          },
        ],
      }),
    });

    expect(createLocationResponse.status).toBe(201);

    const createAssignmentResponse = await fetch(`${baseUrl}/v1/admin/access-assignments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        email: "south.manager@daysi.ca",
        role: "admin",
        locationScopes: ["daysi-south"],
      }),
    });

    expect(createAssignmentResponse.status).toBe(201);

    const southAdminToken = await createBootstrapSession({
      email: "south.manager@daysi.ca",
      displayName: "South Manager",
      requestedRole: "admin",
      providerUserId: "south-manager-1",
    });

    const initialOverviewResponse = await fetch(
      `${baseUrl}/v1/admin/onboarding/overview?locationSlug=daysi-south`,
      {
        headers: {
          authorization: `Bearer ${southAdminToken}`,
        },
      },
    );
    const initialOverviewPayload = (await initialOverviewResponse.json()) as {
      data: {
        overview: {
          status: string;
          counts: {
            serviceCount: number;
            providerCount: number;
            machineCount: number;
          };
        };
      };
    };

    expect(initialOverviewResponse.status).toBe(200);
    expect(initialOverviewPayload.data.overview.status).toBe("setup_required");
    expect(initialOverviewPayload.data.overview.counts.serviceCount).toBe(0);
    expect(initialOverviewPayload.data.overview.counts.providerCount).toBe(0);
    expect(initialOverviewPayload.data.overview.counts.machineCount).toBe(0);

    const createServiceResponse = await fetch(`${baseUrl}/v1/admin/services`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${southAdminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-south",
        slug: "laser-toning",
        variantSlug: "laser-toning-45",
        categorySlug: "laser",
        name: "Laser Toning",
        shortDescription: "South location onboarding service.",
        description: "Laser toning configured during onboarding.",
        durationMinutes: 45,
        bookable: true,
        price: {
          currency: "CAD",
          retailAmountCents: 23900,
          memberAmountCents: 19900,
          membershipRequired: false,
        },
        bookingPolicy: {
          cancellationWindowHours: 24,
          bufferMinutes: 10,
          requiresDeposit: false,
        },
        machineCapabilities: ["laser-toning"],
        featureTags: ["core"],
      }),
    });

    expect(createServiceResponse.status).toBe(201);

    const createMachineResponse = await fetch(`${baseUrl}/v1/admin/machines`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${southAdminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-south",
        slug: "south-laser-a",
        name: "South Laser A",
        capabilities: ["laser-toning"],
        template: [
          {
            dayOfWeek: 1,
            startMinute: 9 * 60,
            endMinute: 17 * 60,
          },
        ],
        blockedWindows: [],
      }),
    });

    expect(createMachineResponse.status).toBe(201);

    const createProviderResponse = await fetch(`${baseUrl}/v1/admin/providers`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${southAdminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-south",
        slug: "south-provider",
        name: "South Provider",
        email: "south.provider@daysi.ca",
        serviceSlugs: ["laser-toning"],
        template: [
          {
            dayOfWeek: 1,
            startMinute: 9 * 60,
            endMinute: 17 * 60,
          },
        ],
        blockedWindows: [],
      }),
    });

    expect(createProviderResponse.status).toBe(201);

    const finalOverviewResponse = await fetch(
      `${baseUrl}/v1/admin/onboarding/overview?locationSlug=daysi-south`,
      {
        headers: {
          authorization: `Bearer ${southAdminToken}`,
        },
      },
    );
    const finalOverviewPayload = (await finalOverviewResponse.json()) as {
      data: {
        overview: {
          status: string;
          counts: {
            serviceCount: number;
            providerCount: number;
            machineCount: number;
          };
        };
      };
    };

    expect(finalOverviewResponse.status).toBe(200);
    expect(finalOverviewPayload.data.overview.status).toBe("core_ready");
    expect(finalOverviewPayload.data.overview.counts.serviceCount).toBe(1);
    expect(finalOverviewPayload.data.overview.counts.providerCount).toBe(1);
    expect(finalOverviewPayload.data.overview.counts.machineCount).toBe(1);
  });

  it("lets scoped admins run import jobs and surfaces failed imports in onboarding", async () => {
    const ownerToken = await createBootstrapSession({
      email: "owner@daysi.ca",
      displayName: "Daysi Owner",
      requestedRole: "owner",
      providerUserId: "owner-user-imports-1",
    });

    const createLocationResponse = await fetch(`${baseUrl}/v1/admin/locations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        slug: "daysi-import",
        name: "Daysi Import",
        organizationId: "org_daysi",
        enabledModules: ["memberships", "education"],
        operatingSchedule: [
          {
            dayOfWeek: 2,
            startMinute: 9 * 60,
            endMinute: 17 * 60,
          },
        ],
      }),
    });

    expect(createLocationResponse.status).toBe(201);

    const createAssignmentResponse = await fetch(`${baseUrl}/v1/admin/access-assignments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        email: "imports.manager@daysi.ca",
        role: "admin",
        locationScopes: ["daysi-import"],
      }),
    });

    expect(createAssignmentResponse.status).toBe(201);

    const importAdminToken = await createBootstrapSession({
      email: "imports.manager@daysi.ca",
      displayName: "Imports Manager",
      requestedRole: "admin",
      providerUserId: "imports-manager-1",
    });

    const createImportJobResponse = await fetch(`${baseUrl}/v1/admin/import-jobs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${importAdminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-import",
        sourceSystem: "csv",
        entityType: "customers",
        fileName: "customers.csv",
        metadata: {
          initiatedFrom: "test-suite",
        },
        rows: [
          {
            rowNumber: 1,
            externalId: "legacy-1",
            rawPayload: {
              email: "import.one@example.com",
            },
          },
          {
            rowNumber: 2,
            externalId: "legacy-2",
            rawPayload: {
              email: "import.two@example.com",
            },
          },
        ],
      }),
    });
    const createImportJobPayload = (await createImportJobResponse.json()) as {
      data: {
        importJob: {
          id: string;
          counts: { totalRows: number; queuedRows: number };
        };
      };
    };

    expect(createImportJobResponse.status).toBe(201);
    expect(createImportJobPayload.data.importJob.counts.totalRows).toBe(2);
    expect(createImportJobPayload.data.importJob.counts.queuedRows).toBe(2);

    const patchImportJobResponse = await fetch(
      `${baseUrl}/v1/admin/import-jobs/${createImportJobPayload.data.importJob.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${importAdminToken}`,
        },
        body: JSON.stringify({
          status: "failed",
          rowUpdates: [
            {
              rowNumber: 1,
              status: "processed",
              normalizedPayload: {
                customerEmail: "import.one@example.com",
              },
            },
            {
              rowNumber: 2,
              status: "failed",
              errorMessage: "Missing phone number",
            },
          ],
          errorMessage: "One or more rows failed normalization",
        }),
      },
    );
    const patchImportJobPayload = (await patchImportJobResponse.json()) as {
      data: {
        importJob: {
          status: string;
          counts: {
            processedRows: number;
            failedRows: number;
          };
        };
      };
    };

    expect(patchImportJobResponse.status).toBe(200);
    expect(patchImportJobPayload.data.importJob.status).toBe("failed");
    expect(patchImportJobPayload.data.importJob.counts.processedRows).toBe(1);
    expect(patchImportJobPayload.data.importJob.counts.failedRows).toBe(1);

    const listImportJobsResponse = await fetch(
      `${baseUrl}/v1/admin/import-jobs?locationSlug=daysi-import`,
      {
        headers: {
          authorization: `Bearer ${importAdminToken}`,
        },
      },
    );
    const listImportJobsPayload = (await listImportJobsResponse.json()) as {
      data: {
        importJobs: Array<{ id: string; locationSlug: string }>;
      };
    };

    expect(listImportJobsResponse.status).toBe(200);
    expect(listImportJobsPayload.data.importJobs).toHaveLength(1);
    expect(listImportJobsPayload.data.importJobs[0]?.locationSlug).toBe("daysi-import");

    const restrictedImportJobsResponse = await fetch(
      `${baseUrl}/v1/admin/import-jobs?locationSlug=daysi-flagship`,
      {
        headers: {
          authorization: `Bearer ${importAdminToken}`,
        },
      },
    );

    expect(restrictedImportJobsResponse.status).toBe(403);

    const onboardingOverviewResponse = await fetch(
      `${baseUrl}/v1/admin/onboarding/overview?locationSlug=daysi-import`,
      {
        headers: {
          authorization: `Bearer ${importAdminToken}`,
        },
      },
    );
    const onboardingOverviewPayload = (await onboardingOverviewResponse.json()) as {
      data: {
        overview: {
          status: string;
          counts: {
            failedImportJobCount: number;
          };
        };
      };
    };

    expect(onboardingOverviewResponse.status).toBe(200);
    expect(onboardingOverviewPayload.data.overview.status).toBe("attention_required");
    expect(onboardingOverviewPayload.data.overview.counts.failedImportJobCount).toBe(1);
  });

  it("lets scoped admins manage tenant settings and location feature flags", async () => {
    const ownerToken = await createBootstrapSession({
      email: "owner@daysi.ca",
      displayName: "Daysi Owner",
      requestedRole: "owner",
      providerUserId: "owner-user-settings-1",
    });

    const createLocationResponse = await fetch(`${baseUrl}/v1/admin/locations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        slug: "daysi-settings",
        name: "Daysi Settings",
        organizationId: "org_daysi",
        enabledModules: ["memberships"],
        operatingSchedule: [
          {
            dayOfWeek: 4,
            startMinute: 9 * 60,
            endMinute: 17 * 60,
          },
        ],
      }),
    });

    expect(createLocationResponse.status).toBe(201);

    const createAssignmentResponse = await fetch(`${baseUrl}/v1/admin/access-assignments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        email: "settings.manager@daysi.ca",
        role: "admin",
        locationScopes: ["daysi-settings"],
      }),
    });

    expect(createAssignmentResponse.status).toBe(201);

    const settingsAdminToken = await createBootstrapSession({
      email: "settings.manager@daysi.ca",
      displayName: "Settings Manager",
      requestedRole: "admin",
      providerUserId: "settings-manager-1",
    });

    const initialSettingsResponse = await fetch(
      `${baseUrl}/v1/admin/tenant-settings?locationSlug=daysi-settings`,
      {
        headers: {
          authorization: `Bearer ${settingsAdminToken}`,
        },
      },
    );
    const initialSettingsPayload = (await initialSettingsResponse.json()) as {
      data: {
        featureFlags: { memberships: boolean; skinAnalysis: boolean };
        settings: Array<{ key: string }>;
      };
    };

    expect(initialSettingsResponse.status).toBe(200);
    expect(initialSettingsPayload.data.featureFlags.memberships).toBe(true);
    expect(initialSettingsPayload.data.featureFlags.skinAnalysis).toBe(false);
    expect(initialSettingsPayload.data.settings).toHaveLength(0);

    const supportPortalSettingResponse = await fetch(`${baseUrl}/v1/admin/tenant-settings`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${settingsAdminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-settings",
        key: "plugin.supportPortal",
        value: true,
      }),
    });

    expect(supportPortalSettingResponse.status).toBe(200);

    const featureToggleResponse = await fetch(`${baseUrl}/v1/admin/tenant-settings`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${settingsAdminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-settings",
        key: "feature.skinAnalysis",
        value: true,
      }),
    });
    const featureTogglePayload = (await featureToggleResponse.json()) as {
      data: {
        featureFlags: { skinAnalysis: boolean };
        setting: { key: string };
      };
    };

    expect(featureToggleResponse.status).toBe(200);
    expect(featureTogglePayload.data.setting.key).toBe("feature.skinAnalysis");
    expect(featureTogglePayload.data.featureFlags.skinAnalysis).toBe(true);

    const refreshedSettingsResponse = await fetch(
      `${baseUrl}/v1/admin/tenant-settings?locationSlug=daysi-settings`,
      {
        headers: {
          authorization: `Bearer ${settingsAdminToken}`,
        },
      },
    );
    const refreshedSettingsPayload = (await refreshedSettingsResponse.json()) as {
      data: {
        featureFlags: { skinAnalysis: boolean };
        settings: Array<{ key: string }>;
      };
    };

    expect(refreshedSettingsResponse.status).toBe(200);
    expect(refreshedSettingsPayload.data.featureFlags.skinAnalysis).toBe(true);
    expect(refreshedSettingsPayload.data.settings.map((setting) => setting.key)).toEqual(
      expect.arrayContaining(["plugin.supportPortal", "feature.skinAnalysis"]),
    );

    const platformConfigResponse = await fetch(`${baseUrl}/v1/platform/config`);
    const platformConfigPayload = (await platformConfigResponse.json()) as {
      data: {
        locations: Array<{ slug: string; enabledModules: string[] }>;
      };
    };

    expect(
      platformConfigPayload.data.locations.find((location) => location.slug === "daysi-settings")
        ?.enabledModules,
    ).toContain("skinAnalysis");
  });

  it("exposes explicit location feature flag controls and gates customer-facing modules", async () => {
    const adminToken = await createBootstrapSession({
      email: "flag.owner@daysi.ca",
      displayName: "Flag Owner",
      requestedRole: "owner",
      providerUserId: "owner-user-feature-flags-1",
    });

    const initialFlagsResponse = await fetch(
      `${baseUrl}/v1/admin/location-feature-flags?locationSlug=daysi-flagship`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const initialFlagsPayload = (await initialFlagsResponse.json()) as {
      data: {
        featureFlags: { education: boolean; memberships: boolean };
        flags: Array<{ feature: string; enabled: boolean }>;
      };
    };

    expect(initialFlagsResponse.status).toBe(200);
    expect(initialFlagsPayload.data.featureFlags.education).toBe(true);
    expect(initialFlagsPayload.data.featureFlags.memberships).toBe(true);
    expect(
      initialFlagsPayload.data.flags.find((flag) => flag.feature === "education")?.enabled,
    ).toBe(true);

    const disableEducationResponse = await fetch(
      `${baseUrl}/v1/admin/location-feature-flags/education`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          locationSlug: "daysi-flagship",
          enabled: false,
        }),
      },
    );
    const disableEducationPayload = (await disableEducationResponse.json()) as {
      data: {
        featureFlags: { education: boolean };
        flag: { feature: string; enabled: boolean; settingKey: string };
      };
    };

    expect(disableEducationResponse.status).toBe(200);
    expect(disableEducationPayload.data.flag.feature).toBe("education");
    expect(disableEducationPayload.data.flag.settingKey).toBe("feature.education");
    expect(disableEducationPayload.data.flag.enabled).toBe(false);
    expect(disableEducationPayload.data.featureFlags.education).toBe(false);

    const publicEducationResponse = await fetch(
      `${baseUrl}/v1/public/education/offers?locationSlug=daysi-flagship`,
    );

    expect(publicEducationResponse.status).toBe(409);

    const catalogEducationResponse = await fetch(
      `${baseUrl}/v1/public/locations/daysi-flagship/catalog/education-offers`,
    );

    expect(catalogEducationResponse.status).toBe(409);

    const adminEducationResponse = await fetch(
      `${baseUrl}/v1/admin/education/offers?locationSlug=daysi-flagship`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(adminEducationResponse.status).toBe(200);

    const disableMembershipsResponse = await fetch(
      `${baseUrl}/v1/admin/location-feature-flags/memberships`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          locationSlug: "daysi-flagship",
          enabled: false,
        }),
      },
    );

    expect(disableMembershipsResponse.status).toBe(200);

    const membershipPlansResponse = await fetch(
      `${baseUrl}/v1/memberships/plans?locationSlug=daysi-flagship`,
    );

    expect(membershipPlansResponse.status).toBe(409);

    const platformConfigResponse = await fetch(`${baseUrl}/v1/platform/config`);
    const platformConfigPayload = (await platformConfigResponse.json()) as {
      data: {
        locations: Array<{ slug: string; enabledModules: string[] }>;
      };
    };

    expect(
      platformConfigPayload.data.locations.find((location) => location.slug === "daysi-flagship")
        ?.enabledModules,
    ).not.toContain("education");
    expect(
      platformConfigPayload.data.locations.find((location) => location.slug === "daysi-flagship")
        ?.enabledModules,
    ).not.toContain("memberships");
  });

  it("shows reconciliation issues and retries failed import rows", async () => {
    const ownerToken = await createBootstrapSession({
      email: "owner@daysi.ca",
      displayName: "Daysi Owner",
      requestedRole: "owner",
      providerUserId: "owner-user-retry-1",
    });

    const createLocationResponse = await fetch(`${baseUrl}/v1/admin/locations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        slug: "daysi-retry",
        name: "Daysi Retry",
        organizationId: "org_daysi",
        enabledModules: ["memberships"],
        operatingSchedule: [
          {
            dayOfWeek: 5,
            startMinute: 9 * 60,
            endMinute: 17 * 60,
          },
        ],
      }),
    });

    expect(createLocationResponse.status).toBe(201);

    const createAssignmentResponse = await fetch(`${baseUrl}/v1/admin/access-assignments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        email: "retry.manager@daysi.ca",
        role: "admin",
        locationScopes: ["daysi-retry"],
      }),
    });

    expect(createAssignmentResponse.status).toBe(201);

    const retryAdminToken = await createBootstrapSession({
      email: "retry.manager@daysi.ca",
      displayName: "Retry Manager",
      requestedRole: "admin",
      providerUserId: "retry-manager-1",
    });

    const createImportJobResponse = await fetch(`${baseUrl}/v1/admin/import-jobs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${retryAdminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-retry",
        sourceSystem: "csv",
        entityType: "services",
        fileName: "services.csv",
        rows: [
          {
            rowNumber: 1,
            externalId: "svc_1",
            rawPayload: {
              slug: "laser-hair-removal",
            },
          },
          {
            rowNumber: 2,
            externalId: "svc_2",
            rawPayload: {
              slug: "skin-rejuvenation",
            },
          },
        ],
      }),
    });
    const createImportJobPayload = (await createImportJobResponse.json()) as {
      data: {
        importJob: { id: string };
      };
    };

    expect(createImportJobResponse.status).toBe(201);

    const patchImportJobResponse = await fetch(
      `${baseUrl}/v1/admin/import-jobs/${createImportJobPayload.data.importJob.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${retryAdminToken}`,
        },
        body: JSON.stringify({
          status: "failed",
          rowUpdates: [
            {
              rowNumber: 1,
              status: "processed",
            },
            {
              rowNumber: 2,
              status: "failed",
              errorMessage: "Missing machine capability",
            },
          ],
          errorMessage: "One service row failed validation",
        }),
      },
    );

    expect(patchImportJobResponse.status).toBe(200);

    const reconciliationResponse = await fetch(
      `${baseUrl}/v1/admin/import-jobs/${createImportJobPayload.data.importJob.id}/reconciliation`,
      {
        headers: {
          authorization: `Bearer ${retryAdminToken}`,
        },
      },
    );
    const reconciliationPayload = (await reconciliationResponse.json()) as {
      data: {
        issues: Array<{ rowNumber: number; detail?: string }>;
      };
    };

    expect(reconciliationResponse.status).toBe(200);
    expect(reconciliationPayload.data.issues).toHaveLength(1);
    expect(reconciliationPayload.data.issues[0]?.rowNumber).toBe(2);
    expect(reconciliationPayload.data.issues[0]?.detail).toBe(
      "Missing machine capability",
    );

    const retryResponse = await fetch(
      `${baseUrl}/v1/admin/import-jobs/${createImportJobPayload.data.importJob.id}/retry`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${retryAdminToken}`,
        },
        body: JSON.stringify({
          rowNumbers: [2],
        }),
      },
    );
    const retryPayload = (await retryResponse.json()) as {
      data: {
        importJob: {
          status: string;
          counts: { failedRows: number; queuedRows: number };
          rows: Array<{ rowNumber: number; status: string }>;
        };
      };
    };

    expect(retryResponse.status).toBe(200);
    expect(retryPayload.data.importJob.status).toBe("queued");
    expect(retryPayload.data.importJob.counts.failedRows).toBe(0);
    expect(retryPayload.data.importJob.counts.queuedRows).toBe(1);
    expect(
      retryPayload.data.importJob.rows.find((row) => row.rowNumber === 2)?.status,
    ).toBe("queued");

    const auditLogResponse = await fetch(
      `${baseUrl}/v1/admin/audit-log?locationSlug=daysi-retry`,
      {
        headers: {
          authorization: `Bearer ${retryAdminToken}`,
        },
      },
    );
    const auditLogPayload = (await auditLogResponse.json()) as {
      data: {
        entries: Array<{ action: string }>;
      };
    };

    expect(auditLogResponse.status).toBe(200);
    expect(auditLogPayload.data.entries.map((entry) => entry.action)).toEqual(
      expect.arrayContaining(["import.job.created", "import.job.updated", "import.job.retried"]),
    );
  });

  it("lets scoped admins manage mapping profiles and update reconciliation issue status", async () => {
    const ownerToken = await createBootstrapSession({
      email: "owner@daysi.ca",
      displayName: "Daysi Owner",
      requestedRole: "owner",
      providerUserId: "owner-user-mapping-1",
    });

    const createLocationResponse = await fetch(`${baseUrl}/v1/admin/locations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        slug: "daysi-mapping",
        name: "Daysi Mapping",
        organizationId: "org_daysi",
        enabledModules: ["memberships"],
        operatingSchedule: [
          {
            dayOfWeek: 1,
            startMinute: 9 * 60,
            endMinute: 17 * 60,
          },
        ],
      }),
    });

    expect(createLocationResponse.status).toBe(201);

    const createAssignmentResponse = await fetch(`${baseUrl}/v1/admin/access-assignments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        email: "mapping.manager@daysi.ca",
        role: "admin",
        locationScopes: ["daysi-mapping"],
      }),
    });

    expect(createAssignmentResponse.status).toBe(201);

    const mappingAdminToken = await createBootstrapSession({
      email: "mapping.manager@daysi.ca",
      displayName: "Mapping Manager",
      requestedRole: "admin",
      providerUserId: "mapping-manager-1",
    });

    const createMappingProfileResponse = await fetch(
      `${baseUrl}/v1/admin/import-mapping-profiles`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${mappingAdminToken}`,
        },
        body: JSON.stringify({
          locationSlug: "daysi-mapping",
          sourceSystem: "csv",
          entityType: "customers",
          name: "Customer CSV Profile",
          fieldMappings: [
            {
              sourceField: "Email Address",
              targetField: "customer.email",
            },
          ],
        }),
      },
    );
    const createMappingProfilePayload = (await createMappingProfileResponse.json()) as {
      data: {
        mappingProfile: { id: string; status: string };
      };
    };

    expect(createMappingProfileResponse.status).toBe(201);
    expect(createMappingProfilePayload.data.mappingProfile.status).toBe("draft");

    const patchMappingProfileResponse = await fetch(
      `${baseUrl}/v1/admin/import-mapping-profiles/${createMappingProfilePayload.data.mappingProfile.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${mappingAdminToken}`,
        },
        body: JSON.stringify({
          status: "active",
          fieldMappings: [
            {
              sourceField: "Email Address",
              targetField: "customer.email",
              transform: "lowercase",
            },
          ],
        }),
      },
    );

    expect(patchMappingProfileResponse.status).toBe(200);

    const listMappingProfilesResponse = await fetch(
      `${baseUrl}/v1/admin/import-mapping-profiles?locationSlug=daysi-mapping&sourceSystem=csv&entityType=customers`,
      {
        headers: {
          authorization: `Bearer ${mappingAdminToken}`,
        },
      },
    );
    const listMappingProfilesPayload = (await listMappingProfilesResponse.json()) as {
      data: {
        mappingProfiles: Array<{ id: string; status: string }>;
      };
    };

    expect(listMappingProfilesResponse.status).toBe(200);
    expect(listMappingProfilesPayload.data.mappingProfiles[0]?.id).toBe(
      createMappingProfilePayload.data.mappingProfile.id,
    );
    expect(listMappingProfilesPayload.data.mappingProfiles[0]?.status).toBe("active");

    const createImportJobResponse = await fetch(`${baseUrl}/v1/admin/import-jobs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${mappingAdminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-mapping",
        sourceSystem: "csv",
        entityType: "customers",
        fileName: "customers.csv",
        rows: [
          {
            rowNumber: 1,
            externalId: "cust_1",
            rawPayload: {
              email: "broken@example.com",
            },
          },
        ],
      }),
    });
    const createImportJobPayload = (await createImportJobResponse.json()) as {
      data: {
        importJob: { id: string };
      };
    };

    expect(createImportJobResponse.status).toBe(201);

    const patchImportJobResponse = await fetch(
      `${baseUrl}/v1/admin/import-jobs/${createImportJobPayload.data.importJob.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${mappingAdminToken}`,
        },
        body: JSON.stringify({
          status: "failed",
          rowUpdates: [
            {
              rowNumber: 1,
              status: "failed",
              errorMessage: "Missing phone number",
            },
          ],
          errorMessage: "Customer import failed",
        }),
      },
    );

    expect(patchImportJobResponse.status).toBe(200);

    const reconciliationResponse = await fetch(
      `${baseUrl}/v1/admin/import-jobs/${createImportJobPayload.data.importJob.id}/reconciliation`,
      {
        headers: {
          authorization: `Bearer ${mappingAdminToken}`,
        },
      },
    );
    const reconciliationPayload = (await reconciliationResponse.json()) as {
      data: {
        issues: Array<{ id: string; status: string; detail?: string }>;
      };
    };

    expect(reconciliationResponse.status).toBe(200);
    expect(reconciliationPayload.data.issues).toHaveLength(1);
    expect(reconciliationPayload.data.issues[0]?.status).toBe("open");
    expect(reconciliationPayload.data.issues[0]?.detail).toBe("Missing phone number");

    const patchIssueResponse = await fetch(
      `${baseUrl}/v1/admin/import-jobs/${createImportJobPayload.data.importJob.id}/reconciliation/issues/${reconciliationPayload.data.issues[0]?.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${mappingAdminToken}`,
        },
        body: JSON.stringify({
          status: "ignored",
        }),
      },
    );
    const patchIssuePayload = (await patchIssueResponse.json()) as {
      data: {
        issues: Array<{ id: string; status: string }>;
      };
    };

    expect(patchIssueResponse.status).toBe(200);
    expect(patchIssuePayload.data.issues[0]?.id).toBe(
      reconciliationPayload.data.issues[0]?.id,
    );
    expect(patchIssuePayload.data.issues[0]?.status).toBe("ignored");

    const auditLogResponse = await fetch(
      `${baseUrl}/v1/admin/audit-log?locationSlug=daysi-mapping`,
      {
        headers: {
          authorization: `Bearer ${mappingAdminToken}`,
        },
      },
    );
    const auditLogPayload = (await auditLogResponse.json()) as {
      data: {
        entries: Array<{ action: string }>;
      };
    };

    expect(auditLogResponse.status).toBe(200);
    expect(auditLogPayload.data.entries.map((entry) => entry.action)).toEqual(
      expect.arrayContaining([
        "import.mapping_profile.created",
        "import.mapping_profile.updated",
        "import.job.created",
        "import.job.updated",
        "import.reconciliation_issue.updated",
      ]),
    );
  });

  it("lets scoped admins manage support cases and view audit history for their location", async () => {
    const ownerToken = await createBootstrapSession({
      email: "owner@daysi.ca",
      displayName: "Daysi Owner",
      requestedRole: "owner",
      providerUserId: "owner-user-support-1",
    });

    const createLocationResponse = await fetch(`${baseUrl}/v1/admin/locations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        slug: "daysi-support",
        name: "Daysi Support",
        organizationId: "org_daysi",
        enabledModules: ["memberships", "education"],
        operatingSchedule: [
          {
            dayOfWeek: 3,
            startMinute: 9 * 60,
            endMinute: 17 * 60,
          },
        ],
      }),
    });

    expect(createLocationResponse.status).toBe(201);

    const createAssignmentResponse = await fetch(`${baseUrl}/v1/admin/access-assignments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        email: "support.manager@daysi.ca",
        role: "admin",
        locationScopes: ["daysi-support"],
      }),
    });

    expect(createAssignmentResponse.status).toBe(201);

    const supportAdminToken = await createBootstrapSession({
      email: "support.manager@daysi.ca",
      displayName: "Support Manager",
      requestedRole: "admin",
      providerUserId: "support-manager-1",
    });

    const createImportJobResponse = await fetch(`${baseUrl}/v1/admin/import-jobs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${supportAdminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-support",
        sourceSystem: "csv",
        entityType: "providers",
        fileName: "providers.csv",
        rows: [
          {
            rowNumber: 1,
            externalId: "legacy-provider-1",
            rawPayload: {
              email: "provider.one@example.com",
            },
          },
        ],
      }),
    });

    expect(createImportJobResponse.status).toBe(201);

    const createSupportCaseResponse = await fetch(`${baseUrl}/v1/admin/support-cases`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${supportAdminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-support",
        subject: "Provider import mismatch",
        category: "imports",
        priority: "high",
        initialMessage: "Imported provider data needs reconciliation.",
        initialVisibility: "internal",
        tags: ["imports", "provider"],
      }),
    });
    const createSupportCasePayload = (await createSupportCaseResponse.json()) as {
      data: {
        supportCase: { id: string; status: string };
        events: Array<{ type: string }>;
      };
    };

    expect(createSupportCaseResponse.status).toBe(201);
    expect(createSupportCasePayload.data.supportCase.status).toBe("open");
    expect(createSupportCasePayload.data.events[0]?.type).toBe("note");

    const patchSupportCaseResponse = await fetch(
      `${baseUrl}/v1/admin/support-cases/${createSupportCasePayload.data.supportCase.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${supportAdminToken}`,
        },
        body: JSON.stringify({
          status: "in_progress",
          assignedToUserId: "usr_triage_1",
          note: {
            body: "Triage started and mapping review is underway.",
            visibility: "internal",
          },
        }),
      },
    );

    expect(patchSupportCaseResponse.status).toBe(200);

    const addEventResponse = await fetch(
      `${baseUrl}/v1/admin/support-cases/${createSupportCasePayload.data.supportCase.id}/events`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${supportAdminToken}`,
        },
        body: JSON.stringify({
          body: "Waiting on tenant confirmation for provider commission rules.",
          visibility: "tenant",
        }),
      },
    );

    expect(addEventResponse.status).toBe(200);

    const supportCaseResponse = await fetch(
      `${baseUrl}/v1/admin/support-cases/${createSupportCasePayload.data.supportCase.id}`,
      {
        headers: {
          authorization: `Bearer ${supportAdminToken}`,
        },
      },
    );
    const supportCasePayload = (await supportCaseResponse.json()) as {
      data: {
        supportCase: { status: string; assignedToUserId?: string };
        events: Array<{ type: string; visibility: string }>;
      };
    };

    expect(supportCaseResponse.status).toBe(200);
    expect(supportCasePayload.data.supportCase.status).toBe("in_progress");
    expect(supportCasePayload.data.supportCase.assignedToUserId).toBe("usr_triage_1");
    expect(supportCasePayload.data.events).toHaveLength(5);
    expect(
      supportCasePayload.data.events.some(
        (event) => event.type === "note" && event.visibility === "tenant",
      ),
    ).toBe(true);

    const auditLogResponse = await fetch(
      `${baseUrl}/v1/admin/audit-log?locationSlug=daysi-support`,
      {
        headers: {
          authorization: `Bearer ${supportAdminToken}`,
        },
      },
    );
    const auditLogPayload = (await auditLogResponse.json()) as {
      data: {
        entries: Array<{ action: string; entityType: string }>;
      };
    };

    expect(auditLogResponse.status).toBe(200);
    expect(auditLogPayload.data.entries.map((entry) => entry.action)).toEqual(
      expect.arrayContaining([
        "import.job.created",
        "support.case.created",
        "support.case.updated",
        "support.case.event_added",
      ]),
    );
    expect(
      auditLogPayload.data.entries.every((entry) =>
        ["import_job", "support_case"].includes(entry.entityType),
      ),
    ).toBe(true);

    const restrictedAuditLogResponse = await fetch(
      `${baseUrl}/v1/admin/audit-log?locationSlug=daysi-flagship`,
      {
        headers: {
          authorization: `Bearer ${supportAdminToken}`,
        },
      },
    );

    expect(restrictedAuditLogResponse.status).toBe(403);
  });

  it("lets admins create coupons that immediately affect quotes", async () => {
    const adminToken = await createBootstrapSession({
      email: "admin@daysi.ca",
      displayName: "Daysi Admin",
      requestedRole: "admin",
      providerUserId: "admin-user-3",
    });

    const createCouponResponse = await fetch(`${baseUrl}/v1/admin/coupons`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        code: "KIT25",
        name: "Kit Promo",
        status: "active",
        stackable: false,
        discountType: "fixed_amount",
        amountOff: {
          currency: "CAD",
          amountCents: 2500,
        },
        appliesToKinds: ["product"],
        appliesToRevenueStreams: ["retail"],
      }),
    });

    expect(createCouponResponse.status).toBe(201);

    const quoteResponse = await fetch(`${baseUrl}/v1/checkout/quote`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        items: [
          {
            kind: "product",
            productSlug: "aftercare-kit",
            quantity: 1,
          },
        ],
        couponCodes: ["KIT25"],
      }),
    });
    const quotePayload = (await quoteResponse.json()) as {
      data: {
        quote: {
          totalAmount: { amountCents: number };
          appliedCoupons: Array<{ code: string }>;
        };
      };
    };

    expect(quoteResponse.status).toBe(200);
    expect(quotePayload.data.quote.totalAmount.amountCents).toBe(4400);
    expect(quotePayload.data.quote.appliedCoupons[0]?.code).toBe("KIT25");
  });

  it("grants account credits, applies them at checkout, and restores them on refund", async () => {
    const adminToken = await createBootstrapSession({
      email: "admin@daysi.ca",
      displayName: "Daysi Admin",
      requestedRole: "admin",
      providerUserId: "admin-user-credits-1",
    });
    const customerToken = await createBootstrapSession({
      email: "credits.customer@example.com",
      displayName: "Credits Customer",
      requestedRole: "customer",
      providerUserId: "customer-credits-1",
    });

    const grantResponse = await fetch(`${baseUrl}/v1/admin/credits/grants`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        customerEmail: "credits.customer@example.com",
        actorUserId: "customer-credits-1",
        amount: {
          currency: "CAD",
          amountCents: 10000,
        },
        note: "Launch credit",
      }),
    });

    expect(grantResponse.status).toBe(201);

    const creditsBeforeResponse = await fetch(`${baseUrl}/v1/me/credits`, {
      headers: {
        authorization: `Bearer ${customerToken}`,
      },
    });
    const creditsBeforePayload = (await creditsBeforeResponse.json()) as {
      data: {
        credits: {
          availableAmount: { amountCents: number };
        };
      };
    };

    expect(creditsBeforeResponse.status).toBe(200);
    expect(creditsBeforePayload.data.credits.availableAmount.amountCents).toBe(10000);

    const quoteResponse = await fetch(`${baseUrl}/v1/checkout/quote`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        items: [
          {
            kind: "product",
            productSlug: "aftercare-kit",
            quantity: 1,
          },
        ],
        applyAccountCredit: true,
      }),
    });
    const quotePayload = (await quoteResponse.json()) as {
      data: {
        quote: {
          appliedAccountCreditAmount: { amountCents: number };
          totalAmount: { amountCents: number };
        };
      };
    };

    expect(quoteResponse.status).toBe(200);
    expect(quotePayload.data.quote.appliedAccountCreditAmount.amountCents).toBe(6900);
    expect(quotePayload.data.quote.totalAmount.amountCents).toBe(0);

    const checkoutResponse = await fetch(`${baseUrl}/v1/checkout/confirm`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
        "idempotency-key": "credits-checkout-confirm",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        items: [
          {
            kind: "product",
            productSlug: "aftercare-kit",
            quantity: 1,
          },
        ],
        applyAccountCredit: true,
        customer: {
          firstName: "Credits",
          lastName: "Customer",
          email: "credits.customer@example.com",
        },
        paymentMethod: "stripe",
      }),
    });
    const checkoutPayload = (await checkoutResponse.json()) as {
      data: {
        order: {
          id: string;
          status: string;
          appliedAccountCreditAmount: { amountCents: number };
        };
      };
    };

    expect(checkoutResponse.status).toBe(201);
    expect(checkoutPayload.data.order.status).toBe("paid");
    expect(checkoutPayload.data.order.appliedAccountCreditAmount.amountCents).toBe(6900);

    const creditsAfterCheckoutResponse = await fetch(`${baseUrl}/v1/me/credits`, {
      headers: {
        authorization: `Bearer ${customerToken}`,
      },
    });
    const creditsAfterCheckoutPayload =
      (await creditsAfterCheckoutResponse.json()) as {
        data: {
          credits: {
            availableAmount: { amountCents: number };
          };
        };
      };

    expect(creditsAfterCheckoutResponse.status).toBe(200);
    expect(creditsAfterCheckoutPayload.data.credits.availableAmount.amountCents).toBe(3100);

    const refundResponse = await fetch(
      `${baseUrl}/v1/orders/${checkoutPayload.data.order.id}/refund`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
          "idempotency-key": "credits-checkout-refund",
        },
        body: JSON.stringify({
          reason: "test refund",
        }),
      },
    );

    expect(refundResponse.status).toBe(200);

    const creditsAfterRefundResponse = await fetch(`${baseUrl}/v1/me/credits`, {
      headers: {
        authorization: `Bearer ${customerToken}`,
      },
    });
    const creditsAfterRefundPayload =
      (await creditsAfterRefundResponse.json()) as {
        data: {
          credits: {
            availableAmount: { amountCents: number };
          };
        };
      };

    expect(creditsAfterRefundResponse.status).toBe(200);
    expect(creditsAfterRefundPayload.data.credits.availableAmount.amountCents).toBe(10000);
  });

  it("grants and revokes education entitlements from direct purchases", async () => {
    const customerToken = await createBootstrapSession({
      email: "student.purchase@example.com",
      displayName: "Student Purchase",
      requestedRole: "customer",
      providerUserId: "customer-education-1",
    });
    const adminToken = await createBootstrapSession({
      email: "admin@daysi.ca",
      displayName: "Daysi Admin",
      requestedRole: "admin",
      providerUserId: "admin-user-4",
    });

    const checkoutResponse = await fetch(`${baseUrl}/v1/checkout/confirm`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
        "idempotency-key": "education-purchase-checkout",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        items: [
          {
            kind: "educationOffer",
            offerSlug: "signature-laser-method",
            quantity: 1,
          },
        ],
        customer: {
          firstName: "Student",
          lastName: "Purchase",
          email: "student.purchase@example.com",
        },
        paymentMethod: "stripe",
      }),
    });
    const checkoutPayload = (await checkoutResponse.json()) as {
      data: {
        order: { id: string };
        paymentSession: { paymentIntentId: string };
      };
    };

    expect(checkoutResponse.status).toBe(201);

    const webhookResponse = await postStripeWebhook({
      eventId: "evt_education_purchase_paid",
      paymentIntentId: checkoutPayload.data.paymentSession.paymentIntentId,
      orderId: checkoutPayload.data.order.id,
      timestamp: "1741363300",
    });

    expect(webhookResponse.status).toBe(200);

    const entitlementsResponse = await fetch(
      `${baseUrl}/v1/me/education/entitlements`,
      {
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
      },
    );
    const entitlementsPayload = (await entitlementsResponse.json()) as {
      data: {
        entitlements: Array<{ educationOfferSlug: string; status: string }>;
      };
    };

    expect(entitlementsResponse.status).toBe(200);
    expect(entitlementsPayload.data.entitlements).toHaveLength(1);
    expect(entitlementsPayload.data.entitlements[0]?.educationOfferSlug).toBe(
      "signature-laser-method",
    );

    const refundResponse = await fetch(
      `${baseUrl}/v1/orders/${checkoutPayload.data.order.id}/refund`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
          "idempotency-key": "education-purchase-refund",
        },
        body: JSON.stringify({
          reason: "test refund",
        }),
      },
    );

    expect(refundResponse.status).toBe(200);

    const entitlementsAfterRefundResponse = await fetch(
      `${baseUrl}/v1/me/education/entitlements`,
      {
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
      },
    );
    const entitlementsAfterRefundPayload =
      (await entitlementsAfterRefundResponse.json()) as {
        data: {
          entitlements: Array<{ educationOfferSlug: string }>;
        };
      };

    expect(entitlementsAfterRefundResponse.status).toBe(200);
    expect(entitlementsAfterRefundPayload.data.entitlements).toHaveLength(0);
  });

  it("grants education access from education memberships and admin staff grants", async () => {
    const studentToken = await createBootstrapSession({
      email: "student.membership@example.com",
      displayName: "Student Membership",
      requestedRole: "customer",
      providerUserId: "customer-education-2",
    });
    const adminToken = await createBootstrapSession({
      email: "admin@daysi.ca",
      displayName: "Daysi Admin",
      requestedRole: "admin",
      providerUserId: "admin-user-5",
    });
    const staffToken = await createBootstrapSession({
      email: "staff.education@example.com",
      displayName: "Staff Education",
      requestedRole: "staff",
      providerUserId: "staff-user-1",
    });

    const subscriptionResponse = await fetch(`${baseUrl}/v1/memberships/subscriptions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${studentToken}`,
        "idempotency-key": "education-membership-create",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        planSlug: "education-membership",
        customer: {
          firstName: "Student",
          lastName: "Membership",
          email: "student.membership@example.com",
        },
      }),
    });
    const subscriptionPayload = (await subscriptionResponse.json()) as {
      data: {
        orderId: string;
        paymentIntentId: string;
      };
    };

    expect(subscriptionResponse.status).toBe(201);

    const subscriptionWebhookResponse = await postStripeWebhook({
      eventId: "evt_education_membership_paid",
      paymentIntentId: subscriptionPayload.data.paymentIntentId,
      orderId: subscriptionPayload.data.orderId,
      timestamp: "1741363400",
    });

    expect(subscriptionWebhookResponse.status).toBe(200);

    const studentEntitlementsResponse = await fetch(
      `${baseUrl}/v1/me/education/entitlements`,
      {
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
      },
    );
    const studentEntitlementsPayload =
      (await studentEntitlementsResponse.json()) as {
        data: {
          entitlements: Array<{ source: string; educationOfferSlug: string }>;
        };
      };

    expect(studentEntitlementsResponse.status).toBe(200);
    expect(studentEntitlementsPayload.data.entitlements[0]?.source).toBe("membership");
    expect(studentEntitlementsPayload.data.entitlements[0]?.educationOfferSlug).toBe(
      "signature-laser-method",
    );

    const grantResponse = await fetch(`${baseUrl}/v1/admin/education/grants`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        offerSlug: "signature-laser-method",
        customerEmail: "staff.education@example.com",
        customerName: "Staff Education",
        actorUserId: "staff-user-1",
      }),
    });

    expect(grantResponse.status).toBe(201);

    const staffEntitlementsResponse = await fetch(
      `${baseUrl}/v1/me/education/entitlements`,
      {
        headers: {
          authorization: `Bearer ${staffToken}`,
        },
      },
    );
    const staffEntitlementsPayload = (await staffEntitlementsResponse.json()) as {
      data: {
        entitlements: Array<{ source: string; educationOfferSlug: string }>;
      };
    };

    expect(staffEntitlementsResponse.status).toBe(200);
    expect(staffEntitlementsPayload.data.entitlements[0]?.source).toBe("admin_grant");
    expect(staffEntitlementsPayload.data.entitlements[0]?.educationOfferSlug).toBe(
      "signature-laser-method",
    );
  });

  it("creates education enrollments, tracks module progress, and issues certificates", async () => {
    const studentToken = await createBootstrapSession({
      email: "student.progress@example.com",
      displayName: "Student Progress",
      requestedRole: "customer",
      providerUserId: "customer-education-progress-1",
    });

    const checkoutResponse = await fetch(`${baseUrl}/v1/checkout/confirm`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${studentToken}`,
        "idempotency-key": "education-progress-checkout",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        items: [
          {
            kind: "educationOffer",
            offerSlug: "signature-laser-method",
            quantity: 1,
          },
        ],
        customer: {
          firstName: "Student",
          lastName: "Progress",
          email: "student.progress@example.com",
        },
        paymentMethod: "stripe",
      }),
    });
    const checkoutPayload = (await checkoutResponse.json()) as {
      data: {
        order: { id: string };
        paymentSession: { paymentIntentId: string };
      };
    };

    expect(checkoutResponse.status).toBe(201);

    const webhookResponse = await postStripeWebhook({
      eventId: "evt_education_progress_paid",
      paymentIntentId: checkoutPayload.data.paymentSession.paymentIntentId,
      orderId: checkoutPayload.data.order.id,
      timestamp: "1741363450",
    });

    expect(webhookResponse.status).toBe(200);

    const createEnrollmentResponse = await fetch(`${baseUrl}/v1/education/enrollments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        offerSlug: "signature-laser-method",
      }),
    });
    const createEnrollmentPayload = (await createEnrollmentResponse.json()) as {
      data: {
        enrollment: {
          enrollment: { id: string; educationOfferSlug: string };
          summary: { percentComplete: number };
        };
      };
    };

    expect(createEnrollmentResponse.status).toBe(201);
    expect(
      createEnrollmentPayload.data.enrollment.enrollment.educationOfferSlug,
    ).toBe("signature-laser-method");
    expect(createEnrollmentPayload.data.enrollment.summary.percentComplete).toBe(0);

    const firstProgressResponse = await fetch(
      `${baseUrl}/v1/me/education/lessons/laser-foundations/progress`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({
          enrollmentId: createEnrollmentPayload.data.enrollment.enrollment.id,
          status: "completed",
        }),
      },
    );

    expect(firstProgressResponse.status).toBe(200);

    const secondProgressResponse = await fetch(
      `${baseUrl}/v1/me/education/lessons/consulting-script/progress`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({
          enrollmentId: createEnrollmentPayload.data.enrollment.enrollment.id,
          status: "completed",
        }),
      },
    );

    expect(secondProgressResponse.status).toBe(200);

    const thirdProgressResponse = await fetch(
      `${baseUrl}/v1/me/education/lessons/treatment-protocols/progress`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({
          enrollmentId: createEnrollmentPayload.data.enrollment.enrollment.id,
          status: "completed",
        }),
      },
    );
    const thirdProgressPayload = (await thirdProgressResponse.json()) as {
      data: {
        enrollment: {
          summary: { percentComplete: number };
          certificate: { id: string } | null;
        };
      };
    };

    expect(thirdProgressResponse.status).toBe(200);
    expect(thirdProgressPayload.data.enrollment.summary.percentComplete).toBe(100);
    expect(thirdProgressPayload.data.enrollment.certificate?.id).toBeTruthy();

    const enrollmentsResponse = await fetch(
      `${baseUrl}/v1/me/education/enrollments`,
      {
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
      },
    );
    const enrollmentsPayload = (await enrollmentsResponse.json()) as {
      data: {
        enrollments: Array<{
          enrollment: { completedAt?: string };
          summary: { completedModules: number; totalModules: number };
        }>;
      };
    };

    expect(enrollmentsResponse.status).toBe(200);
    expect(enrollmentsPayload.data.enrollments[0]?.summary.completedModules).toBe(3);
    expect(enrollmentsPayload.data.enrollments[0]?.summary.totalModules).toBe(3);
    expect(enrollmentsPayload.data.enrollments[0]?.enrollment.completedAt).toBeTruthy();

    const certificatesResponse = await fetch(
      `${baseUrl}/v1/me/education/certificates`,
      {
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
      },
    );
    const certificatesPayload = (await certificatesResponse.json()) as {
      data: {
        certificates: Array<{ educationOfferSlug: string }>;
      };
    };

    expect(certificatesResponse.status).toBe(200);
    expect(certificatesPayload.data.certificates[0]?.educationOfferSlug).toBe(
      "signature-laser-method",
    );
  });

  it("gives admins learning oversight for entitlements, enrollments, certificates, and stats", async () => {
    const studentToken = await createBootstrapSession({
      email: "student.admin.learning@example.com",
      displayName: "Student Admin Learning",
      requestedRole: "customer",
      providerUserId: "customer-education-admin-1",
    });
    const adminToken = await createBootstrapSession({
      email: "admin.learning@daysi.ca",
      displayName: "Learning Admin",
      requestedRole: "admin",
      providerUserId: "admin-learning-user-1",
    });

    const checkoutResponse = await fetch(`${baseUrl}/v1/checkout/confirm`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${studentToken}`,
        "idempotency-key": "education-admin-learning-checkout",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        items: [
          {
            kind: "educationOffer",
            offerSlug: "signature-laser-method",
            quantity: 1,
          },
        ],
        customer: {
          firstName: "Student",
          lastName: "Admin Learning",
          email: "student.admin.learning@example.com",
        },
        paymentMethod: "stripe",
      }),
    });
    const checkoutPayload = (await checkoutResponse.json()) as {
      data: {
        order: { id: string };
        paymentSession: { paymentIntentId: string };
      };
    };

    expect(checkoutResponse.status).toBe(201);

    const webhookResponse = await postStripeWebhook({
      eventId: "evt_education_admin_learning_paid",
      paymentIntentId: checkoutPayload.data.paymentSession.paymentIntentId,
      orderId: checkoutPayload.data.order.id,
      timestamp: "1741363475",
    });

    expect(webhookResponse.status).toBe(200);

    const createEnrollmentResponse = await fetch(`${baseUrl}/v1/education/enrollments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        offerSlug: "signature-laser-method",
      }),
    });
    const createEnrollmentPayload = (await createEnrollmentResponse.json()) as {
      data: {
        enrollment: {
          enrollment: { id: string };
        };
      };
    };

    expect(createEnrollmentResponse.status).toBe(201);

    for (const moduleSlug of [
      "laser-foundations",
      "consulting-script",
      "treatment-protocols",
    ]) {
      const progressResponse = await fetch(
        `${baseUrl}/v1/me/education/lessons/${moduleSlug}/progress`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${studentToken}`,
          },
          body: JSON.stringify({
            enrollmentId: createEnrollmentPayload.data.enrollment.enrollment.id,
            status: "completed",
          }),
        },
      );

      expect(progressResponse.status).toBe(200);
    }

    const entitlementsResponse = await fetch(
      `${baseUrl}/v1/admin/education/entitlements?customerEmail=student.admin.learning@example.com`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const entitlementsPayload = (await entitlementsResponse.json()) as {
      data: {
        entitlements: Array<{ educationOfferSlug: string }>;
      };
    };

    expect(entitlementsResponse.status).toBe(200);
    expect(entitlementsPayload.data.entitlements[0]?.educationOfferSlug).toBe(
      "signature-laser-method",
    );

    const enrollmentsResponse = await fetch(
      `${baseUrl}/v1/admin/education/enrollments?locationSlug=daysi-flagship&search=student.admin.learning@example.com`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const enrollmentsPayload = (await enrollmentsResponse.json()) as {
      data: {
        enrollments: Array<{
          enrollment: { customerEmail: string; educationOfferSlug: string };
          summary: { percentComplete: number };
          certificate: { id: string } | null;
        }>;
      };
    };

    expect(enrollmentsResponse.status).toBe(200);
    expect(enrollmentsPayload.data.enrollments[0]?.enrollment.customerEmail).toBe(
      "student.admin.learning@example.com",
    );
    expect(enrollmentsPayload.data.enrollments[0]?.summary.percentComplete).toBe(100);
    expect(enrollmentsPayload.data.enrollments[0]?.certificate?.id).toBeTruthy();

    const certificatesResponse = await fetch(
      `${baseUrl}/v1/admin/education/certificates?locationSlug=daysi-flagship&search=student.admin.learning@example.com`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const certificatesPayload = (await certificatesResponse.json()) as {
      data: {
        certificates: Array<{ customerEmail: string; educationOfferSlug: string }>;
      };
    };

    expect(certificatesResponse.status).toBe(200);
    expect(certificatesPayload.data.certificates[0]?.customerEmail).toBe(
      "student.admin.learning@example.com",
    );
    expect(certificatesPayload.data.certificates[0]?.educationOfferSlug).toBe(
      "signature-laser-method",
    );

    const statsResponse = await fetch(
      `${baseUrl}/v1/admin/education/stats?locationSlug=daysi-flagship`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const statsPayload = (await statsResponse.json()) as {
      data: {
        totals: {
          activeEntitlementCount: number;
          enrollmentCount: number;
          completedEnrollmentCount: number;
          certificateCount: number;
          completionRate: number;
        };
        offers: Array<{
          offerSlug: string;
          enrollmentCount: number;
          completedEnrollmentCount: number;
          certificateCount: number;
        }>;
      };
    };

    expect(statsResponse.status).toBe(200);
    expect(statsPayload.data.totals.activeEntitlementCount).toBeGreaterThanOrEqual(1);
    expect(statsPayload.data.totals.enrollmentCount).toBeGreaterThanOrEqual(1);
    expect(statsPayload.data.totals.completedEnrollmentCount).toBeGreaterThanOrEqual(1);
    expect(statsPayload.data.totals.certificateCount).toBeGreaterThanOrEqual(1);
    expect(statsPayload.data.totals.completionRate).toBe(100);
    expect(
      statsPayload.data.offers.find((offer) => offer.offerSlug === "signature-laser-method")
        ?.enrollmentCount,
    ).toBeGreaterThanOrEqual(1);
    expect(
      statsPayload.data.offers.find((offer) => offer.offerSlug === "signature-laser-method")
        ?.certificateCount,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows service allowance visibility from active memberships in my credits", async () => {
    const customerToken = await createBootstrapSession({
      email: "allowance.customer@example.com",
      displayName: "Allowance Customer",
      requestedRole: "customer",
      providerUserId: "customer-allowance-1",
    });

    const subscriptionResponse = await fetch(`${baseUrl}/v1/memberships/subscriptions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
        "idempotency-key": "glow-membership-create",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        planSlug: "glow-membership",
        customer: {
          firstName: "Allowance",
          lastName: "Customer",
          email: "allowance.customer@example.com",
        },
      }),
    });
    const subscriptionPayload = (await subscriptionResponse.json()) as {
      data: {
        orderId: string;
        paymentIntentId: string;
      };
    };

    expect(subscriptionResponse.status).toBe(201);

    const webhookResponse = await postStripeWebhook({
      eventId: "evt_glow_membership_paid",
      paymentIntentId: subscriptionPayload.data.paymentIntentId,
      orderId: subscriptionPayload.data.orderId,
      timestamp: "1741363500",
    });

    expect(webhookResponse.status).toBe(200);

    const creditsResponse = await fetch(`${baseUrl}/v1/me/credits`, {
      headers: {
        authorization: `Bearer ${customerToken}`,
      },
    });
    const creditsPayload = (await creditsResponse.json()) as {
      data: {
        credits: {
          serviceAllowances: Array<{
            serviceSlug: string;
            remainingQuantity: number;
          }>;
        };
      };
    };

    expect(creditsResponse.status).toBe(200);
    expect(creditsPayload.data.credits.serviceAllowances).toHaveLength(1);
    expect(creditsPayload.data.credits.serviceAllowances[0]?.serviceSlug).toBe(
      "skin-rejuvenation",
    );
    expect(creditsPayload.data.credits.serviceAllowances[0]?.remainingQuantity).toBe(1);
  });

  it("consumes membership service allowances on covered booking checkout and restores them on refund", async () => {
    const customerToken = await createBootstrapSession({
      email: "allowance.checkout@example.com",
      displayName: "Allowance Checkout",
      requestedRole: "customer",
      providerUserId: "customer-allowance-2",
    });
    const adminToken = await createBootstrapSession({
      email: "admin@daysi.ca",
      displayName: "Daysi Admin",
      requestedRole: "admin",
      providerUserId: "admin-user-allowance-1",
    });

    const subscriptionResponse = await fetch(`${baseUrl}/v1/memberships/subscriptions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
        "idempotency-key": "glow-membership-create-checkout",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        planSlug: "glow-membership",
        customer: {
          firstName: "Allowance",
          lastName: "Checkout",
          email: "allowance.checkout@example.com",
        },
      }),
    });
    const subscriptionPayload = (await subscriptionResponse.json()) as {
      data: {
        orderId: string;
        paymentIntentId: string;
      };
    };

    expect(subscriptionResponse.status).toBe(201);

    const membershipWebhookResponse = await postStripeWebhook({
      eventId: "evt_glow_membership_paid_checkout",
      paymentIntentId: subscriptionPayload.data.paymentIntentId,
      orderId: subscriptionPayload.data.orderId,
      timestamp: "1741363600",
    });

    expect(membershipWebhookResponse.status).toBe(200);

    const availabilityResponse = await fetch(`${baseUrl}/v1/public/availability/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "skin-rejuvenation",
        fromDate: "2026-03-09",
        toDate: "2026-03-09",
        pricingMode: "membership",
      }),
    });
    const availabilityPayload = (await availabilityResponse.json()) as {
      data: {
        slots: Array<{ slotId: string }>;
      };
    };

    expect(availabilityResponse.status).toBe(200);
    expect(availabilityPayload.data.slots.length).toBeGreaterThan(0);

    const bookingResponse = await fetch(`${baseUrl}/v1/public/bookings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "allowance-booking-create",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "skin-rejuvenation",
        serviceVariantSlug: "skin-rejuvenation-photofacial-45",
        slotId: availabilityPayload.data.slots[0]?.slotId,
        pricingMode: "membership",
        customer: {
          firstName: "Allowance",
          lastName: "Checkout",
          email: "allowance.checkout@example.com",
        },
      }),
    });
    const bookingPayload = (await bookingResponse.json()) as {
      data: {
        booking: { id: string };
        managementToken: string;
      };
    };

    expect(bookingResponse.status).toBe(201);

    const checkoutResponse = await fetch(`${baseUrl}/v1/checkout/confirm`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
        "idempotency-key": "allowance-booking-checkout",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        items: [
          {
            kind: "booking",
            bookingId: bookingPayload.data.booking.id,
            managementToken: bookingPayload.data.managementToken,
          },
        ],
        customer: {
          firstName: "Allowance",
          lastName: "Checkout",
          email: "allowance.checkout@example.com",
        },
        paymentMethod: "stripe",
      }),
    });
    const checkoutPayload = (await checkoutResponse.json()) as {
      data: {
        order: {
          id: string;
          status: string;
          totalAmount: { amountCents: number };
          lineItems: Array<{
            appliedServiceAllowance?: {
              serviceSlug: string;
              quantity: number;
              discountAmount: { amountCents: number };
            };
          }>;
        };
      };
    };

    expect(checkoutResponse.status).toBe(201);
    expect(checkoutPayload.data.order.status).toBe("paid");
    expect(checkoutPayload.data.order.totalAmount.amountCents).toBe(0);
    expect(checkoutPayload.data.order.lineItems[0]?.appliedServiceAllowance).toMatchObject({
      serviceSlug: "skin-rejuvenation",
      quantity: 1,
      discountAmount: {
        amountCents: 19900,
      },
    });

    const creditsAfterCheckoutResponse = await fetch(`${baseUrl}/v1/me/credits`, {
      headers: {
        authorization: `Bearer ${customerToken}`,
      },
    });
    const creditsAfterCheckoutPayload =
      (await creditsAfterCheckoutResponse.json()) as {
        data: {
          credits: {
            serviceAllowances: Array<{
              serviceSlug: string;
              remainingQuantity: number;
            }>;
          };
        };
      };

    expect(creditsAfterCheckoutResponse.status).toBe(200);
    expect(creditsAfterCheckoutPayload.data.credits.serviceAllowances[0]?.serviceSlug).toBe(
      "skin-rejuvenation",
    );
    expect(
      creditsAfterCheckoutPayload.data.credits.serviceAllowances[0]?.remainingQuantity,
    ).toBe(0);

    const refundResponse = await fetch(
      `${baseUrl}/v1/orders/${checkoutPayload.data.order.id}/refund`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
          "idempotency-key": "allowance-booking-refund",
        },
        body: JSON.stringify({
          reason: "service allowance refund test",
        }),
      },
    );

    expect(refundResponse.status).toBe(200);

    const creditsAfterRefundResponse = await fetch(`${baseUrl}/v1/me/credits`, {
      headers: {
        authorization: `Bearer ${customerToken}`,
      },
    });
    const creditsAfterRefundPayload =
      (await creditsAfterRefundResponse.json()) as {
        data: {
          credits: {
            serviceAllowances: Array<{
              serviceSlug: string;
              remainingQuantity: number;
            }>;
          };
        };
      };

    expect(creditsAfterRefundResponse.status).toBe(200);
    expect(creditsAfterRefundPayload.data.credits.serviceAllowances[0]?.serviceSlug).toBe(
      "skin-rejuvenation",
    );
    expect(creditsAfterRefundPayload.data.credits.serviceAllowances[0]?.remainingQuantity).toBe(
      1,
    );
  });

  it("shows provider payouts after a paid booking order", async () => {
    const bookingResponse = await fetch(`${baseUrl}/v1/public/bookings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "provider-payout-booking-create",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        serviceVariantSlug: "laser-hair-removal-full-body-60",
        slotId:
          "daysi-flagship__laser-hair-removal-full-body-60__ava-chen__gentlemax-pro-a__2026-03-09T09:00:00.000Z",
        pricingMode: "retail",
        customer: {
          firstName: "Booked",
          lastName: "Customer",
          email: "booked.customer@example.com",
        },
      }),
    });
    const bookingPayload = (await bookingResponse.json()) as {
      data: {
        booking: { id: string };
        managementToken: string;
      };
    };

    expect(bookingResponse.status).toBe(201);

    const checkoutResponse = await fetch(`${baseUrl}/v1/checkout/confirm`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "provider-payout-checkout-confirm",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        items: [
          {
            kind: "booking",
            bookingId: bookingPayload.data.booking.id,
            managementToken: bookingPayload.data.managementToken,
          },
        ],
        customer: {
          firstName: "Booked",
          lastName: "Customer",
          email: "booked.customer@example.com",
        },
        paymentMethod: "stripe",
      }),
    });
    const checkoutPayload = (await checkoutResponse.json()) as {
      data: {
        order: { id: string };
        paymentSession: { paymentIntentId: string };
      };
    };

    expect(checkoutResponse.status).toBe(201);

    const eventPayload = JSON.stringify({
      id: "evt_provider_payout_payment_succeeded_1",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: checkoutPayload.data.paymentSession.paymentIntentId,
          metadata: {
            orderId: checkoutPayload.data.order.id,
          },
        },
      },
    });
    const timestamp = "1741363000";
    const signature = createHmac("sha256", "whsec_test_secret")
      .update(`${timestamp}.${eventPayload}`, "utf8")
      .digest("hex");

    const webhookResponse = await fetch(`${baseUrl}/v1/webhooks/stripe`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": `t=${timestamp},v1=${signature}`,
      },
      body: eventPayload,
    });

    expect(webhookResponse.status).toBe(200);

    const providerSession = await fetch(`${baseUrl}/v1/auth/session/exchange`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        tenantSlug: "daysi",
        providerUserId: "provider-user-ava",
        email: "ava.chen@daysi.ca",
        displayName: "Ava Chen",
        requestedRole: "provider",
      }),
    });
    const providerSessionPayload = (await providerSession.json()) as {
      data: { sessionToken: string };
    };

    const payoutsResponse = await fetch(`${baseUrl}/v1/provider/me/payouts`, {
      headers: {
        authorization: `Bearer ${providerSessionPayload.data.sessionToken}`,
      },
    });
    const payoutsPayload = (await payoutsResponse.json()) as {
      data: {
        payouts: Array<{ providerSlug: string; totalPayoutAmountCents: number }>;
      };
    };

    expect(payoutsResponse.status).toBe(200);
    expect(payoutsPayload.data.payouts).toHaveLength(1);
    expect(payoutsPayload.data.payouts[0]?.providerSlug).toBe("ava-chen");
    expect(payoutsPayload.data.payouts[0]?.totalPayoutAmountCents).toBe(11362);
  });

  it("applies coupons at checkout and reports services and education separately", async () => {
    const adminToken = await createBootstrapSession({
      email: "admin@daysi.ca",
      displayName: "Daysi Admin",
      requestedRole: "admin",
      providerUserId: "admin-user-2",
    });

    const bookingResponse = await fetch(`${baseUrl}/v1/public/bookings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "revenue-summary-booking-create",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        serviceVariantSlug: "laser-hair-removal-full-body-60",
        slotId:
          "daysi-flagship__laser-hair-removal-full-body-60__ava-chen__gentlemax-pro-a__2026-03-09T09:00:00.000Z",
        pricingMode: "retail",
        customer: {
          firstName: "Revenue",
          lastName: "Customer",
          email: "revenue.customer@example.com",
        },
      }),
    });
    const bookingPayload = (await bookingResponse.json()) as {
      data: {
        booking: { id: string };
        managementToken: string;
      };
    };

    expect(bookingResponse.status).toBe(201);

    const serviceCheckoutResponse = await fetch(`${baseUrl}/v1/checkout/confirm`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "revenue-summary-service-checkout",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        items: [
          {
            kind: "booking",
            bookingId: bookingPayload.data.booking.id,
            managementToken: bookingPayload.data.managementToken,
          },
        ],
        customer: {
          firstName: "Revenue",
          lastName: "Customer",
          email: "revenue.customer@example.com",
        },
        paymentMethod: "stripe",
      }),
    });
    const serviceCheckoutPayload = (await serviceCheckoutResponse.json()) as {
      data: {
        order: { id: string };
        paymentSession: { paymentIntentId: string };
      };
    };

    expect(serviceCheckoutResponse.status).toBe(201);

    const quoteResponse = await fetch(`${baseUrl}/v1/checkout/quote`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        items: [
          {
            kind: "educationOffer",
            offerSlug: "signature-laser-method",
            quantity: 1,
          },
        ],
        couponCodes: ["WELCOME10"],
      }),
    });
    const quotePayload = (await quoteResponse.json()) as {
      data: {
        quote: {
          totalAmount: { amountCents: number };
          appliedCoupons: Array<{ code: string }>;
        };
      };
    };

    expect(quoteResponse.status).toBe(200);
    expect(quotePayload.data.quote.totalAmount.amountCents).toBe(44910);
    expect(quotePayload.data.quote.appliedCoupons[0]?.code).toBe("WELCOME10");

    const educationCheckoutResponse = await fetch(`${baseUrl}/v1/checkout/confirm`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "revenue-summary-education-checkout",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        items: [
          {
            kind: "educationOffer",
            offerSlug: "signature-laser-method",
            quantity: 1,
          },
        ],
        couponCodes: ["WELCOME10"],
        customer: {
          firstName: "Revenue",
          lastName: "Customer",
          email: "revenue.customer@example.com",
        },
        paymentMethod: "stripe",
      }),
    });
    const educationCheckoutPayload = (await educationCheckoutResponse.json()) as {
      data: {
        order: { id: string };
        paymentSession: { paymentIntentId: string };
      };
    };

    expect(educationCheckoutResponse.status).toBe(201);

    const serviceWebhookResponse = await postStripeWebhook({
      eventId: "evt_revenue_service_paid",
      paymentIntentId: serviceCheckoutPayload.data.paymentSession.paymentIntentId,
      orderId: serviceCheckoutPayload.data.order.id,
      timestamp: "1741363100",
    });
    const educationWebhookResponse = await postStripeWebhook({
      eventId: "evt_revenue_education_paid",
      paymentIntentId: educationCheckoutPayload.data.paymentSession.paymentIntentId,
      orderId: educationCheckoutPayload.data.order.id,
      timestamp: "1741363200",
    });

    expect(serviceWebhookResponse.status).toBe(200);
    expect(educationWebhookResponse.status).toBe(200);

    const revenueSummaryResponse = await fetch(
      `${baseUrl}/v1/admin/reports/revenue-summary`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const revenueSummaryPayload = (await revenueSummaryResponse.json()) as {
      data: {
        streams: Array<{
          revenueStream: string;
          netAmount: { amountCents: number };
          discountAmount: { amountCents: number };
        }>;
      };
    };

    expect(revenueSummaryResponse.status).toBe(200);
    expect(
      revenueSummaryPayload.data.streams.find(
        (stream) => stream.revenueStream === "services",
      )?.netAmount.amountCents,
    ).toBe(29900);
    expect(
      revenueSummaryPayload.data.streams.find(
        (stream) => stream.revenueStream === "education",
      )?.netAmount.amountCents,
    ).toBe(44910);
    expect(
      revenueSummaryPayload.data.streams.find(
        (stream) => stream.revenueStream === "education",
      )?.discountAmount.amountCents,
    ).toBe(4990);
  });

  it("runs referral programs end to end and reports qualified referral performance", async () => {
    const ownerToken = await createBootstrapSession({
      email: "owner@daysi.ca",
      displayName: "Daysi Owner",
      requestedRole: "owner",
      providerUserId: "owner-user-referrals-1",
    });
    const advocateToken = await createBootstrapSession({
      email: "advocate@example.com",
      displayName: "Advocate Example",
      requestedRole: "customer",
      providerUserId: "customer-referrals-advocate-1",
    });
    const refereeToken = await createBootstrapSession({
      email: "referee@example.com",
      displayName: "Referee Example",
      requestedRole: "customer",
      providerUserId: "customer-referrals-referee-1",
    });

    const createProgramResponse = await fetch(`${baseUrl}/v1/admin/referrals/programs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        name: "Flagship Launch Referrals",
        codePrefix: "DAYSI",
        referredReward: {
          kind: "account_credit",
          amount: {
            currency: "CAD",
            amountCents: 1000,
          },
        },
        advocateReward: {
          kind: "account_credit",
          amount: {
            currency: "CAD",
            amountCents: 2000,
          },
        },
      }),
    });

    expect(createProgramResponse.status).toBe(201);

    const advocateReferralResponse = await fetch(
      `${baseUrl}/v1/me/referral?locationSlug=daysi-flagship`,
      {
        headers: {
          authorization: `Bearer ${advocateToken}`,
        },
      },
    );
    const advocateReferralPayload = (await advocateReferralResponse.json()) as {
      data: {
        overview: {
          referralCode: { code: string } | null;
        };
      };
    };

    expect(advocateReferralResponse.status).toBe(200);
    expect(advocateReferralPayload.data.overview.referralCode?.code).toMatch(/^DAYSI/);

    const applyReferralResponse = await fetch(`${baseUrl}/v1/referrals/apply`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${refereeToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        code: advocateReferralPayload.data.overview.referralCode?.code,
      }),
    });
    const applyReferralPayload = (await applyReferralResponse.json()) as {
      data: {
        relationship: { status: string };
        rewardEvents: Array<{ reward: { amount: { amountCents: number } } }>;
      };
    };

    expect(applyReferralResponse.status).toBe(201);
    expect(applyReferralPayload.data.relationship.status).toBe("applied");
    expect(applyReferralPayload.data.rewardEvents[0]?.reward.amount.amountCents).toBe(1000);

    const refereeCreditsResponse = await fetch(`${baseUrl}/v1/me/credits`, {
      headers: {
        authorization: `Bearer ${refereeToken}`,
      },
    });
    const refereeCreditsPayload = (await refereeCreditsResponse.json()) as {
      data: {
        credits: {
          availableAmount: { amountCents: number };
        };
      };
    };

    expect(refereeCreditsResponse.status).toBe(200);
    expect(refereeCreditsPayload.data.credits.availableAmount.amountCents).toBe(1000);

    const bookingResponse = await fetch(`${baseUrl}/v1/public/bookings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "referral-booking-create-1",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        serviceVariantSlug: "laser-hair-removal-full-body-60",
        slotId:
          "daysi-flagship__laser-hair-removal-full-body-60__ava-chen__gentlemax-pro-a__2026-03-09T09:00:00.000Z",
        pricingMode: "retail",
        customer: {
          firstName: "Referee",
          lastName: "Example",
          email: "referee@example.com",
        },
      }),
    });
    const bookingPayload = (await bookingResponse.json()) as {
      data: {
        booking: { id: string };
        managementToken: string;
      };
    };

    expect(bookingResponse.status).toBe(201);

    const checkoutResponse = await fetch(`${baseUrl}/v1/checkout/confirm`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "referral-checkout-confirm-1",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        items: [
          {
            kind: "booking",
            bookingId: bookingPayload.data.booking.id,
            managementToken: bookingPayload.data.managementToken,
          },
        ],
        customer: {
          firstName: "Referee",
          lastName: "Example",
          email: "referee@example.com",
        },
        paymentMethod: "stripe",
      }),
    });
    const checkoutPayload = (await checkoutResponse.json()) as {
      data: {
        order: { id: string };
        paymentSession: { paymentIntentId: string };
      };
    };

    expect(checkoutResponse.status).toBe(201);

    const webhookResponse = await postStripeWebhook({
      eventId: "evt_referral_payment_succeeded",
      paymentIntentId: checkoutPayload.data.paymentSession.paymentIntentId,
      orderId: checkoutPayload.data.order.id,
      timestamp: "1741363300",
    });

    expect(webhookResponse.status).toBe(200);

    const advocateCreditsResponse = await fetch(`${baseUrl}/v1/me/credits`, {
      headers: {
        authorization: `Bearer ${advocateToken}`,
      },
    });
    const advocateCreditsPayload = (await advocateCreditsResponse.json()) as {
      data: {
        credits: {
          availableAmount: { amountCents: number };
        };
      };
    };

    expect(advocateCreditsResponse.status).toBe(200);
    expect(advocateCreditsPayload.data.credits.availableAmount.amountCents).toBe(2000);

    const advocateReferralSummaryResponse = await fetch(
      `${baseUrl}/v1/me/referral?locationSlug=daysi-flagship`,
      {
        headers: {
          authorization: `Bearer ${advocateToken}`,
        },
      },
    );
    const advocateReferralSummaryPayload =
      (await advocateReferralSummaryResponse.json()) as {
        data: {
          overview: {
            summary: {
              invitedCount: number;
              qualifiedInviteCount: number;
              totalRewardAmount: { amountCents: number };
            };
          };
        };
      };

    expect(advocateReferralSummaryResponse.status).toBe(200);
    expect(advocateReferralSummaryPayload.data.overview.summary.invitedCount).toBe(1);
    expect(advocateReferralSummaryPayload.data.overview.summary.qualifiedInviteCount).toBe(1);
    expect(
      advocateReferralSummaryPayload.data.overview.summary.totalRewardAmount.amountCents,
    ).toBe(2000);

    const referralReportResponse = await fetch(
      `${baseUrl}/v1/admin/reports/referral-performance?locationSlug=daysi-flagship`,
      {
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
      },
    );
    const referralReportPayload = (await referralReportResponse.json()) as {
      data: {
        relationshipCount: number;
        qualifiedRelationshipCount: number;
        rewardEventCount: number;
        totalRewardAmount: { amountCents: number };
        totalQualifiedRevenueAmount: { amountCents: number };
      };
    };

    expect(referralReportResponse.status).toBe(200);
    expect(referralReportPayload.data.relationshipCount).toBe(1);
    expect(referralReportPayload.data.qualifiedRelationshipCount).toBe(1);
    expect(referralReportPayload.data.rewardEventCount).toBe(2);
    expect(referralReportPayload.data.totalRewardAmount.amountCents).toBe(3000);
    expect(referralReportPayload.data.totalQualifiedRevenueAmount.amountCents).toBe(29900);
  });

  it("reports membership performance across active, cancelled, and allowance-backed memberships", async () => {
    const adminToken = await createBootstrapSession({
      email: "admin@daysi.ca",
      displayName: "Daysi Admin",
      requestedRole: "admin",
      providerUserId: "admin-user-membership-report-1",
    });
    const glowCustomerToken = await createBootstrapSession({
      email: "membership.report@example.com",
      displayName: "Membership Report Customer",
      requestedRole: "customer",
      providerUserId: "customer-membership-report-1",
    });
    const educationCustomerToken = await createBootstrapSession({
      email: "education.report@example.com",
      displayName: "Education Membership Report Customer",
      requestedRole: "customer",
      providerUserId: "customer-membership-report-2",
    });

    const glowSubscriptionResponse = await fetch(`${baseUrl}/v1/memberships/subscriptions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${glowCustomerToken}`,
        "idempotency-key": "membership-report-glow-create",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        planSlug: "glow-membership",
        customer: {
          firstName: "Membership",
          lastName: "Report",
          email: "membership.report@example.com",
        },
      }),
    });
    const glowSubscriptionPayload = (await glowSubscriptionResponse.json()) as {
      data: {
        orderId: string;
        paymentIntentId: string;
      };
    };

    expect(glowSubscriptionResponse.status).toBe(201);

    const glowSubscriptionWebhookResponse = await postStripeWebhook({
      eventId: "evt_membership_report_glow_paid",
      paymentIntentId: glowSubscriptionPayload.data.paymentIntentId,
      orderId: glowSubscriptionPayload.data.orderId,
      timestamp: "1741363800",
    });

    expect(glowSubscriptionWebhookResponse.status).toBe(200);

    const availabilityResponse = await fetch(`${baseUrl}/v1/public/availability/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "skin-rejuvenation",
        fromDate: "2026-03-09",
        toDate: "2026-03-09",
        pricingMode: "membership",
      }),
    });
    const availabilityPayload = (await availabilityResponse.json()) as {
      data: {
        slots: Array<{ slotId: string }>;
      };
    };

    expect(availabilityResponse.status).toBe(200);

    const bookingResponse = await fetch(`${baseUrl}/v1/public/bookings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "membership-report-booking-create",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "skin-rejuvenation",
        serviceVariantSlug: "skin-rejuvenation-photofacial-45",
        slotId: availabilityPayload.data.slots[0]?.slotId,
        pricingMode: "membership",
        customer: {
          firstName: "Membership",
          lastName: "Report",
          email: "membership.report@example.com",
        },
      }),
    });
    const bookingPayload = (await bookingResponse.json()) as {
      data: {
        booking: { id: string };
        managementToken: string;
      };
    };

    expect(bookingResponse.status).toBe(201);

    const allowanceCheckoutResponse = await fetch(`${baseUrl}/v1/checkout/confirm`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${glowCustomerToken}`,
        "idempotency-key": "membership-report-booking-checkout",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        items: [
          {
            kind: "booking",
            bookingId: bookingPayload.data.booking.id,
            managementToken: bookingPayload.data.managementToken,
          },
        ],
        customer: {
          firstName: "Membership",
          lastName: "Report",
          email: "membership.report@example.com",
        },
        paymentMethod: "stripe",
      }),
    });

    expect(allowanceCheckoutResponse.status).toBe(201);

    const educationSubscriptionResponse = await fetch(
      `${baseUrl}/v1/memberships/subscriptions`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${educationCustomerToken}`,
          "idempotency-key": "membership-report-education-create",
        },
        body: JSON.stringify({
          locationSlug: "daysi-flagship",
          planSlug: "education-membership",
          customer: {
            firstName: "Education",
            lastName: "Report",
            email: "education.report@example.com",
          },
        }),
      },
    );
    const educationSubscriptionPayload = (await educationSubscriptionResponse.json()) as {
      data: {
        orderId: string;
        paymentIntentId: string;
      };
    };

    expect(educationSubscriptionResponse.status).toBe(201);

    const educationSubscriptionWebhookResponse = await postStripeWebhook({
      eventId: "evt_membership_report_education_paid",
      paymentIntentId: educationSubscriptionPayload.data.paymentIntentId,
      orderId: educationSubscriptionPayload.data.orderId,
      timestamp: "1741363810",
    });

    expect(educationSubscriptionWebhookResponse.status).toBe(200);

    const educationRefundResponse = await fetch(
      `${baseUrl}/v1/orders/${educationSubscriptionPayload.data.orderId}/refund`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
          "idempotency-key": "membership-report-education-refund",
        },
        body: JSON.stringify({
          reason: "membership performance test refund",
        }),
      },
    );

    expect(educationRefundResponse.status).toBe(200);

    const membershipPerformanceResponse = await fetch(
      `${baseUrl}/v1/admin/reports/membership-performance?locationSlug=daysi-flagship`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const membershipPerformancePayload = (await membershipPerformanceResponse.json()) as {
      data: {
        totals: {
          totalSubscriptions: number;
          activeSubscriptionCount: number;
          cancelledSubscriptionCount: number;
          activeRecurringAmount: { amountCents: number };
          netMembershipRevenueAmount: { amountCents: number };
          refundedMembershipRevenueAmount: { amountCents: number };
          serviceAllowanceUsedQuantity: number;
        };
        plans: Array<{
          planSlug: string;
          activeSubscriptionCount: number;
          cancelledSubscriptionCount: number;
          serviceAllowanceUsedQuantity: number;
          serviceAllowanceRemainingQuantity: number;
        }>;
      };
    };

    expect(membershipPerformanceResponse.status).toBe(200);
    expect(membershipPerformancePayload.data.totals.totalSubscriptions).toBe(2);
    expect(membershipPerformancePayload.data.totals.activeSubscriptionCount).toBe(1);
    expect(membershipPerformancePayload.data.totals.cancelledSubscriptionCount).toBe(1);
    expect(membershipPerformancePayload.data.totals.activeRecurringAmount.amountCents).toBe(
      12900,
    );
    expect(membershipPerformancePayload.data.totals.netMembershipRevenueAmount.amountCents).toBe(
      12900,
    );
    expect(
      membershipPerformancePayload.data.totals.refundedMembershipRevenueAmount.amountCents,
    ).toBe(19900);
    expect(membershipPerformancePayload.data.totals.serviceAllowanceUsedQuantity).toBe(1);
    expect(
      membershipPerformancePayload.data.plans.find(
        (plan) => plan.planSlug === "glow-membership",
      )?.serviceAllowanceRemainingQuantity,
    ).toBe(0);
    expect(
      membershipPerformancePayload.data.plans.find(
        (plan) => plan.planSlug === "education-membership",
      )?.cancelledSubscriptionCount,
    ).toBe(1);
  });

  it("builds customer context from archived events, notes, tags, and customer activity", async () => {
    const adminToken = await createBootstrapSession({
      email: "admin@daysi.ca",
      displayName: "Daysi Admin",
      requestedRole: "admin",
      providerUserId: "admin-user-customer-context-1",
    });
    const customerToken = await createBootstrapSession({
      email: "context.timeline@example.com",
      displayName: "Context Timeline Customer",
      requestedRole: "customer",
      providerUserId: "customer-context-1",
    });

    const availabilityResponse = await fetch(`${baseUrl}/v1/public/availability/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        fromDate: "2026-03-09",
        toDate: "2026-03-09",
        pricingMode: "retail",
      }),
    });
    const availabilityPayload = (await availabilityResponse.json()) as {
      data: {
        slots: Array<{ slotId: string }>;
      };
    };

    expect(availabilityResponse.status).toBe(200);
    expect(availabilityPayload.data.slots.length).toBeGreaterThan(0);

    const bookingResponse = await fetch(`${baseUrl}/v1/public/bookings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "customer-context-booking-create",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        serviceVariantSlug: "laser-hair-removal-full-body-60",
        slotId: availabilityPayload.data.slots[0]?.slotId,
        pricingMode: "retail",
        customer: {
          firstName: "Context",
          lastName: "Timeline",
          email: "context.timeline@example.com",
        },
      }),
    });
    const bookingPayload = (await bookingResponse.json()) as {
      data: {
        booking: { id: string };
        managementToken: string;
      };
    };

    expect(bookingResponse.status).toBe(201);

    const membershipResponse = await fetch(`${baseUrl}/v1/memberships/subscriptions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
        "idempotency-key": "customer-context-membership-create",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        planSlug: "glow-membership",
        customer: {
          firstName: "Context",
          lastName: "Timeline",
          email: "context.timeline@example.com",
        },
      }),
    });
    const membershipPayload = (await membershipResponse.json()) as {
      data: {
        orderId: string;
        paymentIntentId: string;
      };
    };

    expect(membershipResponse.status).toBe(201);

    const membershipWebhookResponse = await postStripeWebhook({
      eventId: "evt_customer_context_membership_paid",
      paymentIntentId: membershipPayload.data.paymentIntentId,
      orderId: membershipPayload.data.orderId,
      timestamp: "1741363900",
    });

    expect(membershipWebhookResponse.status).toBe(200);

    const educationCheckoutResponse = await fetch(`${baseUrl}/v1/checkout/confirm`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
        "idempotency-key": "customer-context-education-checkout",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        items: [
          {
            kind: "educationOffer",
            offerSlug: "signature-laser-method",
            quantity: 1,
          },
        ],
        customer: {
          firstName: "Context",
          lastName: "Timeline",
          email: "context.timeline@example.com",
        },
        paymentMethod: "stripe",
      }),
    });
    const educationCheckoutPayload = (await educationCheckoutResponse.json()) as {
      data: {
        order: { id: string };
        paymentSession: { paymentIntentId: string };
      };
    };

    expect(educationCheckoutResponse.status).toBe(201);

    const educationWebhookResponse = await postStripeWebhook({
      eventId: "evt_customer_context_education_paid",
      paymentIntentId: educationCheckoutPayload.data.paymentSession.paymentIntentId,
      orderId: educationCheckoutPayload.data.order.id,
      timestamp: "1741363910",
    });

    expect(educationWebhookResponse.status).toBe(200);

    const enrollmentResponse = await fetch(`${baseUrl}/v1/education/enrollments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        offerSlug: "signature-laser-method",
      }),
    });

    expect(enrollmentResponse.status).toBe(201);

    const aiResponse = await fetch(`${baseUrl}/v1/ai/booking-assistant/chat`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        messages: [
          {
            role: "user",
            content: "I want smoother skin and I’m considering memberships.",
          },
        ],
      }),
    });

    expect(aiResponse.status).toBe(200);

    const noteResponse = await fetch(`${baseUrl}/v1/admin/customers/notes`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        customerEmail: "context.timeline@example.com",
        customerName: "Context Timeline",
        body: "Prefers concise follow-up and morning availability.",
      }),
    });
    const notePayload = (await noteResponse.json()) as {
      data: {
        note: { body: string };
      };
    };

    expect(noteResponse.status).toBe(201);
    expect(notePayload.data.note.body).toContain("morning availability");

    const tagResponse = await fetch(`${baseUrl}/v1/admin/customers/tags`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        customerEmail: "context.timeline@example.com",
        label: "high-value-lead",
      }),
    });
    const tagPayload = (await tagResponse.json()) as {
      data: {
        tag: { label: string };
      };
    };

    expect(tagResponse.status).toBe(201);
    expect(tagPayload.data.tag.label).toBe("high-value-lead");

    const contextResponse = await fetch(
      `${baseUrl}/v1/admin/customers/context?locationSlug=daysi-flagship&customerEmail=context.timeline@example.com`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const contextPayload = (await contextResponse.json()) as {
      data: {
        context: {
          notes: Array<{ body: string }>;
          tags: Array<{ label: string }>;
          segments: Array<{ key: string }>;
          recentEvents: Array<{ eventType: string }>;
          summary: {
            bookingCount: number;
            paidOrderCount: number;
            activeSubscriptionCount: number;
            activeEntitlementCount: number;
          };
        };
      };
    };

    expect(contextResponse.status).toBe(200);
    expect(contextPayload.data.context.notes[0]?.body).toContain("morning availability");
    expect(contextPayload.data.context.tags.map((tag) => tag.label)).toContain(
      "high-value-lead",
    );
    expect(contextPayload.data.context.segments.map((segment) => segment.key)).toEqual(
      expect.arrayContaining(["active_member", "education_customer"]),
    );
    expect(
      contextPayload.data.context.recentEvents.map((event) => event.eventType),
    ).toEqual(
      expect.arrayContaining([
        "booking.created",
        "membership.subscription_created",
        "membership.subscription_activated",
        "order.paid",
        "education.enrollment_created",
        "ai.run_completed",
      ]),
    );
    expect(contextPayload.data.context.summary.bookingCount).toBe(1);
    expect(contextPayload.data.context.summary.paidOrderCount).toBe(2);
    expect(contextPayload.data.context.summary.activeSubscriptionCount).toBe(1);
    expect(contextPayload.data.context.summary.activeEntitlementCount).toBe(1);
    expect(bookingPayload.data.managementToken).toBeTruthy();

    const directoryResponse = await fetch(
      `${baseUrl}/v1/admin/customers?locationSlug=daysi-flagship&search=timeline&page=0&pageSize=10`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const directoryPayload = (await directoryResponse.json()) as {
      data: {
        totalCount: number;
        stats: {
          activeMembershipCustomerCount: number;
          totalPaidRevenueAmountCents: number;
        };
        customers: Array<{
          customerEmail: string;
          summary: {
            paidOrderCount: number;
            activeSubscriptionCount: number;
            totalPaidRevenueAmountCents: number;
          };
        }>;
      };
    };

    expect(directoryResponse.status).toBe(200);
    expect(directoryPayload.data.totalCount).toBeGreaterThan(0);
    expect(directoryPayload.data.stats.activeMembershipCustomerCount).toBeGreaterThan(0);
    expect(directoryPayload.data.stats.totalPaidRevenueAmountCents).toBeGreaterThan(0);
    expect(
      directoryPayload.data.customers.find(
        (customer) => customer.customerEmail === "context.timeline@example.com",
      )?.summary.activeSubscriptionCount,
    ).toBe(1);
    expect(
      directoryPayload.data.customers.find(
        (customer) => customer.customerEmail === "context.timeline@example.com",
      )?.summary.paidOrderCount,
    ).toBe(2);
  });

  it("lets admins publish prepaid service packages and customers redeem them through checkout", async () => {
    const adminToken = await createBootstrapSession({
      email: "admin@daysi.ca",
      displayName: "Daysi Admin",
      requestedRole: "admin",
      providerUserId: "admin-user-package-1",
    });
    const customerToken = await createBootstrapSession({
      email: "package.customer@example.com",
      displayName: "Package Customer",
      requestedRole: "customer",
      providerUserId: "customer-package-1",
    });

    const createPackageResponse = await fetch(`${baseUrl}/v1/admin/packages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        slug: "photofacial-series-2",
        name: "Photofacial Series of 2",
        shortDescription: "Two prepaid skin rejuvenation treatments.",
        status: "published",
        price: {
          currency: "CAD",
          amountCents: 39900,
        },
        serviceCredits: [
          {
            serviceSlug: "skin-rejuvenation",
            quantity: 2,
          },
        ],
        featureTags: ["prepaid", "photofacial"],
      }),
    });

    expect(createPackageResponse.status).toBe(201);

    const publicPackagesResponse = await fetch(
      `${baseUrl}/v1/public/locations/daysi-flagship/catalog/packages`,
    );
    const publicPackagesPayload = (await publicPackagesResponse.json()) as {
      data: {
        servicePackages: Array<{ slug: string }>;
      };
    };

    expect(publicPackagesResponse.status).toBe(200);
    expect(
      publicPackagesPayload.data.servicePackages.some(
        (servicePackage) => servicePackage.slug === "photofacial-series-2",
      ),
    ).toBe(true);

    const purchaseResponse = await fetch(`${baseUrl}/v1/checkout/confirm`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
        "idempotency-key": "package-purchase-checkout",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        items: [
          {
            kind: "servicePackage",
            packageSlug: "photofacial-series-2",
            quantity: 1,
          },
        ],
        customer: {
          firstName: "Package",
          lastName: "Customer",
          email: "package.customer@example.com",
        },
        paymentMethod: "stripe",
      }),
    });
    const purchasePayload = (await purchaseResponse.json()) as {
      data: {
        order: { id: string };
        paymentSession: { paymentIntentId: string };
      };
    };

    expect(purchaseResponse.status).toBe(201);

    const purchaseWebhookResponse = await postStripeWebhook({
      eventId: "evt_package_purchase_paid",
      paymentIntentId: purchasePayload.data.paymentSession.paymentIntentId,
      orderId: purchasePayload.data.order.id,
      timestamp: "1741363950",
    });

    expect(purchaseWebhookResponse.status).toBe(200);

    const myPackagesAfterPurchaseResponse = await fetch(`${baseUrl}/v1/me/packages`, {
      headers: {
        authorization: `Bearer ${customerToken}`,
      },
    });
    const myPackagesAfterPurchasePayload =
      (await myPackagesAfterPurchaseResponse.json()) as {
        data: {
          purchases: Array<{
            purchase: { status: string };
            servicePackage: { slug: string };
            balances: Array<{ serviceSlug: string; remainingQuantity: number }>;
          }>;
        };
      };

    expect(myPackagesAfterPurchaseResponse.status).toBe(200);
    expect(
      myPackagesAfterPurchasePayload.data.purchases.find(
        (entry) => entry.servicePackage.slug === "photofacial-series-2",
      )?.purchase.status,
    ).toBe("active");
    expect(
      myPackagesAfterPurchasePayload.data.purchases.find(
        (entry) => entry.servicePackage.slug === "photofacial-series-2",
      )?.balances[0]?.remainingQuantity,
    ).toBe(2);

    const availabilityResponse = await fetch(`${baseUrl}/v1/public/availability/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "skin-rejuvenation",
        fromDate: "2026-03-09",
        toDate: "2026-03-09",
        pricingMode: "retail",
      }),
    });
    const availabilityPayload = (await availabilityResponse.json()) as {
      data: {
        slots: Array<{ slotId: string }>;
      };
    };

    expect(availabilityResponse.status).toBe(200);
    expect(availabilityPayload.data.slots.length).toBeGreaterThan(0);

    const bookingResponse = await fetch(`${baseUrl}/v1/public/bookings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "package-redemption-booking-create",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "skin-rejuvenation",
        serviceVariantSlug: "skin-rejuvenation-photofacial-45",
        slotId: availabilityPayload.data.slots[0]?.slotId,
        pricingMode: "retail",
        customer: {
          firstName: "Package",
          lastName: "Customer",
          email: "package.customer@example.com",
        },
      }),
    });
    const bookingPayload = (await bookingResponse.json()) as {
      data: {
        booking: { id: string };
        managementToken: string;
      };
    };

    expect(bookingResponse.status).toBe(201);

    const redemptionCheckoutResponse = await fetch(`${baseUrl}/v1/checkout/confirm`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
        "idempotency-key": "package-redemption-checkout",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        items: [
          {
            kind: "booking",
            bookingId: bookingPayload.data.booking.id,
            managementToken: bookingPayload.data.managementToken,
          },
        ],
        customer: {
          firstName: "Package",
          lastName: "Customer",
          email: "package.customer@example.com",
        },
        paymentMethod: "stripe",
      }),
    });
    const redemptionCheckoutPayload = (await redemptionCheckoutResponse.json()) as {
      data: {
        order: {
          status: string;
          totalAmount: { amountCents: number };
          lineItems: Array<{
            appliedPackageRedemption?: { packageSlug: string; serviceSlug: string };
          }>;
        };
        paymentSession: { status: string };
      };
    };

    expect(redemptionCheckoutResponse.status).toBe(201);
    expect(redemptionCheckoutPayload.data.order.status).toBe("paid");
    expect(redemptionCheckoutPayload.data.order.totalAmount.amountCents).toBe(0);
    expect(redemptionCheckoutPayload.data.paymentSession.status).toBe("not_required");
    expect(
      redemptionCheckoutPayload.data.order.lineItems[0]?.appliedPackageRedemption?.packageSlug,
    ).toBe("photofacial-series-2");

    const myPackagesAfterRedemptionResponse = await fetch(`${baseUrl}/v1/me/packages`, {
      headers: {
        authorization: `Bearer ${customerToken}`,
      },
    });
    const myPackagesAfterRedemptionPayload =
      (await myPackagesAfterRedemptionResponse.json()) as {
        data: {
          purchases: Array<{
            servicePackage: { slug: string };
            balances: Array<{ serviceSlug: string; remainingQuantity: number }>;
          }>;
        };
      };

    expect(myPackagesAfterRedemptionResponse.status).toBe(200);
    expect(
      myPackagesAfterRedemptionPayload.data.purchases.find(
        (entry) => entry.servicePackage.slug === "photofacial-series-2",
      )?.balances[0]?.remainingQuantity,
    ).toBe(1);
  });

  it("creates waitlist entries, exposes matches, and lets scoped staff update lifecycle state", async () => {
    const customerToken = await createBootstrapSession({
      email: "waitlist.customer@example.com",
      displayName: "Waitlist Customer",
      requestedRole: "customer",
      providerUserId: "customer-waitlist-1",
    });
    const adminToken = await createBootstrapSession({
      email: "ops.admin@daysi.ca",
      displayName: "Ops Admin",
      requestedRole: "admin",
      providerUserId: "admin-waitlist-1",
      locationScopes: ["daysi-flagship"],
    });

    const createWaitlistResponse = await fetch(`${baseUrl}/v1/public/waitlist`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
        "idempotency-key": "waitlist-create-1",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "skin-rejuvenation",
        serviceVariantSlug: "skin-rejuvenation-photofacial-45",
        preferredProviderSlug: "ava-chen",
        pricingMode: "retail",
        requestedWindow: {
          fromDate: "2026-03-11",
          toDate: "2026-03-11",
        },
        customer: {
          firstName: "Waitlist",
          lastName: "Customer",
          email: "waitlist.customer@example.com",
        },
      }),
    });
    const createWaitlistPayload = (await createWaitlistResponse.json()) as {
      data: {
        waitlistEntry: { id: string; status: string };
        managementToken: string;
      };
    };

    expect(createWaitlistResponse.status).toBe(201);
    expect(createWaitlistPayload.data.waitlistEntry.status).toBe("active");

    const myWaitlistResponse = await fetch(`${baseUrl}/v1/me/waitlist`, {
      headers: {
        authorization: `Bearer ${customerToken}`,
      },
    });
    const myWaitlistPayload = (await myWaitlistResponse.json()) as {
      data: {
        entries: Array<{ id: string }>;
      };
    };

    expect(myWaitlistResponse.status).toBe(200);
    expect(
      myWaitlistPayload.data.entries.some(
        (entry) => entry.id === createWaitlistPayload.data.waitlistEntry.id,
      ),
    ).toBe(true);

    const matchesResponse = await fetch(
      `${baseUrl}/v1/waitlist/${createWaitlistPayload.data.waitlistEntry.id}/matches`,
      {
        headers: {
          "x-waitlist-token": createWaitlistPayload.data.managementToken,
        },
      },
    );
    const matchesPayload = (await matchesResponse.json()) as {
      data: {
        slots: Array<{ providerSlug: string; serviceSlug: string }>;
      };
    };

    expect(matchesResponse.status).toBe(200);
    expect(matchesPayload.data.slots.length).toBeGreaterThan(0);
    expect(matchesPayload.data.slots[0]?.providerSlug).toBe("ava-chen");
    expect(matchesPayload.data.slots[0]?.serviceSlug).toBe("skin-rejuvenation");

    const adminWaitlistResponse = await fetch(
      `${baseUrl}/v1/admin/waitlist?locationSlug=daysi-flagship&status=active`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const adminWaitlistPayload = (await adminWaitlistResponse.json()) as {
      data: {
        entries: Array<{ id: string }>;
      };
    };

    expect(adminWaitlistResponse.status).toBe(200);
    expect(
      adminWaitlistPayload.data.entries.some(
        (entry) => entry.id === createWaitlistPayload.data.waitlistEntry.id,
      ),
    ).toBe(true);

    const notifyResponse = await fetch(
      `${baseUrl}/v1/admin/waitlist/${createWaitlistPayload.data.waitlistEntry.id}/status`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
          "idempotency-key": "waitlist-notify-1",
        },
        body: JSON.stringify({
          status: "notified",
          note: "A same-week opening is available.",
        }),
      },
    );
    const notifyPayload = (await notifyResponse.json()) as {
      data: {
        waitlistEntry: { status: string };
      };
    };

    expect(notifyResponse.status).toBe(200);
    expect(notifyPayload.data.waitlistEntry.status).toBe("notified");

    const cancelResponse = await fetch(
      `${baseUrl}/v1/waitlist/${createWaitlistPayload.data.waitlistEntry.id}/cancel`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${customerToken}`,
          "idempotency-key": "waitlist-cancel-1",
        },
        body: JSON.stringify({
          managementToken: createWaitlistPayload.data.managementToken,
          reason: "Customer booked a different time.",
        }),
      },
    );
    const cancelPayload = (await cancelResponse.json()) as {
      data: {
        waitlistEntry: { status: string };
      };
    };

    expect(cancelResponse.status).toBe(200);
    expect(cancelPayload.data.waitlistEntry.status).toBe("cancelled");
  });

  it("returns rebooking suggestions for an existing booking without reusing the original slot", async () => {
    const customerToken = await createBootstrapSession({
      email: "rebook.customer@example.com",
      displayName: "Rebook Customer",
      requestedRole: "customer",
      providerUserId: "customer-rebook-1",
    });

    const availabilityResponse = await fetch(`${baseUrl}/v1/public/availability/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        fromDate: "2026-03-09",
        toDate: "2026-03-09",
        pricingMode: "retail",
      }),
    });
    const availabilityPayload = (await availabilityResponse.json()) as {
      data: {
        slots: Array<{ slotId: string; startAt: string }>;
      };
    };

    expect(availabilityResponse.status).toBe(200);
    expect(availabilityPayload.data.slots.length).toBeGreaterThan(0);

    const bookingResponse = await fetch(`${baseUrl}/v1/public/bookings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
        "idempotency-key": "rebooking-create-1",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        serviceVariantSlug: "laser-hair-removal-full-body-60",
        slotId: availabilityPayload.data.slots[0]?.slotId,
        pricingMode: "retail",
        customer: {
          firstName: "Rebook",
          lastName: "Customer",
          email: "rebook.customer@example.com",
        },
      }),
    });
    const bookingPayload = (await bookingResponse.json()) as {
      data: {
        booking: { id: string; startAt: string; serviceSlug: string };
        managementToken: string;
      };
    };

    expect(bookingResponse.status).toBe(201);

    const rebookingResponse = await fetch(
      `${baseUrl}/v1/bookings/${bookingPayload.data.booking.id}/rebooking-options?fromDate=2026-03-10&toDate=2026-03-12&pricingMode=retail`,
      {
        headers: {
          "x-booking-token": bookingPayload.data.managementToken,
        },
      },
    );
    const rebookingPayload = (await rebookingResponse.json()) as {
      data: {
        fromDate: string;
        toDate: string;
        pricingMode: string;
        slots: Array<{ startAt: string; serviceSlug: string }>;
      };
    };

    expect(rebookingResponse.status).toBe(200);
    expect(rebookingPayload.data.fromDate).toBe("2026-03-10");
    expect(rebookingPayload.data.toDate).toBe("2026-03-12");
    expect(rebookingPayload.data.pricingMode).toBe("retail");
    expect(rebookingPayload.data.slots.length).toBeGreaterThan(0);
    expect(
      rebookingPayload.data.slots.every(
        (slot) =>
          slot.serviceSlug === bookingPayload.data.booking.serviceSlug &&
          slot.startAt !== bookingPayload.data.booking.startAt,
      ),
    ).toBe(true);
  });

  it("reports operations performance across search demand, waitlist demand, bookings, and machine revenue", async () => {
    const customerToken = await createBootstrapSession({
      email: "ops.customer@example.com",
      displayName: "Ops Customer",
      requestedRole: "customer",
      providerUserId: "customer-ops-1",
    });
    const adminToken = await createBootstrapSession({
      email: "ops.reporting@daysi.ca",
      displayName: "Ops Reporting",
      requestedRole: "admin",
      providerUserId: "admin-ops-1",
      locationScopes: ["daysi-flagship"],
    });

    const firstSearchResponse = await fetch(`${baseUrl}/v1/public/availability/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        fromDate: "2026-03-09",
        toDate: "2026-03-09",
        pricingMode: "retail",
      }),
    });
    const firstSearchPayload = (await firstSearchResponse.json()) as {
      data: {
        slots: Array<{ slotId: string }>;
      };
    };

    expect(firstSearchResponse.status).toBe(200);
    expect(firstSearchPayload.data.slots.length).toBeGreaterThan(0);

    const secondSearchResponse = await fetch(`${baseUrl}/v1/public/availability/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        fromDate: "2026-03-09",
        toDate: "2026-03-09",
        pricingMode: "retail",
      }),
    });

    expect(secondSearchResponse.status).toBe(200);

    const waitlistResponse = await fetch(`${baseUrl}/v1/public/waitlist`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
        "idempotency-key": "ops-report-waitlist",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        serviceVariantSlug: "laser-hair-removal-full-body-60",
        pricingMode: "retail",
        requestedWindow: {
          fromDate: "2026-03-09",
          toDate: "2026-03-10",
        },
        customer: {
          firstName: "Ops",
          lastName: "Customer",
          email: "ops.customer@example.com",
        },
      }),
    });

    expect(waitlistResponse.status).toBe(201);

    const bookingResponse = await fetch(`${baseUrl}/v1/public/bookings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
        "idempotency-key": "ops-report-booking",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "laser-hair-removal",
        serviceVariantSlug: "laser-hair-removal-full-body-60",
        slotId: firstSearchPayload.data.slots[0]?.slotId,
        pricingMode: "retail",
        customer: {
          firstName: "Ops",
          lastName: "Customer",
          email: "ops.customer@example.com",
        },
      }),
    });
    const bookingPayload = (await bookingResponse.json()) as {
      data: {
        booking: { id: string };
        managementToken: string;
      };
    };

    expect(bookingResponse.status).toBe(201);

    const checkoutResponse = await fetch(`${baseUrl}/v1/checkout/confirm`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
        "idempotency-key": "ops-report-checkout",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        items: [
          {
            kind: "booking",
            bookingId: bookingPayload.data.booking.id,
            managementToken: bookingPayload.data.managementToken,
          },
        ],
        customer: {
          firstName: "Ops",
          lastName: "Customer",
          email: "ops.customer@example.com",
        },
        paymentMethod: "stripe",
      }),
    });
    const checkoutPayload = (await checkoutResponse.json()) as {
      data: {
        order: { id: string };
        paymentSession: { paymentIntentId: string };
      };
    };

    expect(checkoutResponse.status).toBe(201);

    const webhookResponse = await postStripeWebhook({
      eventId: "evt_ops_report_paid",
      paymentIntentId: checkoutPayload.data.paymentSession.paymentIntentId,
      orderId: checkoutPayload.data.order.id,
      timestamp: "1741364050",
    });

    expect(webhookResponse.status).toBe(200);

    const reportResponse = await fetch(
      `${baseUrl}/v1/admin/reports/operations-performance?locationSlug=daysi-flagship&fromDate=2026-03-08&toDate=2026-03-15`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const reportPayload = (await reportResponse.json()) as {
      data: {
        conversion: {
          searchCount: number;
          waitlistCount: number;
          bookingCreatedCount: number;
          paidBookingCount: number;
          paidServiceRevenueAmount: { amountCents: number };
        };
        services: Array<{
          serviceSlug: string;
          searchCount: number;
          waitlistCount: number;
          bookingCreatedCount: number;
          paidBookingCount: number;
        }>;
        machines: Array<{
          machineSlug: string;
          bookingCount: number;
          paidServiceRevenueAmount: { amountCents: number };
        }>;
      };
    };

    expect(reportResponse.status).toBe(200);
    expect(reportPayload.data.conversion.searchCount).toBe(2);
    expect(reportPayload.data.conversion.waitlistCount).toBe(1);
    expect(reportPayload.data.conversion.bookingCreatedCount).toBe(1);
    expect(reportPayload.data.conversion.paidBookingCount).toBe(1);
    expect(reportPayload.data.conversion.paidServiceRevenueAmount.amountCents).toBe(29900);
    expect(
      reportPayload.data.services.find((service) => service.serviceSlug === "laser-hair-removal")
        ?.searchCount,
    ).toBe(2);
    expect(
      reportPayload.data.services.find((service) => service.serviceSlug === "laser-hair-removal")
        ?.waitlistCount,
    ).toBe(1);
    expect(
      reportPayload.data.services.find((service) => service.serviceSlug === "laser-hair-removal")
        ?.paidBookingCount,
    ).toBe(1);
    expect(
      reportPayload.data.machines.find((machine) => machine.machineSlug === "gentlemax-pro-a")
        ?.bookingCount,
    ).toBe(1);
    expect(
      reportPayload.data.machines.find((machine) => machine.machineSlug === "gentlemax-pro-a")
        ?.paidServiceRevenueAmount.amountCents,
    ).toBe(29900);
  });

  it("reports room performance for paid room-backed services", async () => {
    const customerToken = await createBootstrapSession({
      email: "room.report.customer@example.com",
      displayName: "Room Report Customer",
      requestedRole: "customer",
      providerUserId: "customer-room-report-1",
    });
    const adminToken = await createBootstrapSession({
      email: "room.reporting@daysi.ca",
      displayName: "Room Reporting",
      requestedRole: "admin",
      providerUserId: "admin-room-report-1",
      locationScopes: ["daysi-flagship"],
    });

    const availabilityResponse = await fetch(`${baseUrl}/v1/public/availability/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "skin-rejuvenation",
        fromDate: "2026-03-09",
        toDate: "2026-03-09",
        pricingMode: "retail",
      }),
    });
    const availabilityPayload = (await availabilityResponse.json()) as {
      data: {
        slots: Array<{ slotId: string; roomSlug?: string }>;
      };
    };

    expect(availabilityResponse.status).toBe(200);
    expect(availabilityPayload.data.slots.length).toBeGreaterThan(0);
    expect(availabilityPayload.data.slots[0]?.roomSlug).toBe("treatment-suite-a");

    const bookingResponse = await fetch(`${baseUrl}/v1/public/bookings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
        "idempotency-key": "room-report-booking",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "skin-rejuvenation",
        serviceVariantSlug: "skin-rejuvenation-photofacial-45",
        slotId: availabilityPayload.data.slots[0]?.slotId,
        pricingMode: "retail",
        customer: {
          firstName: "Room",
          lastName: "Report",
          email: "room.report.customer@example.com",
        },
      }),
    });
    const bookingPayload = (await bookingResponse.json()) as {
      data: {
        booking: { id: string; roomSlug?: string };
        managementToken: string;
      };
    };

    expect(bookingResponse.status).toBe(201);
    expect(bookingPayload.data.booking.roomSlug).toBe("treatment-suite-a");

    const checkoutResponse = await fetch(`${baseUrl}/v1/checkout/confirm`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
        "idempotency-key": "room-report-checkout",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        items: [
          {
            kind: "booking",
            bookingId: bookingPayload.data.booking.id,
            managementToken: bookingPayload.data.managementToken,
          },
        ],
        customer: {
          firstName: "Room",
          lastName: "Report",
          email: "room.report.customer@example.com",
        },
        paymentMethod: "stripe",
      }),
    });
    const checkoutPayload = (await checkoutResponse.json()) as {
      data: {
        order: { id: string };
        paymentSession: { paymentIntentId: string };
      };
    };

    expect(checkoutResponse.status).toBe(201);

    const webhookResponse = await postStripeWebhook({
      eventId: "evt_room_report_paid",
      paymentIntentId: checkoutPayload.data.paymentSession.paymentIntentId,
      orderId: checkoutPayload.data.order.id,
      timestamp: "1741364090",
    });

    expect(webhookResponse.status).toBe(200);

    const reportResponse = await fetch(
      `${baseUrl}/v1/admin/reports/operations-performance?locationSlug=daysi-flagship&fromDate=2026-03-08&toDate=2026-03-15`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const reportPayload = (await reportResponse.json()) as {
      data: {
        rooms: Array<{
          roomSlug: string;
          bookingCount: number;
          bookedMinutes: number;
          paidServiceRevenueAmount: { amountCents: number };
        }>;
      };
    };

    expect(reportResponse.status).toBe(200);
    expect(
      reportPayload.data.rooms.find((room) => room.roomSlug === "treatment-suite-a")?.bookingCount,
    ).toBe(1);
    expect(
      reportPayload.data.rooms.find((room) => room.roomSlug === "treatment-suite-a")?.bookedMinutes,
    ).toBe(45);
    expect(
      reportPayload.data.rooms.find((room) => room.roomSlug === "treatment-suite-a")
        ?.paidServiceRevenueAmount.amountCents,
    ).toBe(23900);
  });

  it("ingests signed skin analyzer webhooks behind the feature flag and exposes archived admin retrieval", async () => {
    const adminToken = await createBootstrapSession({
      email: "skin.admin@daysi.ca",
      displayName: "Skin Admin",
      requestedRole: "admin",
      providerUserId: "admin-skin-1",
      locationScopes: ["daysi-flagship"],
    });

    const webhookPayload = {
      eventId: "evt_skin_assessment_1",
      eventType: "assessment.completed",
      sourceApp: "skin-analyzer",
      sourceVersion: "1.0.0",
      occurredAt: "2026-03-08T16:00:00.000Z",
      locationSlug: "daysi-flagship",
      customer: {
        email: "analysis.customer@example.com",
        firstName: "Analysis",
        lastName: "Customer",
        externalId: "skin_customer_1",
      },
      assessment: {
        id: "assessment_skin_1",
        completedAt: "2026-03-08T15:59:00.000Z",
        analyzerVersion: "2.4.1",
        summary: "Pigmentation and texture issues detected with strong photofacial fit.",
        skinType: "Combination",
        fitzpatrickType: "III",
        confidenceScore: 88,
        concerns: [
          {
            key: "pigmentation",
            label: "Pigmentation",
            severity: "high",
          },
          {
            key: "texture",
            label: "Texture",
            severity: "moderate",
          },
        ],
        treatmentGoals: ["brightening", "tone correction"],
        contraindications: ["recent peel"],
        recommendedServiceSlugs: ["skin-rejuvenation", "external-mystery-service"],
        images: [
          {
            kind: "analysis",
            assetUrl: "https://assets.daysi.ca/analysis/assessment-skin-1.png",
          },
        ],
        signals: {
          hydrationScore: 74,
          sensitivityFlag: true,
        },
      },
    };

    const disabledResponse = await postSkinAnalyzerWebhook({
      timestamp: "1741459200",
      payload: webhookPayload,
    });

    expect(disabledResponse.status).toBe(403);

    const enableFeatureResponse = await fetch(
      `${baseUrl}/v1/admin/location-feature-flags/skinAnalysis`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          locationSlug: "daysi-flagship",
          enabled: true,
        }),
      },
    );

    expect(enableFeatureResponse.status).toBe(200);

    const webhookResponse = await postSkinAnalyzerWebhook({
      timestamp: "1741459260",
      payload: webhookPayload,
    });
    const webhookResponsePayload = (await webhookResponse.json()) as {
      data: {
        duplicate: boolean;
        intakeId: string;
        assessmentId: string;
      };
    };

    expect(webhookResponse.status).toBe(201);
    expect(webhookResponsePayload.data.duplicate).toBe(false);

    const duplicateResponse = await postSkinAnalyzerWebhook({
      timestamp: "1741459261",
      payload: webhookPayload,
    });
    const duplicatePayload = (await duplicateResponse.json()) as {
      data: {
        duplicate: boolean;
        intakeId: string;
        assessmentId: string;
      };
    };

    expect(duplicateResponse.status).toBe(200);
    expect(duplicatePayload.data.duplicate).toBe(true);
    expect(duplicatePayload.data.assessmentId).toBe(webhookResponsePayload.data.assessmentId);

    const listResponse = await fetch(
      `${baseUrl}/v1/admin/skin-assessments?locationSlug=daysi-flagship&customerEmail=analysis.customer@example.com`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const listPayload = (await listResponse.json()) as {
      data: {
        assessments: Array<{
          id: string;
          customerEmail: string;
          recommendedServiceSlugs: string[];
          unresolvedRecommendedServiceSlugs: string[];
          dominantConcernKeys: string[];
        }>;
      };
    };

    expect(listResponse.status).toBe(200);
    expect(listPayload.data.assessments).toHaveLength(1);
    expect(listPayload.data.assessments[0]?.customerEmail).toBe(
      "analysis.customer@example.com",
    );
    expect(listPayload.data.assessments[0]?.recommendedServiceSlugs).toContain(
      "skin-rejuvenation",
    );
    expect(listPayload.data.assessments[0]?.unresolvedRecommendedServiceSlugs).toContain(
      "external-mystery-service",
    );
    expect(listPayload.data.assessments[0]?.dominantConcernKeys[0]).toBe("pigmentation");

    const detailResponse = await fetch(
      `${baseUrl}/v1/admin/skin-assessments/${webhookResponsePayload.data.assessmentId}`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const detailPayload = (await detailResponse.json()) as {
      data: {
        intake: {
          signatureVerified: boolean;
          externalAssessmentId: string;
        };
        assessment: {
          customerExternalId?: string;
          imageCount: number;
        };
      };
    };

    expect(detailResponse.status).toBe(200);
    expect(detailPayload.data.intake.signatureVerified).toBe(true);
    expect(detailPayload.data.intake.externalAssessmentId).toBe("assessment_skin_1");
    expect(detailPayload.data.assessment.customerExternalId).toBe("skin_customer_1");
    expect(detailPayload.data.assessment.imageCount).toBe(1);

    const contextResponse = await fetch(
      `${baseUrl}/v1/admin/customers/context?locationSlug=daysi-flagship&customerEmail=analysis.customer@example.com`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const contextPayload = (await contextResponse.json()) as {
      data: {
        context: {
          recentEvents: Array<{
            source: string;
            eventType: string;
          }>;
        };
      };
    };

    expect(contextResponse.status).toBe(200);
    expect(
      contextPayload.data.context.recentEvents.some(
        (event) =>
          event.source === "skinAnalysis" &&
          event.eventType === "skin_assessment.completed",
      ),
    ).toBe(true);
  });

  it("uses assessment history in customer context, reporting, and AI follow-up recommendations", async () => {
    const adminToken = await createBootstrapSession({
      email: "skin.intel.admin@daysi.ca",
      displayName: "Skin Intel Admin",
      requestedRole: "admin",
      providerUserId: "admin-skin-intel-1",
      locationScopes: ["daysi-flagship"],
    });
    const customerToken = await createBootstrapSession({
      email: "assessment.followup@example.com",
      displayName: "Assessment Followup",
      requestedRole: "customer",
      providerUserId: "customer-skin-intel-1",
    });

    const enableFeatureResponse = await fetch(
      `${baseUrl}/v1/admin/location-feature-flags/skinAnalysis`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          locationSlug: "daysi-flagship",
          enabled: true,
        }),
      },
    );

    expect(enableFeatureResponse.status).toBe(200);

    const firstWebhookResponse = await postSkinAnalyzerWebhook({
      timestamp: "1741460100",
      payload: {
        eventId: "evt_skin_followup_1",
        eventType: "assessment.completed",
        sourceApp: "skin-analyzer",
        sourceVersion: "1.0.0",
        occurredAt: "2026-03-08T16:20:00.000Z",
        locationSlug: "daysi-flagship",
        customer: {
          email: "assessment.followup@example.com",
          firstName: "Assessment",
          lastName: "Followup",
        },
        assessment: {
          id: "assessment_followup_1",
          completedAt: "2026-03-08T16:19:00.000Z",
          analyzerVersion: "2.4.1",
          summary: "Pigmentation and texture concerns with photofacial fit.",
          confidenceScore: 89,
          concerns: [
            {
              key: "pigmentation",
              label: "Pigmentation",
              severity: "high",
            },
            {
              key: "texture",
              label: "Texture",
              severity: "moderate",
            },
          ],
          treatmentGoals: ["tone correction"],
          contraindications: ["recent peel"],
          recommendedServiceSlugs: ["skin-rejuvenation"],
          images: [],
          signals: {
            hydrationScore: 78,
          },
        },
      },
    });
    const firstWebhookPayload = (await firstWebhookResponse.json()) as {
      data: {
        assessmentId: string;
      };
    };

    expect(firstWebhookResponse.status).toBe(201);

    const secondWebhookResponse = await postSkinAnalyzerWebhook({
      timestamp: "1741460160",
      payload: {
        eventId: "evt_skin_followup_2",
        eventType: "assessment.completed",
        sourceApp: "skin-analyzer",
        sourceVersion: "1.0.0",
        occurredAt: "2026-03-09T16:20:00.000Z",
        locationSlug: "daysi-flagship",
        customer: {
          email: "assessment.followup@example.com",
          firstName: "Assessment",
          lastName: "Followup",
        },
        assessment: {
          id: "assessment_followup_2",
          completedAt: "2026-03-09T16:19:00.000Z",
          analyzerVersion: "2.4.1",
          summary: "Follow-up scan still favors skin rejuvenation for pigmentation.",
          confidenceScore: 75,
          concerns: [
            {
              key: "pigmentation",
              label: "Pigmentation",
              severity: 72,
            },
          ],
          treatmentGoals: ["brightening"],
          contraindications: [],
          recommendedServiceSlugs: ["skin-rejuvenation", "external-followup-service"],
          images: [
            {
              kind: "analysis",
              assetUrl: "https://assets.daysi.ca/analysis/followup-2.png",
            },
          ],
          signals: {
            sensitivityFlag: false,
          },
        },
      },
    });

    expect(secondWebhookResponse.status).toBe(201);

    const availabilityResponse = await fetch(`${baseUrl}/v1/public/availability/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        serviceSlug: "skin-rejuvenation",
        fromDate: "2026-03-09",
        toDate: "2026-03-09",
        pricingMode: "retail",
      }),
    });
    const availabilityPayload = (await availabilityResponse.json()) as {
      data: {
        slots: Array<{ slotId: string }>;
      };
    };

    expect(availabilityResponse.status).toBe(200);
    expect(availabilityPayload.data.slots.length).toBeGreaterThan(0);

    const attributedBookingResponse = await fetch(`${baseUrl}/v1/public/bookings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
        "idempotency-key": "skin-attribution-booking",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        assessmentId: firstWebhookPayload.data.assessmentId,
        serviceSlug: "skin-rejuvenation",
        serviceVariantSlug: "skin-rejuvenation-photofacial-45",
        slotId: availabilityPayload.data.slots[0]?.slotId,
        pricingMode: "retail",
        customer: {
          firstName: "Assessment",
          lastName: "Followup",
          email: "assessment.followup@example.com",
        },
      }),
    });
    const attributedBookingPayload = (await attributedBookingResponse.json()) as {
      data: {
        booking: {
          id: string;
          sourceAssessmentId?: string;
        };
        managementToken: string;
      };
    };

    expect(attributedBookingResponse.status).toBe(201);
    expect(attributedBookingPayload.data.booking.sourceAssessmentId).toBe(
      firstWebhookPayload.data.assessmentId,
    );

    const attributedCheckoutResponse = await fetch(`${baseUrl}/v1/checkout/confirm`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
        "idempotency-key": "skin-attribution-checkout",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        items: [
          {
            kind: "booking",
            bookingId: attributedBookingPayload.data.booking.id,
            managementToken: attributedBookingPayload.data.managementToken,
          },
        ],
        customer: {
          firstName: "Assessment",
          lastName: "Followup",
          email: "assessment.followup@example.com",
        },
        paymentMethod: "stripe",
      }),
    });
    const attributedCheckoutPayload = (await attributedCheckoutResponse.json()) as {
      data: {
        order: { id: string };
        paymentSession: { paymentIntentId: string };
      };
    };

    expect(attributedCheckoutResponse.status).toBe(201);

    const attributedWebhookResponse = await postStripeWebhook({
      eventId: "evt_skin_attr_paid_1",
      paymentIntentId: attributedCheckoutPayload.data.paymentSession.paymentIntentId,
      orderId: attributedCheckoutPayload.data.order.id,
      timestamp: "1741460220",
    });

    expect(attributedWebhookResponse.status).toBe(200);

    const contextResponse = await fetch(
      `${baseUrl}/v1/admin/customers/context?locationSlug=daysi-flagship&customerEmail=assessment.followup@example.com`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const contextPayload = (await contextResponse.json()) as {
      data: {
        context: {
          latestSkinAssessments: Array<{
            assessmentId: string;
            recommendedServiceSlugs: string[];
          }>;
          summary: {
            skinAssessmentCount: number;
            latestSkinAssessmentAt?: string;
          };
        };
      };
    };

    expect(contextResponse.status).toBe(200);
    expect(contextPayload.data.context.summary.skinAssessmentCount).toBe(2);
    expect(contextPayload.data.context.latestSkinAssessments).toHaveLength(2);
    expect(contextPayload.data.context.latestSkinAssessments[0]?.recommendedServiceSlugs).toContain(
      "skin-rejuvenation",
    );
    expect(contextPayload.data.context.summary.latestSkinAssessmentAt).toBe(
      "2026-03-09T16:19:00.000Z",
    );

    const followUpResponse = await fetch(
      `${baseUrl}/v1/ai/booking-assistant/assessment-follow-up`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          locationSlug: "daysi-flagship",
          assessmentId: firstWebhookPayload.data.assessmentId,
          prefersMembership: true,
        }),
      },
    );
    const followUpPayload = (await followUpResponse.json()) as {
      data: {
        run: {
          task: string;
          sourceProvenance: Array<{ kind: string }>;
        };
        assessment: {
          recommendedServiceSlugs: string[];
        };
        recommendations: Array<{ serviceSlug: string }>;
        membershipSuggestion?: { planSlug: string };
        followUpPlan: { recommendedAction: string };
      };
    };

    expect(followUpResponse.status).toBe(200);
    expect(followUpPayload.data.run.task).toBe("assistant.assessment_follow_up");
    expect(
      followUpPayload.data.run.sourceProvenance.some(
        (source) => source.kind === "internal_skin_assessment",
      ),
    ).toBe(true);
    expect(followUpPayload.data.assessment.recommendedServiceSlugs).toContain(
      "skin-rejuvenation",
    );
    expect(followUpPayload.data.recommendations[0]?.serviceSlug).toBe("skin-rejuvenation");
    expect(followUpPayload.data.membershipSuggestion?.planSlug).toBe("glow-membership");
    expect(followUpPayload.data.followUpPlan.recommendedAction).toContain("Review availability");

    const reportResponse = await fetch(
      `${baseUrl}/v1/admin/reports/skin-analysis-performance?locationSlug=daysi-flagship&fromDate=2026-03-08&toDate=2026-03-10`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const reportPayload = (await reportResponse.json()) as {
      data: {
        assessmentCount: number;
        uniqueCustomerCount: number;
        withImagesCount: number;
        averageConfidenceScore: number | null;
        attributedBookingCount: number;
        attributedPaidBookingCount: number;
        attributedPaidRevenueAmount: { amountCents: number };
        assessmentToBookingRate: number;
        concerns: Array<{ concernKey: string; assessmentCount: number }>;
        recommendedServices: Array<{ serviceSlug: string; recommendationCount: number }>;
        unresolvedRecommendations: Array<{ serviceSlug: string; recommendationCount: number }>;
      };
    };

    expect(reportResponse.status).toBe(200);
    expect(reportPayload.data.assessmentCount).toBe(2);
    expect(reportPayload.data.uniqueCustomerCount).toBe(1);
    expect(reportPayload.data.withImagesCount).toBe(1);
    expect(reportPayload.data.averageConfidenceScore).toBe(82);
    expect(reportPayload.data.attributedBookingCount).toBe(1);
    expect(reportPayload.data.attributedPaidBookingCount).toBe(1);
    expect(reportPayload.data.attributedPaidRevenueAmount.amountCents).toBe(23900);
    expect(reportPayload.data.assessmentToBookingRate).toBe(50);
    expect(reportPayload.data.concerns[0]?.concernKey).toBe("pigmentation");
    expect(reportPayload.data.recommendedServices[0]?.serviceSlug).toBe("skin-rejuvenation");
    expect(reportPayload.data.recommendedServices[0]?.recommendationCount).toBe(2);
    expect(reportPayload.data.unresolvedRecommendations[0]?.serviceSlug).toBe(
      "external-followup-service",
    );
  });

  it("persists treatment plans, converts them into bookings, and reports funnel performance", async () => {
    const adminToken = await createBootstrapSession({
      email: "treatment.plan.admin@daysi.ca",
      displayName: "Treatment Plan Admin",
      requestedRole: "admin",
      providerUserId: "admin-treatment-plan-1",
      locationScopes: ["daysi-flagship"],
    });
    const customerToken = await createBootstrapSession({
      email: "treatment.plan.customer@example.com",
      displayName: "Treatment Plan Customer",
      requestedRole: "customer",
      providerUserId: "customer-treatment-plan-1",
    });

    const enableFeatureResponse = await fetch(
      `${baseUrl}/v1/admin/location-feature-flags/skinAnalysis`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          locationSlug: "daysi-flagship",
          enabled: true,
        }),
      },
    );

    expect(enableFeatureResponse.status).toBe(200);

    const webhookResponse = await postSkinAnalyzerWebhook({
      timestamp: "1741461000",
      payload: {
        eventId: "evt_treatment_plan_1",
        eventType: "assessment.completed",
        sourceApp: "skin-analyzer",
        sourceVersion: "1.0.0",
        occurredAt: "2026-03-10T10:00:00.000Z",
        locationSlug: "daysi-flagship",
        customer: {
          email: "treatment.plan.customer@example.com",
          firstName: "Treatment",
          lastName: "Plan",
        },
        assessment: {
          id: "assessment_treatment_plan_1",
          completedAt: "2026-03-10T09:59:00.000Z",
          analyzerVersion: "2.4.1",
          summary: "Photofacial fit with pigmentation concerns.",
          confidenceScore: 86,
          concerns: [
            {
              key: "pigmentation",
              label: "Pigmentation",
              severity: "high",
            },
          ],
          treatmentGoals: ["tone correction"],
          contraindications: [],
          recommendedServiceSlugs: ["skin-rejuvenation"],
          images: [],
          signals: {},
        },
      },
    });
    const webhookPayload = (await webhookResponse.json()) as {
      data: {
        assessmentId: string;
      };
    };

    expect(webhookResponse.status).toBe(201);

    const createPlanResponse = await fetch(`${baseUrl}/v1/admin/treatment-plans`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        assessmentId: webhookPayload.data.assessmentId,
        prefersMembership: true,
        internalNotes: "High-intent corrective follow-up candidate.",
      }),
    });
    const createPlanPayload = (await createPlanResponse.json()) as {
      data: {
        treatmentPlan: {
          id: string;
          status: string;
          createdAt: string;
          sourceAssessmentId: string;
          sourceAiRunId: string;
          lines: Array<{ serviceSlug: string }>;
          membershipSuggestion?: { planSlug: string };
        };
      };
    };

    expect(createPlanResponse.status).toBe(201);
    expect(createPlanPayload.data.treatmentPlan.status).toBe("draft");
    expect(createPlanPayload.data.treatmentPlan.sourceAssessmentId).toBe(
      webhookPayload.data.assessmentId,
    );
    expect(createPlanPayload.data.treatmentPlan.sourceAiRunId).toMatch(/^airun_/);
    expect(createPlanPayload.data.treatmentPlan.lines[0]?.serviceSlug).toBe(
      "skin-rejuvenation",
    );
    expect(createPlanPayload.data.treatmentPlan.membershipSuggestion?.planSlug).toBe(
      "glow-membership",
    );
    const treatmentPlanReportDate =
      createPlanPayload.data.treatmentPlan.createdAt.slice(0, 10);

    const sharePlanResponse = await fetch(
      `${baseUrl}/v1/admin/treatment-plans/${createPlanPayload.data.treatmentPlan.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: "shared",
        }),
      },
    );
    const sharePlanPayload = (await sharePlanResponse.json()) as {
      data: {
        treatmentPlan: {
          status: string;
          sharedAt?: string;
        };
      };
    };

    expect(sharePlanResponse.status).toBe(200);
    expect(sharePlanPayload.data.treatmentPlan.status).toBe("shared");
    expect(sharePlanPayload.data.treatmentPlan.sharedAt).toBeTruthy();

    const myPlansResponse = await fetch(`${baseUrl}/v1/me/treatment-plans`, {
      headers: {
        authorization: `Bearer ${customerToken}`,
      },
    });
    const myPlansPayload = (await myPlansResponse.json()) as {
      data: {
        treatmentPlans: Array<{
          id: string;
          status: string;
        }>;
      };
    };

    expect(myPlansResponse.status).toBe(200);
    expect(myPlansPayload.data.treatmentPlans).toHaveLength(1);
    expect(myPlansPayload.data.treatmentPlans[0]?.status).toBe("shared");

    const acceptPlanResponse = await fetch(
      `${baseUrl}/v1/me/treatment-plans/${createPlanPayload.data.treatmentPlan.id}/accept`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
      },
    );
    const acceptPlanPayload = (await acceptPlanResponse.json()) as {
      data: {
        treatmentPlan: {
          status: string;
          acceptedAt?: string;
        };
      };
    };

    expect(acceptPlanResponse.status).toBe(200);
    expect(acceptPlanPayload.data.treatmentPlan.status).toBe("accepted");
    expect(acceptPlanPayload.data.treatmentPlan.acceptedAt).toBeTruthy();

    const availabilityResponse = await fetch(`${baseUrl}/v1/public/availability/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        treatmentPlanId: createPlanPayload.data.treatmentPlan.id,
        serviceSlug: "skin-rejuvenation",
        fromDate: "2026-03-10",
        toDate: "2026-03-10",
        pricingMode: "retail",
      }),
    });
    const availabilityPayload = (await availabilityResponse.json()) as {
      data: {
        slots: Array<{ slotId: string }>;
      };
    };

    expect(availabilityResponse.status).toBe(200);
    expect(availabilityPayload.data.slots.length).toBeGreaterThan(0);

    const bookingResponse = await fetch(`${baseUrl}/v1/public/bookings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
        "idempotency-key": "treatment-plan-booking-1",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        treatmentPlanId: createPlanPayload.data.treatmentPlan.id,
        serviceSlug: "skin-rejuvenation",
        serviceVariantSlug: "skin-rejuvenation-photofacial-45",
        slotId: availabilityPayload.data.slots[0]?.slotId,
        pricingMode: "retail",
        customer: {
          firstName: "Treatment",
          lastName: "Plan",
          email: "treatment.plan.customer@example.com",
        },
      }),
    });
    const bookingPayload = (await bookingResponse.json()) as {
      data: {
        booking: {
          id: string;
          sourceAssessmentId?: string;
          sourceTreatmentPlanId?: string;
        };
        managementToken: string;
      };
    };

    expect(bookingResponse.status).toBe(201);
    expect(bookingPayload.data.booking.sourceTreatmentPlanId).toBe(
      createPlanPayload.data.treatmentPlan.id,
    );
    expect(bookingPayload.data.booking.sourceAssessmentId).toBe(
      webhookPayload.data.assessmentId,
    );

    const checkoutResponse = await fetch(`${baseUrl}/v1/checkout/confirm`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${customerToken}`,
        "idempotency-key": "treatment-plan-checkout-1",
      },
      body: JSON.stringify({
        locationSlug: "daysi-flagship",
        items: [
          {
            kind: "booking",
            bookingId: bookingPayload.data.booking.id,
            managementToken: bookingPayload.data.managementToken,
          },
        ],
        customer: {
          firstName: "Treatment",
          lastName: "Plan",
          email: "treatment.plan.customer@example.com",
        },
        paymentMethod: "stripe",
      }),
    });
    const checkoutPayload = (await checkoutResponse.json()) as {
      data: {
        order: { id: string };
        paymentSession: { paymentIntentId: string };
      };
    };

    expect(checkoutResponse.status).toBe(201);

    const webhookPaidResponse = await postStripeWebhook({
      eventId: "evt_treatment_plan_paid_1",
      paymentIntentId: checkoutPayload.data.paymentSession.paymentIntentId,
      orderId: checkoutPayload.data.order.id,
      timestamp: "1741461300",
    });

    expect(webhookPaidResponse.status).toBe(200);

    const getPlanResponse = await fetch(
      `${baseUrl}/v1/admin/treatment-plans/${createPlanPayload.data.treatmentPlan.id}`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const getPlanPayload = (await getPlanResponse.json()) as {
      data: {
        treatmentPlan: {
          status: string;
          lines: Array<{ serviceSlug: string }>;
        };
      };
    };

    expect(getPlanResponse.status).toBe(200);
    expect(getPlanPayload.data.treatmentPlan.status).toBe("accepted");
    expect(getPlanPayload.data.treatmentPlan.lines[0]?.serviceSlug).toBe(
      "skin-rejuvenation",
    );

    const reportResponse = await fetch(
      `${baseUrl}/v1/admin/reports/treatment-plan-performance?locationSlug=daysi-flagship&fromDate=${treatmentPlanReportDate}&toDate=${treatmentPlanReportDate}`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const reportPayload = (await reportResponse.json()) as {
      data: {
        funnel: {
          createdCount: number;
          sharedCount: number;
          acceptedCount: number;
          bookedCount: number;
          paidCount: number;
          paidRevenueAmount: { amountCents: number };
        };
        services: Array<{
          serviceSlug: string;
          bookedCount: number;
          paidCount: number;
          paidRevenueAmount: { amountCents: number };
        }>;
      };
    };

    expect(reportResponse.status).toBe(200);
    expect(reportPayload.data.funnel.createdCount).toBe(1);
    expect(reportPayload.data.funnel.sharedCount).toBe(1);
    expect(reportPayload.data.funnel.acceptedCount).toBe(1);
    expect(reportPayload.data.funnel.bookedCount).toBe(1);
    expect(reportPayload.data.funnel.paidCount).toBe(1);
    expect(reportPayload.data.funnel.paidRevenueAmount.amountCents).toBe(23900);
    expect(reportPayload.data.services[0]?.serviceSlug).toBe("skin-rejuvenation");
    expect(reportPayload.data.services[0]?.bookedCount).toBe(1);
    expect(reportPayload.data.services[0]?.paidCount).toBe(1);
    expect(reportPayload.data.services[0]?.paidRevenueAmount.amountCents).toBe(23900);

    const contextResponse = await fetch(
      `${baseUrl}/v1/admin/customers/context?locationSlug=daysi-flagship&customerEmail=treatment.plan.customer@example.com`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    const contextPayload = (await contextResponse.json()) as {
      data: {
        context: {
          recentEvents: Array<{
            eventType: string;
          }>;
        };
      };
    };

    expect(contextResponse.status).toBe(200);
    expect(
      contextPayload.data.context.recentEvents.some(
        (event) => event.eventType === "treatment_plan.accepted",
      ),
    ).toBe(true);
  });
});
