import type { IncomingMessage, ServerResponse } from "node:http";

import {
  adminProviderCreateRequestSchema,
  adminProviderResponseSchema,
  adminProviderUpdateRequestSchema,
  adminMachinesResponseSchema,
  adminProvidersResponseSchema,
  machineScheduleUpdateRequestSchema,
  providerBookingsResponseSchema,
  providerPayoutRunCreateRequestSchema,
  providerPayoutRunResponseSchema,
  providerPayoutRunsResponseSchema,
  providerPayoutRunUpdateRequestSchema,
  providerPayoutsResponseSchema,
  providerPerformanceReportResponseSchema,
  providerScheduleExceptionCreateRequestSchema,
  providerScheduleResponseSchema,
  providerScheduleTemplateUpdateRequestSchema,
  locationFinanceDashboardResponseSchema,
  membershipPerformanceReportResponseSchema,
  multiLocationBenchmarkReportResponseSchema,
  operationsPerformanceReportResponseSchema,
  referralPerformanceReportResponseSchema,
  revenueSummaryReportResponseSchema,
  skinAssessmentPerformanceReportResponseSchema,
  treatmentPlanPerformanceReportResponseSchema,
  utilizationReportResponseSchema,
  websiteAnalyticsReportResponseSchema,
} from "../../../packages/contracts/src";
import {
  canManageLocation,
  approveProviderPayoutRun,
  buildWebsiteAnalyticsReport,
  buildLocationFinanceDashboard,
  buildMembershipPerformanceReport,
  buildMultiLocationBenchmarkReport,
  buildOperationsPerformanceReport,
  buildProviderPerformanceReport,
  buildReferralPerformanceReport,
  buildRevenueSummaryReport,
  buildSkinAssessmentPerformanceReport,
  buildTreatmentPlanPerformanceReport,
  buildResolvedProviderSchedule,
  buildUtilizationReport,
  calculateProviderPayouts,
  createProviderPayoutRun,
  getOrganizationById,
  getOrganizationBySlug,
  markProviderPayoutRunPaid,
  resolveProviderForActor,
  type AppActor,
  type ProviderScheduleException,
  type ProviderResource,
} from "../../../packages/domain/src";

import {
  addProviderScheduleException,
  getProviderExceptions,
  getRuntimeClinicData,
  getRuntimeTenantContext,
  setMachineScheduleTemplate,
  setProviderScheduleTemplate,
  upsertProviderResource,
} from "./clinic-runtime";
import type { AppEnv } from "./config";
import { readJsonBody, sendError, sendJson } from "./http";
import type { AppRepositories } from "./persistence/app-repositories";
import {
  isCanonicalDefinitionWriteEnabled,
  persistCanonicalMachineScheduleTemplate,
  persistCanonicalProvider,
  persistCanonicalProviderExceptions,
  persistCanonicalProviderScheduleTemplate,
} from "./persistence/canonical-definition-writes";

const matchAdminMachineSchedulePath = (
  pathname: string,
): { machineSlug: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 5 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "machines" &&
    segments[4] === "schedule"
  ) {
    return {
      machineSlug: segments[3],
    };
  }

  return null;
};

const matchAdminProviderPath = (
  pathname: string,
): { providerSlug: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 4 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "providers"
  ) {
    return {
      providerSlug: segments[3],
    };
  }

  return null;
};

const matchAdminPayoutRunPath = (
  pathname: string,
): { payoutRunId: string } | null => {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments.length === 4 &&
    segments[0] === "v1" &&
    segments[1] === "admin" &&
    segments[2] === "payout-runs"
  ) {
    return {
      payoutRunId: segments[3],
    };
  }

  return null;
};

const toDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const buildDefaultReportWindow = (
  daysInclusive: number = 7,
): { fromDate: string; toDate: string } => {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - Math.max(0, daysInclusive - 1));

  return {
    fromDate: toDateKey(start),
    toDate: toDateKey(end),
  };
};

const resolveReportWindow = (
  url: URL,
  daysInclusive: number = 7,
): { fromDate: string; toDate: string } => {
  const fallback = buildDefaultReportWindow(daysInclusive);

  return {
    fromDate: url.searchParams.get("fromDate") ?? fallback.fromDate,
    toDate: url.searchParams.get("toDate") ?? fallback.toDate,
  };
};

const requireProviderActor = (
  actor: AppActor | null,
): actor is AppActor => !!actor && actor.roles.includes("provider");

const requireAdminActor = (
  actor: AppActor | null,
): actor is AppActor =>
  !!actor && actor.roles.some((role) => ["admin", "owner"].includes(role));

const isOwnerActor = (actor: AppActor | null): actor is AppActor =>
  !!actor && actor.roles.includes("owner");

