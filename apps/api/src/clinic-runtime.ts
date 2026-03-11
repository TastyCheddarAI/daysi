import type {
  CatalogService,
  CouponDefinition,
  EducationModule,
  EducationOffer,
  LocationOperatingSchedule,
  MachineResource,
  MembershipPlan,
  ProviderCompPlan,
  ProviderResource,
  RoomResource,
  ServicePackageOffer,
  ProviderScheduleException,
  RecurringTimeWindow,
  TenantContext,
  TenantLocation,
  TenantOrganization,
} from "../../../packages/domain/src";

import {
  mapScheduleExceptionsToBlockedWindows,
  normalizeCouponCode,
} from "../../../packages/domain/src";

import type { BootstrapClinicData } from "./bootstrap-clinic-data";
import type { AppEnv } from "./config";
import {
  getClinicDefinitionRepository,
  resetClinicDefinitionRepository,
} from "./persistence/clinic-definition-repository";
import {
  getRuntimeStateRepository,
  resetRuntimeStateRepository,
} from "./persistence/runtime-state-repository";

const buildScopedKey = (locationSlug: string, entrySlug: string): string =>
  `${locationSlug}::${entrySlug}`;

const buildProviderCompPlanKey = (plan: ProviderCompPlan): string =>
  [
    plan.locationSlug,
    plan.providerSlug,
    plan.serviceSlug ?? "default",
  ].join("::");

const mergeByKey = <T>(
  baseEntries: T[],
  overrideEntries: Iterable<T>,
  getKey: (entry: T) => string,
): T[] => {
  const merged = new Map<string, T>();

  for (const entry of baseEntries) {
    merged.set(getKey(entry), entry);
  }

  for (const entry of overrideEntries) {
    merged.set(getKey(entry), entry);
  }

  return [...merged.values()];
};

const shouldApplyRuntimeOverrides = (env: AppEnv): boolean =>
  env.DAYSI_CLINIC_DEFINITION_REPOSITORY !== "postgres";

export const getRuntimeTenantContext = (env: AppEnv): TenantContext => {
  const base = getClinicDefinitionRepository(env).getTenantContext(env);
  if (!shouldApplyRuntimeOverrides(env)) {
    return base;
  }
  const runtimeState = getRuntimeStateRepository();
  const organizations = mergeByKey(
    base.organizations,
    runtimeState.listOrganizationOverrides(),
    (organization) => organization.id,
  );
  const locations = mergeByKey(
    base.locations,
    runtimeState.listLocationOverrides(),
    (location) => location.slug,
  );

  return {
    ...base,
    organizations,
    locations,
  };
};

export const getRuntimeClinicData = (env: AppEnv): BootstrapClinicData => {
  const base = getClinicDefinitionRepository(env).getClinicData(env);
  if (!shouldApplyRuntimeOverrides(env)) {
    return base;
  }
  const runtimeState = getRuntimeStateRepository();
  const services = mergeByKey(
    base.catalog.services,
    runtimeState.listServiceOverrides(),
    (service) => buildScopedKey(service.locationSlug, service.slug),
  );
  const educationOffers = mergeByKey(
    base.catalog.educationOffers,
    runtimeState.listEducationOfferOverrides(),
    (offer) => buildScopedKey(offer.locationSlug, offer.slug),
  );
  const servicePackages = mergeByKey(
    base.catalog.servicePackages,
    runtimeState.listServicePackageOverrides(),
    (offer) => buildScopedKey(offer.locationSlug, offer.slug),
  );
  const coupons = mergeByKey(
    base.coupons,
    runtimeState.listCouponOverrides(),
    (coupon) => buildScopedKey(coupon.locationSlug, normalizeCouponCode(coupon.code)),
  );
  const membershipPlans = mergeByKey(
    base.membershipPlans,
    runtimeState.listMembershipPlanOverrides(),
    (plan) => buildScopedKey(plan.locationSlug, plan.slug),
  );
  const providerCompPlans = mergeByKey(
    base.providerCompPlans,
    runtimeState.listProviderCompPlanOverrides(),
    buildProviderCompPlanKey,
  );
  const locationSchedules = mergeByKey(
    base.locationSchedules,
    runtimeState.listLocationScheduleOverrides(),
    (schedule) => schedule.locationSlug,
  );
  const machines = mergeByKey(
    base.machines,
    runtimeState.listMachineOverrides(),
    (machine) => buildScopedKey(machine.locationSlug, machine.slug),
  ).map((machine) => ({
    ...machine,
    availability: runtimeState.getMachineScheduleTemplate(machine.slug) ?? machine.availability,
  }));
  const rooms = mergeByKey(
    base.rooms,
    runtimeState.listRoomOverrides(),
    (room) => buildScopedKey(room.locationSlug, room.slug),
  ).map((room) => ({
    ...room,
    availability: runtimeState.getRoomScheduleTemplate(room.slug) ?? room.availability,
  }));
  const providers = mergeByKey(
    base.providers,
    runtimeState.listProviderOverrides(),
    (provider) => buildScopedKey(provider.locationSlug, provider.slug),
  ).map((provider) => {
    const exceptions = runtimeState.getProviderExceptions(provider.slug);

    return {
      ...provider,
      availability:
        runtimeState.getProviderScheduleTemplate(provider.slug) ?? provider.availability,
      blockedWindows: [
        ...(provider.blockedWindows ?? []),
        ...mapScheduleExceptionsToBlockedWindows(exceptions),
      ],
    };
  });

  return {
    ...base,
    catalog: {
      ...base.catalog,
      services,
      educationOffers,
      servicePackages,
    },
    coupons,
    membershipPlans,
    providerCompPlans,
    locationSchedules,
    locationSchedule:
      locationSchedules.find((schedule) => schedule.locationSlug === env.DAYSI_DEFAULT_LOCATION_SLUG) ??
      base.locationSchedule,
    providers,
    machines,
    rooms,
  };
};

