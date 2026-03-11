import type {
  LocationOperatingSchedule,
  MachineResource,
  ProviderResource,
  RoomResource,
} from "./availability";
import type { CatalogService } from "./catalog";
import type { ImportJob } from "./imports";
import type { MembershipPlan } from "./memberships";
import type { TenantContext } from "./tenanting";

export type OnboardingReadinessStatus =
  | "setup_required"
  | "attention_required"
  | "core_ready";

export interface OnboardingChecklistItem {
  key:
    | "organization_assigned"
    | "operating_schedule"
    | "services"
    | "providers"
    | "machines"
    | "rooms"
    | "memberships";
  label: string;
  required: boolean;
  isComplete: boolean;
  detail: string;
}

export interface LocationOnboardingOverview {
  locationSlug: string;
  locationName: string;
  organizationId: string;
  status: OnboardingReadinessStatus;
  enabledModules: string[];
  counts: {
    serviceCount: number;
    providerCount: number;
    machineCount: number;
    roomCount: number;
    membershipPlanCount: number;
    queuedImportJobCount: number;
    failedImportJobCount: number;
  };
  checklist: OnboardingChecklistItem[];
}

export const buildLocationOnboardingOverview = (input: {
  tenant: TenantContext;
  locationSlug: string;
  locationSchedule?: LocationOperatingSchedule;
  services: CatalogService[];
  providers: ProviderResource[];
  machines: MachineResource[];
  rooms: RoomResource[];
  membershipPlans: MembershipPlan[];
  importJobs: ImportJob[];
}): LocationOnboardingOverview => {
  const location = input.tenant.locations.find(
    (locationEntry) => locationEntry.slug === input.locationSlug,
  );
  if (!location) {
    throw new Error(`Location ${input.locationSlug} was not found.`);
  }

  const serviceCount = input.services.filter(
    (service) => service.locationSlug === input.locationSlug,
  ).length;
  const providerCount = input.providers.filter(
    (provider) => provider.locationSlug === input.locationSlug,
  ).length;
  const machineCount = input.machines.filter(
    (machine) => machine.locationSlug === input.locationSlug,
  ).length;
  const roomCount = input.rooms.filter((room) => room.locationSlug === input.locationSlug).length;
  const requiresRooms = input.services.some(
    (service) =>
      service.locationSlug === input.locationSlug && (service.roomCapabilities?.length ?? 0) > 0,
  );
  const membershipPlanCount = input.membershipPlans.filter(
    (plan) => plan.locationSlug === input.locationSlug,
  ).length;
  const locationImportJobs = input.importJobs.filter(
    (importJob) => importJob.locationSlug === input.locationSlug,
  );
  const queuedImportJobCount = locationImportJobs.filter(
    (importJob) => importJob.status === "queued" || importJob.status === "running",
  ).length;
  const failedImportJobCount = locationImportJobs.filter(
    (importJob) => importJob.status === "failed",
  ).length;

  const checklist: OnboardingChecklistItem[] = [
    {
      key: "organization_assigned",
      label: "Organization assigned",
      required: true,
      isComplete: Boolean(location.organizationId),
      detail: location.organizationId
        ? `Organization ${location.organizationId} linked`
        : "Location is not assigned to an organization",
    },
    {
      key: "operating_schedule",
      label: "Operating schedule configured",
      required: true,
      isComplete: Boolean(input.locationSchedule?.availability.length),
      detail: input.locationSchedule?.availability.length
        ? `${input.locationSchedule.availability.length} recurring schedule windows configured`
        : "No operating schedule configured",
    },
    {
      key: "services",
      label: "Services configured",
      required: true,
      isComplete: serviceCount > 0,
      detail: `${serviceCount} services configured`,
    },
    {
      key: "providers",
      label: "Providers configured",
      required: true,
      isComplete: providerCount > 0,
      detail: `${providerCount} providers configured`,
    },
    {
      key: "machines",
      label: "Machines configured",
      required: true,
      isComplete: machineCount > 0,
      detail: `${machineCount} machines configured`,
    },
    {
      key: "rooms",
      label: "Rooms configured",
      required: requiresRooms,
      isComplete: !requiresRooms || roomCount > 0,
      detail: requiresRooms
        ? `${roomCount} rooms configured for room-based services`
        : "No room-based services require dedicated rooms",
    },
    {
      key: "memberships",
      label: "Membership plans configured",
      required: false,
      isComplete: membershipPlanCount > 0,
      detail: `${membershipPlanCount} membership plans configured`,
    },
  ];

  const requiredChecksComplete = checklist
    .filter((check) => check.required)
    .every((check) => check.isComplete);
  const status: OnboardingReadinessStatus =
    failedImportJobCount > 0
      ? "attention_required"
      : requiredChecksComplete
        ? "core_ready"
        : "setup_required";

  return {
    locationSlug: location.slug,
    locationName: location.name,
    organizationId: location.organizationId,
    status,
    enabledModules: location.enabledModules,
    counts: {
      serviceCount,
      providerCount,
      machineCount,
      roomCount,
      membershipPlanCount,
      queuedImportJobCount,
      failedImportJobCount,
    },
    checklist,
  };
};