const buildUrl = (request: IncomingMessage, env: AppEnv): URL =>
  new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? `${env.DAYSI_API_HOST}:${env.DAYSI_API_PORT}`}`,
  );

const normalizeSlug = (value: string, label: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) {
    throw new Error(`${label} slug is invalid.`);
  }

  return normalized;
};

const toRecurringTemplate = (
  template: Array<{ dayOfWeek: number; startMinute: number; endMinute: number }>,
) =>
  template.map((window) => ({
    daysOfWeek: [window.dayOfWeek],
    startMinute: window.startMinute,
    endMinute: window.endMinute,
  }));

const buildAdminProviderPayload = (input: {
  provider: ProviderResource;
  commissionPercent: number;
}) => ({
  providerSlug: input.provider.slug,
  providerName: input.provider.name,
  email: input.provider.email ?? `${input.provider.slug}@daysi.local`,
  locationSlug: input.provider.locationSlug,
  serviceSlugs: input.provider.serviceSlugs,
  commissionPercent: input.commissionPercent,
  template: input.provider.availability.flatMap((window) =>
    window.daysOfWeek.map((dayOfWeek) => ({
      dayOfWeek,
      startMinute: window.startMinute,
      endMinute: window.endMinute,
    })),
  ),
  blockedWindows: (input.provider.blockedWindows ?? []).map((window) => ({
    startsAt: window.startAt,
    endsAt: window.endAt,
  })),
});

const getDefaultProviderCommissionPercent = (input: {
  providerSlug: string;
  locationSlug: string;
  compPlans: ReturnType<typeof getRuntimeClinicData>["providerCompPlans"];
}): number =>
  input.compPlans.find(
    (plan) =>
      plan.providerSlug === input.providerSlug &&
      plan.locationSlug === input.locationSlug &&
      !plan.serviceSlug,
  )?.commissionPercent ??
  input.compPlans.find(
    (plan) =>
      plan.providerSlug === input.providerSlug &&
      plan.locationSlug === input.locationSlug,
  )?.commissionPercent ??
  0;

const resolveScheduleExceptionsForProvider = (
  provider: ProviderResource,
): ProviderScheduleException[] => {
  const runtimeExceptions = getProviderExceptions(provider.slug);
  if (runtimeExceptions.length > 0) {
    return runtimeExceptions;
  }

  return (provider.blockedWindows ?? []).map((window) => ({
    startsAt: window.startAt,
    endsAt: window.endAt,
    kind: "manual_override" as const,
  }));
};

const ensureScopedAdminAccess = (
  actor: AppActor | null,
  locationSlug: string,
  permission:
    | "admin.machine.manage"
    | "admin.provider.manage"
    | "admin.payout.manage"
    | "admin.reporting.read",
): boolean => !!actor && canManageLocation(actor, permission, locationSlug);

const listScopedReportingLocations = (input: {
  actor: AppActor;
  env: AppEnv;
}) =>
  getRuntimeTenantContext(input.env).locations.filter((location) =>
    ensureScopedAdminAccess(input.actor, location.slug, "admin.reporting.read"),
  );

const validateProviderServiceAssignments = (input: {
  locationSlug: string;
  serviceSlugs: string[];
  clinicData: ReturnType<typeof getRuntimeClinicData>;
}): void => {
  for (const serviceSlug of input.serviceSlugs) {
    const exists = input.clinicData.catalog.services.some(
      (service) =>
        service.locationSlug === input.locationSlug && service.slug === serviceSlug,
    );

    if (!exists) {
      throw new Error(`Service ${serviceSlug} is not available at location ${input.locationSlug}.`);
    }
  }
};

export const handleProviderAndAdminRoutes = async (input: {
  method: string;
  pathname: string;
  request: IncomingMessage;
  response: ServerResponse;
  env: AppEnv;
  actor: AppActor | null;
  repositories: AppRepositories;
}): Promise<boolean> => {
  const clinicData = getRuntimeClinicData(input.env);
  const allOrders = await input.repositories.commerce.orders.listAll();
  const paidOrders = allOrders.filter((order) => order.status === "paid");
  const allBookings = await input.repositories.commerce.bookings.listAll();
  const confirmedBookings = await input.repositories.commerce.bookings.listByStatus(
    "confirmed",
  );
  const allMembershipSubscriptions =
    await input.repositories.commerce.memberships.listAllSubscriptions();
  const allMembershipUsageRecords =
    await input.repositories.commerce.memberships.listAllUsageRecords();
  const allMetricEvents = await input.repositories.analytics.listAll();

  if (input.method === "GET" && input.pathname === "/v1/provider/me/schedule") {
    if (!requireProviderActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Provider access is required.");
      return true;
    }

    const provider = resolveProviderForActor(clinicData.providers, input.actor);
    if (!provider) {
      sendError(input.response, 404, "not_found", "Provider record not found.");
      return true;
    }

    sendJson(
      input.response,
      200,
      providerScheduleResponseSchema.parse({
        ok: true,
        data: {
          schedule: buildResolvedProviderSchedule({
            provider,
            exceptions: resolveScheduleExceptionsForProvider(provider),
          }),
        },
      }),
    );
    return true;
  }

  if (input.method === "PUT" && input.pathname === "/v1/provider/me/schedule/template") {
    if (!requireProviderActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Provider access is required.");
      return true;
    }

    const provider = resolveProviderForActor(clinicData.providers, input.actor);
    if (!provider) {
      sendError(input.response, 404, "not_found", "Provider record not found.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        providerScheduleTemplateUpdateRequestSchema.parse(body),
      );
      if (payload.locationSlug !== provider.locationSlug) {
        sendError(input.response, 409, "conflict", "Provider location scope mismatch.");
        return true;
      }

      const nextTemplate = payload.template.map((window) => ({
        daysOfWeek: [window.dayOfWeek],
        startMinute: window.startMinute,
        endMinute: window.endMinute,
      }));
      if (isCanonicalDefinitionWriteEnabled(input.env)) {
        await persistCanonicalProviderScheduleTemplate({
          env: input.env,
          locationSlug: provider.locationSlug,
          providerSlug: provider.slug,
          template: nextTemplate,
        });
      } else {
        setProviderScheduleTemplate(provider.slug, nextTemplate);
      }

      const nextClinicData = getRuntimeClinicData(input.env);
      const updatedProvider = resolveProviderForActor(nextClinicData.providers, input.actor);
      if (!updatedProvider) {
        sendError(input.response, 404, "not_found", "Provider record not found.");
        return true;
      }

      sendJson(
        input.response,
        200,
        providerScheduleResponseSchema.parse({
          ok: true,
          data: {
            schedule: buildResolvedProviderSchedule({
              provider: updatedProvider,
              exceptions: resolveScheduleExceptionsForProvider(updatedProvider),
            }),
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid provider schedule request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (input.method === "POST" && input.pathname === "/v1/provider/me/schedule/exceptions") {
    if (!requireProviderActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Provider access is required.");
      return true;
    }

    const provider = resolveProviderForActor(clinicData.providers, input.actor);
    if (!provider) {
      sendError(input.response, 404, "not_found", "Provider record not found.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        providerScheduleExceptionCreateRequestSchema.parse(body),
      );
      if (payload.locationSlug !== provider.locationSlug) {
        sendError(input.response, 409, "conflict", "Provider location scope mismatch.");
        return true;
      }

      const nextWindow = {
        startsAt: payload.startsAt,
        endsAt: payload.endsAt,
        kind: payload.kind,
        note: payload.note,
      };
      let exceptions;
      let responseProvider = provider;
      if (isCanonicalDefinitionWriteEnabled(input.env)) {
        const existingExceptions = resolveScheduleExceptionsForProvider(provider);
        const nextExceptions = [...existingExceptions, nextWindow];
        await persistCanonicalProviderExceptions({
          env: input.env,
          locationSlug: provider.locationSlug,
          providerSlug: provider.slug,
          windows: nextExceptions.map((window) => ({
            startAt: window.startsAt,
            endAt: window.endsAt,
          })),
        });
        const refreshedProvider = resolveProviderForActor(
          getRuntimeClinicData(input.env).providers,
          input.actor,
        );
        responseProvider = refreshedProvider ?? provider;
        exceptions = refreshedProvider
          ? resolveScheduleExceptionsForProvider(refreshedProvider)
          : nextExceptions;
      } else {
        exceptions = addProviderScheduleException(provider.slug, nextWindow);
      }

      sendJson(
        input.response,
        200,
        providerScheduleResponseSchema.parse({
          ok: true,
          data: {
            schedule: buildResolvedProviderSchedule({
              provider: responseProvider,
              exceptions,
            }),
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid provider exception request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (input.method === "GET" && input.pathname === "/v1/provider/me/bookings") {
    if (!requireProviderActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Provider access is required.");
      return true;
    }

    const provider = resolveProviderForActor(clinicData.providers, input.actor);
    if (!provider) {
      sendError(input.response, 404, "not_found", "Provider record not found.");
      return true;
    }

    sendJson(
      input.response,
      200,
      providerBookingsResponseSchema.parse({
        ok: true,
        data: {
          bookings: confirmedBookings.filter((booking) => booking.providerSlug === provider.slug),
        },
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/provider/me/payouts") {
    if (!requireProviderActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Provider access is required.");
      return true;
    }

    const provider = resolveProviderForActor(clinicData.providers, input.actor);
    if (!provider) {
      sendError(input.response, 404, "not_found", "Provider record not found.");
      return true;
    }

    const payouts = calculateProviderPayouts({
      providers: clinicData.providers,
      bookings: confirmedBookings,
      orders: paidOrders,
      compPlans: clinicData.providerCompPlans,
    }).filter((payout) => payout.providerSlug === provider.slug);

    sendJson(
      input.response,
      200,
      providerPayoutsResponseSchema.parse({
        ok: true,
        data: {
          payouts,
        },
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/payout-runs") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const actor = input.actor;
    const url = buildUrl(input.request, input.env);
    const locationSlug = url.searchParams.get("locationSlug");
    if (
      locationSlug &&
      !ensureScopedAdminAccess(actor, locationSlug, "admin.payout.manage")
    ) {
      sendError(input.response, 403, "forbidden", "Location payout access is restricted.");
      return true;
    }

    const payoutRuns = (await input.repositories.operations.providerPayoutRuns.listAll()).filter(
      (payoutRun) =>
        locationSlug
          ? payoutRun.locationSlug === locationSlug
          : actor.roles.includes("owner")
            ? true
            : actor.locationScopes.includes(payoutRun.locationSlug),
    );

    sendJson(
      input.response,
      200,
      providerPayoutRunsResponseSchema.parse({
        ok: true,
        data: {
          payoutRuns,
        },
      }),
    );
    return true;
  }

  if (input.method === "POST" && input.pathname === "/v1/admin/payout-runs") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        providerPayoutRunCreateRequestSchema.parse(body),
      );
      if (!ensureScopedAdminAccess(input.actor, payload.locationSlug, "admin.payout.manage")) {
        sendError(input.response, 403, "forbidden", "Location payout access is restricted.");
        return true;
      }

      const payoutRun = createProviderPayoutRun({
        locationSlug: payload.locationSlug,
        fromDate: payload.fromDate,
        toDate: payload.toDate,
        providers: clinicData.providers,
        bookings: confirmedBookings,
        orders: paidOrders,
        compPlans: clinicData.providerCompPlans,
        createdByUserId: input.actor.userId,
        existingCoveredOrderIds:
          await input.repositories.operations.providerPayoutRuns.listCoveredOrderIdsForLocation(
            payload.locationSlug,
          ),
      });
      await input.repositories.operations.providerPayoutRuns.save(payoutRun);

      sendJson(
        input.response,
        201,
        providerPayoutRunResponseSchema.parse({
          ok: true,
          data: {
            payoutRun,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid payout run request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  const payoutRunMatch = matchAdminPayoutRunPath(input.pathname);
  if (payoutRunMatch && input.method === "PATCH") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        providerPayoutRunUpdateRequestSchema.parse(body),
      );
      const payoutRun = await input.repositories.operations.providerPayoutRuns.get(
        payoutRunMatch.payoutRunId,
      );
      if (!payoutRun) {
        sendError(input.response, 404, "not_found", "Payout run not found.");
        return true;
      }
      if (!ensureScopedAdminAccess(input.actor, payoutRun.locationSlug, "admin.payout.manage")) {
        sendError(input.response, 403, "forbidden", "Location payout access is restricted.");
        return true;
      }

      const nextPayoutRun =
        payload.status === "approved"
          ? approveProviderPayoutRun(payoutRun)
          : markProviderPayoutRunPaid(payoutRun);
      await input.repositories.operations.providerPayoutRuns.save(nextPayoutRun);

      sendJson(
        input.response,
        200,
        providerPayoutRunResponseSchema.parse({
          ok: true,
          data: {
            payoutRun: nextPayoutRun,
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid payout run update.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/providers") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }
    const actor = input.actor;
    const url = buildUrl(input.request, input.env);
    const locationSlug = url.searchParams.get("locationSlug");
    if (
      locationSlug &&
      !ensureScopedAdminAccess(actor, locationSlug, "admin.provider.manage")
    ) {
      sendError(input.response, 403, "forbidden", "Location provider access is restricted.");
      return true;
    }
    const providers = clinicData.providers.filter((provider) => {
      if (locationSlug) {
        return provider.locationSlug === locationSlug;
      }

      return actor.roles.includes("owner")
        ? true
        : actor.locationScopes.includes(provider.locationSlug);
    });

    sendJson(
      input.response,
      200,
      adminProvidersResponseSchema.parse({
        ok: true,
        data: {
          providers: providers.map((provider) => ({
              providerSlug: provider.slug,
              providerName: provider.name,
              email: provider.email ?? `${provider.slug}@daysi.local`,
              locationSlug: provider.locationSlug,
              serviceSlugs: provider.serviceSlugs,
              commissionPercent: getDefaultProviderCommissionPercent({
                providerSlug: provider.slug,
                locationSlug: provider.locationSlug,
                compPlans: clinicData.providerCompPlans,
              }),
            })),
        },
      }),
    );
    return true;
  }

  if (input.method === "POST" && input.pathname === "/v1/admin/providers") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminProviderCreateRequestSchema.parse(body),
      );
      if (!ensureScopedAdminAccess(input.actor, payload.locationSlug, "admin.provider.manage")) {
        sendError(input.response, 403, "forbidden", "Location provider access is restricted.");
        return true;
      }
      const tenant = getRuntimeTenantContext(input.env);
      const location = tenant.locations.find((entry) => entry.slug === payload.locationSlug);
      if (!location) {
        sendError(input.response, 404, "not_found", "Location not found.");
        return true;
      }
      const serviceSlugs = payload.serviceSlugs.map((serviceSlug) =>
        normalizeSlug(serviceSlug, "Service"),
      );
      validateProviderServiceAssignments({
        locationSlug: payload.locationSlug,
        serviceSlugs,
        clinicData,
      });

      const nextProvider: ProviderResource = {
        slug: normalizeSlug(payload.slug, "Provider"),
        name: payload.name,
        email: payload.email.toLowerCase(),
        locationSlug: payload.locationSlug,
        serviceSlugs,
        availability: toRecurringTemplate(payload.template),
        blockedWindows: payload.blockedWindows.map((window) => ({
          startAt: window.startsAt,
          endAt: window.endsAt,
        })),
      };
      const provider = isCanonicalDefinitionWriteEnabled(input.env)
        ? (await persistCanonicalProvider(input.env, nextProvider),
          getRuntimeClinicData(input.env).providers.find(
            (entry) =>
              entry.slug === nextProvider.slug &&
              entry.locationSlug === nextProvider.locationSlug,
          ) ?? nextProvider)
        : upsertProviderResource(nextProvider);

      sendJson(
        input.response,
        201,
        adminProviderResponseSchema.parse({
          ok: true,
          data: {
            provider: buildAdminProviderPayload({
              provider,
              commissionPercent: getDefaultProviderCommissionPercent({
                providerSlug: provider.slug,
                locationSlug: provider.locationSlug,
                compPlans: clinicData.providerCompPlans,
              }),
            }),
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid provider request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  const adminProviderMatch = matchAdminProviderPath(input.pathname);
  if (adminProviderMatch && input.method === "PATCH") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        adminProviderUpdateRequestSchema.parse(body),
      );
      if (!ensureScopedAdminAccess(input.actor, payload.locationSlug, "admin.provider.manage")) {
        sendError(input.response, 403, "forbidden", "Location provider access is restricted.");
        return true;
      }
      const existing = clinicData.providers.find(
        (provider) =>
          provider.slug === adminProviderMatch.providerSlug &&
          provider.locationSlug === payload.locationSlug,
      );

      if (!existing) {
        sendError(input.response, 404, "not_found", "Provider not found.");
        return true;
      }
      const serviceSlugs =
        payload.serviceSlugs?.map((serviceSlug) => normalizeSlug(serviceSlug, "Service")) ??
        existing.serviceSlugs;
      validateProviderServiceAssignments({
        locationSlug: payload.locationSlug,
        serviceSlugs,
        clinicData,
      });

      const nextProvider: ProviderResource = {
        ...existing,
        name: payload.name ?? existing.name,
        email: payload.email?.toLowerCase() ?? existing.email,
        serviceSlugs,
        availability: payload.template
          ? toRecurringTemplate(payload.template)
          : existing.availability,
        blockedWindows:
          payload.blockedWindows?.map((window) => ({
            startAt: window.startsAt,
            endAt: window.endsAt,
          })) ?? existing.blockedWindows,
      };
      const provider = isCanonicalDefinitionWriteEnabled(input.env)
        ? (await persistCanonicalProvider(input.env, nextProvider),
          getRuntimeClinicData(input.env).providers.find(
            (entry) =>
              entry.slug === nextProvider.slug &&
              entry.locationSlug === nextProvider.locationSlug,
          ) ?? nextProvider)
        : upsertProviderResource(nextProvider);

      sendJson(
        input.response,
        200,
        adminProviderResponseSchema.parse({
          ok: true,
          data: {
            provider: buildAdminProviderPayload({
              provider,
              commissionPercent: getDefaultProviderCommissionPercent({
                providerSlug: provider.slug,
                locationSlug: provider.locationSlug,
                compPlans: clinicData.providerCompPlans,
              }),
            }),
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid provider update request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/machines") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    sendJson(
      input.response,
      200,
      adminMachinesResponseSchema.parse({
        ok: true,
        data: {
          machines: clinicData.machines.map((machine) => ({
            machineSlug: machine.slug,
            machineName: machine.name,
            locationSlug: machine.locationSlug,
            capabilities: machine.capabilitySlugs,
            template: machine.availability.flatMap((window) =>
              window.daysOfWeek.map((dayOfWeek) => ({
                dayOfWeek,
                startMinute: window.startMinute,
                endMinute: window.endMinute,
              })),
            ),
            blockedWindows: machine.blockedWindows.map((window) => ({
              startsAt: window.startAt,
              endsAt: window.endAt,
            })),
          })),
        },
      }),
    );
    return true;
  }

  const machineScheduleMatch = matchAdminMachineSchedulePath(input.pathname);
  if (machineScheduleMatch && input.method === "PUT") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const machine = clinicData.machines.find(
      (entry) => entry.slug === machineScheduleMatch.machineSlug,
    );
    if (!machine) {
      sendError(input.response, 404, "not_found", "Machine not found.");
      return true;
    }
    if (!ensureScopedAdminAccess(input.actor, machine.locationSlug, "admin.machine.manage")) {
      sendError(input.response, 403, "forbidden", "Location machine access is restricted.");
      return true;
    }

    try {
      const payload = await readJsonBody(input.request, (body) =>
        machineScheduleUpdateRequestSchema.parse(body),
      );
      if (payload.locationSlug !== machine.locationSlug) {
        sendError(input.response, 409, "conflict", "Machine location scope mismatch.");
        return true;
      }

      const nextTemplate = payload.template.map((window) => ({
        daysOfWeek: [window.dayOfWeek],
        startMinute: window.startMinute,
        endMinute: window.endMinute,
      }));
      if (isCanonicalDefinitionWriteEnabled(input.env)) {
        await persistCanonicalMachineScheduleTemplate({
          env: input.env,
          locationSlug: machine.locationSlug,
          machineSlug: machine.slug,
          template: nextTemplate,
        });
      } else {
        setMachineScheduleTemplate(machine.slug, nextTemplate);
      }

      const nextMachine = getRuntimeClinicData(input.env).machines.find(
        (entry) => entry.slug === machine.slug,
      );
      if (!nextMachine) {
        sendError(input.response, 404, "not_found", "Machine not found.");
        return true;
      }

      sendJson(
        input.response,
        200,
        adminMachinesResponseSchema.parse({
          ok: true,
          data: {
            machines: [
              {
                machineSlug: nextMachine.slug,
                machineName: nextMachine.name,
                locationSlug: nextMachine.locationSlug,
                capabilities: nextMachine.capabilitySlugs,
                template: nextMachine.availability.flatMap((window) =>
                  window.daysOfWeek.map((dayOfWeek) => ({
                    dayOfWeek,
                    startMinute: window.startMinute,
                    endMinute: window.endMinute,
                  })),
                ),
                blockedWindows: nextMachine.blockedWindows.map((window) => ({
                  startsAt: window.startAt,
                  endsAt: window.endAt,
                })),
              },
            ],
          },
        }),
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid machine schedule request.";
      sendError(input.response, 400, "validation_error", message);
      return true;
    }
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/reports/provider-performance") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }
    const url = buildUrl(input.request, input.env);
    const locationSlug =
      url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    if (!ensureScopedAdminAccess(input.actor, locationSlug, "admin.reporting.read")) {
      sendError(input.response, 403, "forbidden", "Location reporting access is restricted.");
      return true;
    }

    const payouts = calculateProviderPayouts({
      providers: clinicData.providers,
      bookings: confirmedBookings,
      orders: paidOrders,
      compPlans: clinicData.providerCompPlans,
    });

    sendJson(
      input.response,
      200,
      providerPerformanceReportResponseSchema.parse({
        ok: true,
        data: {
          locationSlug,
          providers: buildProviderPerformanceReport({
            providers: clinicData.providers.filter(
              (provider) => provider.locationSlug === locationSlug,
            ),
            bookings: confirmedBookings.filter(
              (booking) => booking.locationSlug === locationSlug,
            ),
            payouts,
          }),
        },
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/reports/revenue-summary") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const url = new URL(
      input.request.url ?? "/",
      `http://${input.request.headers.host ?? `${input.env.DAYSI_API_HOST}:${input.env.DAYSI_API_PORT}`}`,
    );
    const locationSlug =
      url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    if (!ensureScopedAdminAccess(input.actor, locationSlug, "admin.reporting.read")) {
      sendError(input.response, 403, "forbidden", "Location reporting access is restricted.");
      return true;
    }
    const fromDate = url.searchParams.get("fromDate");
    const toDate = url.searchParams.get("toDate");
    const ordersInRange = allOrders.filter((order) => {
      const effectiveDate = order.paidAt ?? order.createdAt;

      if (fromDate && effectiveDate.slice(0, 10) < fromDate) {
        return false;
      }

      if (toDate && effectiveDate.slice(0, 10) > toDate) {
        return false;
      }

      return order.status === "paid" || order.status === "refunded";
    });
    const report = buildRevenueSummaryReport({
      locationSlug,
      orders: ordersInRange,
    });

    sendJson(
      input.response,
      200,
      revenueSummaryReportResponseSchema.parse({
        ok: true,
        data: {
          locationSlug,
          currency: report.currency,
          streams: report.streams,
          totals: report.totals,
        },
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/reports/multi-location-benchmark") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const tenant = getRuntimeTenantContext(input.env);
    const url = buildUrl(input.request, input.env);
    const organizationId = url.searchParams.get("organizationId");
    const organizationSlug = url.searchParams.get("organizationSlug");
    const organization = organizationId
      ? getOrganizationById(tenant, organizationId)
      : organizationSlug
        ? getOrganizationBySlug(tenant, organizationSlug)
        : undefined;

    if ((organizationId || organizationSlug) && !organization) {
      sendError(input.response, 404, "not_found", "Organization not found.");
      return true;
    }

    const locations = listScopedReportingLocations({
      actor: input.actor,
      env: input.env,
    }).filter((location) =>
      organization ? location.organizationId === organization.id : true,
    );

    if (locations.length === 0) {
      sendError(
        input.response,
        403,
        "forbidden",
        "No reportable locations are available for this scope.",
      );
      return true;
    }

    const { fromDate, toDate } = resolveReportWindow(url);
    const report = buildMultiLocationBenchmarkReport({
      fromDate,
      toDate,
      locations,
      organizations: tenant.organizations,
      organization,
      services: clinicData.catalog.services,
      machines: clinicData.machines,
      rooms: clinicData.rooms,
      orders: allOrders,
      bookings: allBookings,
      metricEvents: allMetricEvents,
      membershipPlans: clinicData.membershipPlans,
      membershipSubscriptions: allMembershipSubscriptions,
      membershipUsageRecords: allMembershipUsageRecords,
      treatmentPlans: await input.repositories.clinicalIntelligence.treatmentPlans.list(),
      skinAssessments: await input.repositories.clinicalIntelligence.skinAssessments.list(),
    });

    sendJson(
      input.response,
      200,
      multiLocationBenchmarkReportResponseSchema.parse({
        ok: true,
        data: report,
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/reports/location-finance") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const url = buildUrl(input.request, input.env);
    const locationSlug =
      url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    if (!ensureScopedAdminAccess(input.actor, locationSlug, "admin.reporting.read")) {
      sendError(input.response, 403, "forbidden", "Location reporting access is restricted.");
      return true;
    }

    const dashboard = buildLocationFinanceDashboard({
      locationSlug,
      orders: allOrders.filter(
        (order) => order.status === "paid" || order.status === "refunded",
      ),
      payoutRuns: await input.repositories.operations.providerPayoutRuns.listAll(),
    });

    sendJson(
      input.response,
      200,
      locationFinanceDashboardResponseSchema.parse({
        ok: true,
        data: dashboard,
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/reports/referral-performance") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const url = buildUrl(input.request, input.env);
    const locationSlug =
      url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    if (!ensureScopedAdminAccess(input.actor, locationSlug, "admin.reporting.read")) {
      sendError(input.response, 403, "forbidden", "Location reporting access is restricted.");
      return true;
    }

    const report = buildReferralPerformanceReport({
      locationSlug,
      orders: allOrders,
      programs: await input.repositories.growth.referrals.listPrograms(locationSlug),
      relationships: await input.repositories.growth.referrals.listRelationships(locationSlug),
      rewardEvents: await input.repositories.growth.referrals.listRewardEvents(locationSlug),
    });

    sendJson(
      input.response,
      200,
      referralPerformanceReportResponseSchema.parse({
        ok: true,
        data: report,
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/reports/membership-performance") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const url = buildUrl(input.request, input.env);
    const locationSlug =
      url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    if (!ensureScopedAdminAccess(input.actor, locationSlug, "admin.reporting.read")) {
      sendError(input.response, 403, "forbidden", "Location reporting access is restricted.");
      return true;
    }

    const report = buildMembershipPerformanceReport({
      locationSlug,
      orders: allOrders,
      plans: clinicData.membershipPlans,
      subscriptions: allMembershipSubscriptions,
      usageRecords: allMembershipUsageRecords,
    });

    sendJson(
      input.response,
      200,
      membershipPerformanceReportResponseSchema.parse({
        ok: true,
        data: report,
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/reports/operations-performance") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const url = buildUrl(input.request, input.env);
    const locationSlug =
      url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    if (!ensureScopedAdminAccess(input.actor, locationSlug, "admin.reporting.read")) {
      sendError(input.response, 403, "forbidden", "Location reporting access is restricted.");
      return true;
    }

    const { fromDate, toDate } = resolveReportWindow(url);
    const report = buildOperationsPerformanceReport({
      locationSlug,
      fromDate,
      toDate,
      services: clinicData.catalog.services,
      machines: clinicData.machines,
      rooms: clinicData.rooms,
      bookings: confirmedBookings,
      orders: allOrders,
      metricEvents: allMetricEvents,
    });

    sendJson(
      input.response,
      200,
      operationsPerformanceReportResponseSchema.parse({
        ok: true,
        data: report,
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/reports/web-analytics") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const url = buildUrl(input.request, input.env);
    const locationSlug =
      url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    if (!ensureScopedAdminAccess(input.actor, locationSlug, "admin.reporting.read")) {
      sendError(input.response, 403, "forbidden", "Location reporting access is restricted.");
      return true;
    }

    const { fromDate, toDate } = resolveReportWindow(url);
    const report = buildWebsiteAnalyticsReport({
      locationSlug,
      fromDate,
      toDate,
      metricEvents: allMetricEvents,
    });

    sendJson(
      input.response,
      200,
      websiteAnalyticsReportResponseSchema.parse({
        ok: true,
        data: report,
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/reports/skin-analysis-performance") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const url = buildUrl(input.request, input.env);
    const locationSlug =
      url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    if (!ensureScopedAdminAccess(input.actor, locationSlug, "admin.reporting.read")) {
      sendError(input.response, 403, "forbidden", "Location reporting access is restricted.");
      return true;
    }

    const { fromDate, toDate } = resolveReportWindow(url);
    const report = buildSkinAssessmentPerformanceReport({
      locationSlug,
      fromDate,
      toDate,
      services: clinicData.catalog.services,
      assessments: await input.repositories.clinicalIntelligence.skinAssessments.list(
        locationSlug,
      ),
      bookings: allBookings,
      orders: allOrders,
    });

    sendJson(
      input.response,
      200,
      skinAssessmentPerformanceReportResponseSchema.parse({
        ok: true,
        data: report,
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/reports/treatment-plan-performance") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const url = buildUrl(input.request, input.env);
    const locationSlug =
      url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    if (!ensureScopedAdminAccess(input.actor, locationSlug, "admin.reporting.read")) {
      sendError(input.response, 403, "forbidden", "Location reporting access is restricted.");
      return true;
    }

    const { fromDate, toDate } = resolveReportWindow(url);
    const report = buildTreatmentPlanPerformanceReport({
      locationSlug,
      fromDate,
      toDate,
      services: clinicData.catalog.services,
      treatmentPlans: await input.repositories.clinicalIntelligence.treatmentPlans.list(
        locationSlug,
      ),
      bookings: allBookings,
      orders: allOrders,
    });

    sendJson(
      input.response,
      200,
      treatmentPlanPerformanceReportResponseSchema.parse({
        ok: true,
        data: report,
      }),
    );
    return true;
  }

  if (input.method === "GET" && input.pathname === "/v1/admin/reports/utilization") {
    if (!requireAdminActor(input.actor)) {
      sendError(input.response, 403, "forbidden", "Admin access is required.");
      return true;
    }

    const url = new URL(
      input.request.url ?? "/",
      `http://${input.request.headers.host ?? `${input.env.DAYSI_API_HOST}:${input.env.DAYSI_API_PORT}`}`,
    );
    const locationSlug =
      url.searchParams.get("locationSlug") ?? input.env.DAYSI_DEFAULT_LOCATION_SLUG;
    if (!ensureScopedAdminAccess(input.actor, locationSlug, "admin.reporting.read")) {
      sendError(input.response, 403, "forbidden", "Location reporting access is restricted.");
      return true;
    }
    const { fromDate, toDate } = resolveReportWindow(url);
    const utilization = buildUtilizationReport({
      locationSlug,
      fromDate,
      toDate,
      machines: clinicData.machines,
      bookings: confirmedBookings,
      orders: paidOrders,
    });

    sendJson(
      input.response,
      200,
      utilizationReportResponseSchema.parse({
        ok: true,
        data: {
          locationSlug,
          fromDate,
          toDate,
          machines: utilization.machines,
          location: utilization.location,
        },
      }),
    );
    return true;
  }

  return false;
};
