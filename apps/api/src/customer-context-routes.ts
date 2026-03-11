import type { IncomingMessage, ServerResponse } from "node:http";

import {
  customerDirectoryResponseSchema,
  adminCustomerNoteCreateRequestSchema,
  adminCustomerNoteResponseSchema,
  adminCustomerNoteUpdateRequestSchema,
  adminCustomerTagCreateRequestSchema,
  adminCustomerTagResponseSchema,
  customerContextResponseSchema,
  adminCustomerUpdateRequestSchema,
  adminCustomerResponseSchema,
} from "../../../packages/contracts/src";
import {
  buildCustomerDirectoryView,
  buildCustomerContextView,
  canManageLocation,
  createCustomerNote,
  createCustomerTag,
  filterCustomerBookings,
  filterCustomerCreditEntries,
  filterCustomerEvents,
  filterCustomerLearningEntitlements,
  filterCustomerNotes,
  filterCustomerOrders,
  filterCustomerSkinAssessments,
  filterCustomerSubscriptions,
  filterCustomerTags,
  updateCustomerNote as applyCustomerNoteUpdate,
  type AppActor,
} from "../../../packages/domain/src";

import { recordAdminAction } from "./admin-audit";
import { getRuntimeTenantContext } from "./clinic-runtime";
import type { AppEnv } from "./config";
import { readJsonBody, sendError, sendJson } from "./http";
import type { AppRepositories } from "./persistence/app-repositories";
import {
  listAllLearningEntitlements,
} from "./bootstrap-store";

const requireAdminActor = (actor: AppActor | null): actor is AppActor =>
  !!actor && actor.roles.some((role) => ["admin", "owner"].includes(role));

