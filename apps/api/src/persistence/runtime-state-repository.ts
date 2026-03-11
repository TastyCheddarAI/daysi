import type {
  CatalogService,
  CouponDefinition,
  EducationOffer,
  LocationOperatingSchedule,
  MachineResource,
  MembershipPlan,
  ProviderCompPlan,
  ProviderResource,
  ProviderScheduleException,
  RecurringTimeWindow,
  RoomResource,
  ServicePackageOffer,
  TenantLocation,
  TenantOrganization,
} from "../../../../packages/domain/src";

import { normalizeCouponCode } from "../../../../packages/domain/src";

const buildScopedKey = (locationSlug: string, entrySlug: string): string =>
  `${locationSlug}::${entrySlug}`;

const buildProviderCompPlanKey = (plan: ProviderCompPlan): string =>
  [
    plan.locationSlug,
    plan.providerSlug,
    plan.serviceSlug ?? "default",
  ].join("::");

export interface RuntimeStateRepository {
  listOrganizationOverrides(): TenantOrganization[];
  saveOrganizationOverride(organization: TenantOrganization): TenantOrganization;
  listLocationOverrides(): TenantLocation[];
  saveLocationOverride(location: TenantLocation): TenantLocation;
  listLocationScheduleOverrides(): LocationOperatingSchedule[];
  saveLocationScheduleOverride(
    schedule: LocationOperatingSchedule,
  ): LocationOperatingSchedule;
  getProviderExceptions(providerSlug: string): ProviderScheduleException[];
  addProviderException(
    providerSlug: string,
    exception: ProviderScheduleException,
  ): ProviderScheduleException[];
  getProviderScheduleTemplate(
    providerSlug: string,
  ): RecurringTimeWindow[] | undefined;
  setProviderScheduleTemplate(
    providerSlug: string,
    template: RecurringTimeWindow[],
  ): void;
  getMachineScheduleTemplate(
    machineSlug: string,
  ): RecurringTimeWindow[] | undefined;
  setMachineScheduleTemplate(
    machineSlug: string,
    template: RecurringTimeWindow[],
  ): void;
  getRoomScheduleTemplate(roomSlug: string): RecurringTimeWindow[] | undefined;
  setRoomScheduleTemplate(roomSlug: string, template: RecurringTimeWindow[]): void;
  listServiceOverrides(): CatalogService[];
  saveServiceOverride(service: CatalogService): CatalogService;
  listEducationOfferOverrides(): EducationOffer[];
  saveEducationOfferOverride(offer: EducationOffer): EducationOffer;
  listServicePackageOverrides(): ServicePackageOffer[];
  saveServicePackageOverride(offer: ServicePackageOffer): ServicePackageOffer;
  listMembershipPlanOverrides(): MembershipPlan[];
  saveMembershipPlanOverride(plan: MembershipPlan): MembershipPlan;
  listProviderCompPlanOverrides(): ProviderCompPlan[];
  saveProviderCompPlanOverride(plan: ProviderCompPlan): ProviderCompPlan;
  listProviderOverrides(): ProviderResource[];
  saveProviderOverride(provider: ProviderResource): ProviderResource;
  listMachineOverrides(): MachineResource[];
  saveMachineOverride(machine: MachineResource): MachineResource;
  listRoomOverrides(): RoomResource[];
  saveRoomOverride(room: RoomResource): RoomResource;
  listCouponOverrides(): CouponDefinition[];
  saveCouponOverride(coupon: CouponDefinition): CouponDefinition;
  reset(): void;
}