export const getLocationOperatingSchedule = (
  env: AppEnv,
  locationSlug: string,
): LocationOperatingSchedule | undefined =>
  getRuntimeClinicData(env).locationSchedules.find(
    (schedule) => schedule.locationSlug === locationSlug,
  );

export const upsertTenantLocation = (location: TenantLocation): TenantLocation => {
  return getRuntimeStateRepository().saveLocationOverride(location);
};

export const upsertTenantOrganization = (
  organization: TenantOrganization,
): TenantOrganization => {
  return getRuntimeStateRepository().saveOrganizationOverride(organization);
};

export const upsertLocationOperatingSchedule = (
  schedule: LocationOperatingSchedule,
): LocationOperatingSchedule => {
  return getRuntimeStateRepository().saveLocationScheduleOverride(schedule);
};

export const getProviderExceptions = (providerSlug: string): ProviderScheduleException[] =>
  getRuntimeStateRepository().getProviderExceptions(providerSlug);

export const setProviderScheduleTemplate = (
  providerSlug: string,
  template: RecurringTimeWindow[],
): void => {
  getRuntimeStateRepository().setProviderScheduleTemplate(providerSlug, template);
};

export const addProviderScheduleException = (
  providerSlug: string,
  exception: ProviderScheduleException,
): ProviderScheduleException[] => {
  return getRuntimeStateRepository().addProviderException(providerSlug, exception);
};

export const setMachineScheduleTemplate = (
  machineSlug: string,
  template: RecurringTimeWindow[],
): void => {
  getRuntimeStateRepository().setMachineScheduleTemplate(machineSlug, template);
};

export const setRoomScheduleTemplate = (
  roomSlug: string,
  template: RecurringTimeWindow[],
): void => {
  getRuntimeStateRepository().setRoomScheduleTemplate(roomSlug, template);
};

export const upsertCatalogService = (service: CatalogService): CatalogService => {
  return getRuntimeStateRepository().saveServiceOverride(service);
};

export const upsertEducationOffer = (offer: EducationOffer): EducationOffer => {
  return getRuntimeStateRepository().saveEducationOfferOverride(offer);
};

export const upsertEducationModule = (module: EducationModule): EducationModule => {
  // Store in runtime state for now - in production this would go to the database
  return getRuntimeStateRepository().saveEducationModuleOverride?.(module) ?? module;
};

export const upsertServicePackageOffer = (
  offer: ServicePackageOffer,
): ServicePackageOffer => {
  return getRuntimeStateRepository().saveServicePackageOverride(offer);
};

export const upsertMembershipPlan = (plan: MembershipPlan): MembershipPlan => {
  return getRuntimeStateRepository().saveMembershipPlanOverride(plan);
};

export const upsertProviderCompPlan = (
  plan: ProviderCompPlan,
): ProviderCompPlan => {
  return getRuntimeStateRepository().saveProviderCompPlanOverride(plan);
};

export const upsertProviderResource = (provider: ProviderResource): ProviderResource => {
  return getRuntimeStateRepository().saveProviderOverride(provider);
};

export const upsertMachineResource = (machine: MachineResource): MachineResource => {
  return getRuntimeStateRepository().saveMachineOverride(machine);
};

export const upsertRoomResource = (room: RoomResource): RoomResource => {
  return getRuntimeStateRepository().saveRoomOverride(room);
};

export const upsertCouponDefinition = (
  coupon: CouponDefinition,
): CouponDefinition => {
  return getRuntimeStateRepository().saveCouponOverride(coupon);
};

export const getMachineBySlug = (
  env: AppEnv,
  machineSlug: string,
): MachineResource | undefined =>
  getRuntimeClinicData(env).machines.find((machine) => machine.slug === machineSlug);

export const getRoomBySlug = (
  env: AppEnv,
  roomSlug: string,
): RoomResource | undefined =>
  getRuntimeClinicData(env).rooms.find((room) => room.slug === roomSlug);

export const resetRuntimeClinicData = (): void => {
  resetRuntimeStateRepository();
  resetClinicDefinitionRepository();
};