const buildUrl = (request: IncomingMessage, env: AppEnv): URL =>
  new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? `${env.DAYSI_API_HOST}:${env.DAYSI_API_PORT}`}`,
  );

const ensureScopedAdminAccess = (
  actor: AppActor | null,
  locationSlug: string,
): boolean => !!actor && canManageLocation(actor, "admin.customer.manage", locationSlug);

const matchCustomerNotePath = (pathname: string): { noteId: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 5 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "customers" &&
    segments[3] === "notes"
  ) {
    return {
      noteId: segments[4],
    };
  }

  return null;
};

const matchCustomerTagPath = (pathname: string): { tagId: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 5 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "customers" &&
    segments[3] === "tags"
  ) {
    return {
      tagId: segments[4],
    };
  }

  return null;
};

export const handleCustomerContextRoutes = async (input: {
  method: string;
  pathname: string;
  request: IncomingMessage;
  response: ServerResponse;
  env: AppEnv;
  actor: AppActor | null;
  repositories: AppRepositories;
}): Promise<boolean> => {
  const tenant = getRuntimeTenantContext(input.env);
  const url = buildUrl(input.request, input.env);

  if (input.method === "GET" && input.pathname === "/v1/admin/customers") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const locationSlug =
      url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    if (!tenant.locations.some((location) => location.slug === locationSlug)) {
      sendError(input.response, 404, "not_found", "Location not found.");
      return true;
    }
    if (!ensureScopedAdminAccess(input.actor, locationSlug)) {
      sendError(input.response, 403, "forbidden", "Customer list access is restricted.");
      return true;
    }

    const search = url.searchParams.get("search")?.trim().toLowerCase() ?? "";
    const page = Math.max(0, Number.parseInt(url.searchParams.get("page") ?? "0", 10) || 0);
    const pageSize = Math.min(
      100,
      Math.max(1, Number.parseInt(url.searchParams.get("pageSize") ?? "50", 10) || 50),
    );

    const directory = buildCustomerDirectoryView({
      locationSlug,
      notes: await input.repositories.engagement.customerNotes.listAll(),
      tags: await input.repositories.engagement.customerTags.listAll(),
      events: await input.repositories.engagement.customerEvents.listAll(),
      bookings: await input.repositories.commerce.bookings.listAll(),
      orders: await input.repositories.commerce.orders.listAll(),
      subscriptions: await input.repositories.commerce.memberships.listAllSubscriptions(),
      entitlements: listAllLearningEntitlements(),
      creditEntries: await input.repositories.commerce.credits.listAll(),
      skinAssessments: await input.repositories.clinicalIntelligence.skinAssessments.list(
        locationSlug,
      ),
    });

    const filteredCustomers = directory.customers.filter((customer) => {
      if (!search) {
        return true;
      }

      const haystack = [
        customer.customerEmail,
        customer.customerName ?? "",
        ...customer.tags.map((tag) => tag.label),
        ...customer.segments.map((segment) => segment.label),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });

    const startIndex = page * pageSize;
    const customers = filteredCustomers.slice(startIndex, startIndex + pageSize);

    sendJson(
      input.response,
      200,
      customerDirectoryResponseSchema.parse({
        ok: true,
        data: {
          locationSlug,
          search,
          page,
          pageSize,
          totalCount: filteredCustomers.length,
          stats: directory.stats,
          customers,
        },
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/customers/context") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const locationSlug = url.searchParams.get("locationSlug");
    const customerEmail = url.searchParams.get("customerEmail");
    if (!locationSlug || !customerEmail) {
      sendError(
        input.response,
        400,
        "bad_request",
        "locationSlug and customerEmail are required.",
      );
      return true;
    }
    if (!tenant.locations.some((location) => location.slug === locationSlug)) {
      sendError(input.response, 404, "not_found", "Location not found.");
      return true;
    }
    if (!ensureScopedAdminAccess(input.actor, locationSlug)) {
      sendError(input.response, 403, "forbidden", "Customer context access is restricted.");
      return true;
    }

    const context = buildCustomerContextView({
      locationSlug,
      customerEmail,
      notes: filterCustomerNotes({
        notes: await input.repositories.engagement.customerNotes.listAll(),
        locationSlug,
        customerEmail,
      }),
      tags: filterCustomerTags({
        tags: await input.repositories.engagement.customerTags.listAll(),
        locationSlug,
        customerEmail,
      }),
      events: filterCustomerEvents({
        events: await input.repositories.engagement.customerEvents.listAll(),
        locationSlug,
        customerEmail,
      }),
      bookings: filterCustomerBookings({
        bookings: await input.repositories.commerce.bookings.listAll(),
        locationSlug,
        customerEmail,
      }),
      orders: filterCustomerOrders({
        orders: await input.repositories.commerce.orders.listAll(),
        locationSlug,
        customerEmail,
      }),
      subscriptions: filterCustomerSubscriptions({
        subscriptions: await input.repositories.commerce.memberships.listAllSubscriptions(),
        locationSlug,
        customerEmail,
      }),
      entitlements: filterCustomerLearningEntitlements({
        entitlements: listAllLearningEntitlements(),
        locationSlug,
        customerEmail,
      }),
      creditEntries: filterCustomerCreditEntries({
        creditEntries: await input.repositories.commerce.credits.listAll(),
        customerEmail,
      }),
      skinAssessments: filterCustomerSkinAssessments({
        assessments: await input.repositories.clinicalIntelligence.skinAssessments.list(
          locationSlug,
        ),
        locationSlug,
        customerEmail,
      }),
    });

    sendJson(
      input.response,
      200,
      customerContextResponseSchema.parse({
        ok: true,
        data: {
          context,
        },
      }),
    );
    return true;
  }

  if (input.method === "POST" && input.pathname === "/v1/admin/customers/notes") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminCustomerNoteCreateRequestSchema.parse(body),
      );
      if (!tenant.locations.some((location) => location.slug === payload.locationSlug)) {
        sendError(input.response, 404, "not_found", "Location not found.");
        return true;
      }
      if (!ensureScopedAdminAccess(input.actor, payload.locationSlug)) {
        sendError(input.response, 403, "forbidden", "Customer note access is restricted.");
        return true;
      }

      const note = createCustomerNote({
        locationSlug: payload.locationSlug,
        customerEmail: payload.customerEmail,
        customerName: payload.customerName,
        body: payload.body,
        createdByUserId: input.actor.userId,
        createdByEmail: input.actor.email,
      });
      await input.repositories.engagement.customerNotes.save(note);

      await recordAdminAction({
        actor: input.actor,
        locationSlug: payload.locationSlug,
        action: "customer.note.created",
        entityType: "customer_note",
        entityId: note.id,
        summary: `Created customer note for ${payload.customerEmail}`,
        repositories: input.repositories,
      });

      sendJson(
        input.response,
        201,
        adminCustomerNoteResponseSchema.parse({
          ok: true,
          data: {
            note,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid customer note request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  const noteMatch = matchCustomerNotePath(input.pathname);
  if (noteMatch && input.method === "PATCH") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminCustomerNoteUpdateRequestSchema.parse(body),
      );
      const existing = await input.repositories.engagement.customerNotes.get(noteMatch.noteId);
      if (!existing) {
        sendError(input.response, 404, "not_found", "Customer note not found.");
        return true;
      }
      if (!ensureScopedAdminAccess(input.actor, existing.locationSlug)) {
        sendError(input.response, 403, "forbidden", "Customer note access is restricted.");
        return true;
      }

      const note = applyCustomerNoteUpdate({
        note: existing,
        body: payload.body,
      });
      await input.repositories.engagement.customerNotes.update(note);

      await recordAdminAction({
        actor: input.actor,
        locationSlug: note.locationSlug,
        action: "customer.note.updated",
        entityType: "customer_note",
        entityId: note.id,
        summary: `Updated customer note for ${note.customerEmail}`,
        repositories: input.repositories,
      });

      sendJson(
        input.response,
        200,
        adminCustomerNoteResponseSchema.parse({
          ok: true,
          data: {
            note,
          },
        }),
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid customer note update request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (input.method === "POST" && input.pathname === "/v1/admin/customers/tags") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminCustomerTagCreateRequestSchema.parse(body),
      );
      if (!tenant.locations.some((location) => location.slug === payload.locationSlug)) {
        sendError(input.response, 404, "not_found", "Location not found.");
        return true;
      }
      if (!ensureScopedAdminAccess(input.actor, payload.locationSlug)) {
        sendError(input.response, 403, "forbidden", "Customer tag access is restricted.");
        return true;
      }

      const existing = (await input.repositories.engagement.customerTags.listAll()).find(
        (tag) =>
          tag.locationSlug === payload.locationSlug &&
          tag.customerEmail === payload.customerEmail.toLowerCase() &&
          tag.label.toLowerCase() === payload.label.toLowerCase(),
      );
      const tag =
        existing ??
        createCustomerTag({
          locationSlug: payload.locationSlug,
          customerEmail: payload.customerEmail,
          label: payload.label,
          createdByUserId: input.actor.userId,
          createdByEmail: input.actor.email,
        });
      if (!existing) {
        await input.repositories.engagement.customerTags.save(tag);
      }

      await recordAdminAction({
        actor: input.actor,
        locationSlug: payload.locationSlug,
        action: "customer.tag.upserted",
        entityType: "customer_tag",
        entityId: tag.id,
        summary: `Applied customer tag ${tag.label} to ${payload.customerEmail}`,
        repositories: input.repositories,
      });

      sendJson(
        input.response,
        existing ? 200 : 201,
        adminCustomerTagResponseSchema.parse({
          ok: true,
          data: {
            tag,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid customer tag request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  const tagMatch = matchCustomerTagPath(input.pathname);
  if (tagMatch && input.method === "DELETE") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const existing = await input.repositories.engagement.customerTags.get(tagMatch.tagId);
    if (!existing) {
      sendError(input.response, 404, "not_found", "Customer tag not found.");
      return true;
    }
    if (!ensureScopedAdminAccess(input.actor, existing.locationSlug)) {
      sendError(input.response, 403, "forbidden", "Customer tag access is restricted.");
      return true;
    }

    await input.repositories.engagement.customerTags.delete(existing.id);
    await recordAdminAction({
      actor: input.actor,
      locationSlug: existing.locationSlug,
      action: "customer.tag.deleted",
      entityType: "customer_tag",
      entityId: existing.id,
      summary: `Deleted customer tag ${existing.label} for ${existing.customerEmail}`,
      repositories: input.repositories,
    });
    input.response.writeHead(204);
    input.response.end();
    return true;
  }

  // UPDATE CUSTOMER
  const customerMatch = input.pathname.match(/^\/v1\/admin\/customers\/([^\/]+)$/);
  if (customerMatch && input.method === "PATCH") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const customerEmail = decodeURIComponent(customerMatch[1]);
      const locationSlug = url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;

      if (!tenant.locations.some((location) => location.slug === locationSlug)) {
        sendError(input.response, 404, "not_found", "Location not found.");
        return true;
      }
      if (!ensureScopedAdminAccess(input.actor, locationSlug)) {
        sendError(input.response, 403, "forbidden", "Customer update access is restricted.");
        return true;
      }

      const body = await readJsonBody(input.request, (b) => adminCustomerUpdateRequestSchema.parse(b));

      // Get existing customer context to verify they exist
      const context = buildCustomerContextView({
        locationSlug,
        customerEmail,
        notes: filterCustomerNotes({
          notes: await input.repositories.engagement.customerNotes.listAll(),
          locationSlug,
          customerEmail,
        }),
        tags: filterCustomerTags({
          tags: await input.repositories.engagement.customerTags.listAll(),
          locationSlug,
          customerEmail,
        }),
        events: filterCustomerEvents({
          events: await input.repositories.engagement.customerEvents.listAll(),
          locationSlug,
          customerEmail,
        }),
        bookings: filterCustomerBookings({
          bookings: await input.repositories.commerce.bookings.listAll(),
          locationSlug,
          customerEmail,
        }),
        orders: filterCustomerOrders({
          orders: await input.repositories.commerce.orders.listAll(),
          locationSlug,
          customerEmail,
        }),
        subscriptions: filterCustomerSubscriptions({
          subscriptions: await input.repositories.commerce.memberships.listAllSubscriptions(),
          locationSlug,
          customerEmail,
        }),
        entitlements: [],
        creditEntries: filterCustomerCreditEntries({
          creditEntries: await input.repositories.commerce.credits.listAll(),
          locationSlug,
          customerEmail,
        }),
        skinAssessments: filterCustomerSkinAssessments({
          skinAssessments: await input.repositories.clinicalIntelligence.skinAssessments.list(locationSlug),
          locationSlug,
          customerEmail,
        }),
      });

      if (!context) {
        sendError(input.response, 404, "not_found", "Customer not found.");
        return true;
      }

      // Update customer info via event
      const updatedCustomer = {
        ...context.profile,
        firstName: body.firstName ?? context.profile.firstName,
        lastName: body.lastName ?? context.profile.lastName,
        email: body.email ?? context.profile.email,
        phone: body.phone ?? context.profile.phone,
        updatedAt: new Date().toISOString(),
      };

      // Record update as an event for audit trail
      await input.repositories.engagement.customerEvents.save({
        id: `evt_${Date.now()}`,
        type: "customer.updated",
        customerEmail,
        locationSlug,
        metadata: {
          updatedBy: input.actor.userId,
          updatedByEmail: input.actor.email,
          changes: Object.keys(body),
        },
        createdAt: new Date().toISOString(),
      });

      // Record admin action
      recordAdminAction({
        actor: input.actor,
        action: "customer.updated",
        resourceType: "customer",
        resourceId: customerEmail,
        locationSlug,
        summary: `Updated customer ${customerEmail}`,
        repositories: input.repositories,
      });

      sendJson(
        input.response,
        200,
        adminCustomerResponseSchema.parse({
          ok: true,
          data: {
            customer: updatedCustomer,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid customer update request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  return false;
};