export const createInMemoryRuntimeStateRepository = (): RuntimeStateRepository => {
  const organizationOverrides = new Map<string, TenantOrganization>();
  const locationOverrides = new Map<string, TenantLocation>();
  const locationScheduleOverrides = new Map<string, LocationOperatingSchedule>();
  const providerTemplateOverrides = new Map<string, RecurringTimeWindow[]>();
  const providerExceptions = new Map<string, ProviderScheduleException[]>();
  const machineTemplateOverrides = new Map<string, RecurringTimeWindow[]>();
  const roomTemplateOverrides = new Map<string, RecurringTimeWindow[]>();
  const serviceOverrides = new Map<string, CatalogService>();
  const educationOfferOverrides = new Map<string, EducationOffer>();
  const servicePackageOverrides = new Map<string, ServicePackageOffer>();
  const membershipPlanOverrides = new Map<string, MembershipPlan>();
  const providerCompPlanOverrides = new Map<string, ProviderCompPlan>();
  const providerOverrides = new Map<string, ProviderResource>();
  const machineOverrides = new Map<string, MachineResource>();
  const roomOverrides = new Map<string, RoomResource>();
  const couponOverrides = new Map<string, CouponDefinition>();

  return {
    listOrganizationOverrides: () => [...organizationOverrides.values()],
    saveOrganizationOverride: (organization) => {
      organizationOverrides.set(organization.id, organization);
      return organization;
    },
    listLocationOverrides: () => [...locationOverrides.values()],
    saveLocationOverride: (location) => {
      locationOverrides.set(location.slug, location);
      return location;
    },
    listLocationScheduleOverrides: () => [...locationScheduleOverrides.values()],
    saveLocationScheduleOverride: (schedule) => {
      locationScheduleOverrides.set(schedule.locationSlug, schedule);
      return schedule;
    },
    getProviderExceptions: (providerSlug) => providerExceptions.get(providerSlug) ?? [],
    addProviderException: (providerSlug, exception) => {
      const next = [...(providerExceptions.get(providerSlug) ?? []), exception];
      providerExceptions.set(providerSlug, next);
      return next;
    },
    getProviderScheduleTemplate: (providerSlug) => providerTemplateOverrides.get(providerSlug),
    setProviderScheduleTemplate: (providerSlug, template) => {
      providerTemplateOverrides.set(providerSlug, template);
    },
    getMachineScheduleTemplate: (machineSlug) => machineTemplateOverrides.get(machineSlug),
    setMachineScheduleTemplate: (machineSlug, template) => {
      machineTemplateOverrides.set(machineSlug, template);
    },
    getRoomScheduleTemplate: (roomSlug) => roomTemplateOverrides.get(roomSlug),
    setRoomScheduleTemplate: (roomSlug, template) => {
      roomTemplateOverrides.set(roomSlug, template);
    },
    listServiceOverrides: () => [...serviceOverrides.values()],
    saveServiceOverride: (service) => {
      serviceOverrides.set(buildScopedKey(service.locationSlug, service.slug), service);
      return service;
    },
    listEducationOfferOverrides: () => [...educationOfferOverrides.values()],
    saveEducationOfferOverride: (offer) => {
      educationOfferOverrides.set(buildScopedKey(offer.locationSlug, offer.slug), offer);
      return offer;
    },
    listServicePackageOverrides: () => [...servicePackageOverrides.values()],
    saveServicePackageOverride: (offer) => {
      servicePackageOverrides.set(buildScopedKey(offer.locationSlug, offer.slug), offer);
      return offer;
    },
    listMembershipPlanOverrides: () => [...membershipPlanOverrides.values()],
    saveMembershipPlanOverride: (plan) => {
      membershipPlanOverrides.set(buildScopedKey(plan.locationSlug, plan.slug), plan);
      return plan;
    },
    listProviderCompPlanOverrides: () => [...providerCompPlanOverrides.values()],
    saveProviderCompPlanOverride: (plan) => {
      providerCompPlanOverrides.set(buildProviderCompPlanKey(plan), plan);
      return plan;
    },
    listProviderOverrides: () => [...providerOverrides.values()],
    saveProviderOverride: (provider) => {
      providerOverrides.set(buildScopedKey(provider.locationSlug, provider.slug), provider);
      return provider;
    },
    listMachineOverrides: () => [...machineOverrides.values()],
    saveMachineOverride: (machine) => {
      machineOverrides.set(buildScopedKey(machine.locationSlug, machine.slug), machine);
      return machine;
    },
    listRoomOverrides: () => [...roomOverrides.values()],
    saveRoomOverride: (room) => {
      roomOverrides.set(buildScopedKey(room.locationSlug, room.slug), room);
      return room;
    },
    listCouponOverrides: () => [...couponOverrides.values()],
    saveCouponOverride: (coupon) => {
      const normalizedCoupon = {
        ...coupon,
        code: normalizeCouponCode(coupon.code),
      };

      couponOverrides.set(
        buildScopedKey(normalizedCoupon.locationSlug, normalizedCoupon.code),
        normalizedCoupon,
      );

      return normalizedCoupon;
    },
    reset: () => {
      organizationOverrides.clear();
      locationOverrides.clear();
      locationScheduleOverrides.clear();
      providerTemplateOverrides.clear();
      providerExceptions.clear();
      machineTemplateOverrides.clear();
      roomTemplateOverrides.clear();
      serviceOverrides.clear();
      educationOfferOverrides.clear();
      servicePackageOverrides.clear();
      membershipPlanOverrides.clear();
      providerCompPlanOverrides.clear();
      providerOverrides.clear();
      machineOverrides.clear();
      roomOverrides.clear();
      couponOverrides.clear();
    },
  };
};

let runtimeStateRepository: RuntimeStateRepository = createInMemoryRuntimeStateRepository();

export const getRuntimeStateRepository = (): RuntimeStateRepository => runtimeStateRepository;

export const resetRuntimeStateRepository = (): void => {
  runtimeStateRepository.reset();
};
