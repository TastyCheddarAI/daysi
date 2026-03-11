import { randomUUID } from "node:crypto";

import type { BookingRecord } from "./bookings";
import type { OrderRecord } from "./commerce";
import type { AppActor } from "./identity";
import type { MachineResource, ProviderResource, RecurringTimeWindow, TimeWindow } from "./availability";

export interface ProviderCompPlan {
  providerSlug: string;
  locationSlug: string;
  serviceSlug?: string;
  commissionPercent: number;
  appliesToRevenueStream: "services" | "retail" | "mixed";
}

export interface ProviderScheduleException {
  startsAt: string;
  endsAt: string;
  kind: "time_off" | "blackout" | "manual_override";
  note?: string;
}

export interface ResolvedProviderSchedule {
  providerSlug: string;
  providerName: string;
  locationSlug: string;
  template: Array<{
    dayOfWeek: number;
    startMinute: number;
    endMinute: number;
  }>;
  exceptions: ProviderScheduleException[];
}

export interface ProviderPayoutLineItem {
  orderId: string;
  bookingId: string;
  providerSlug: string;
  serviceSlug: string;
  revenueAmountCents: number;
  commissionPercent: number;
  payoutAmountCents: number;
}

export interface ProviderPayoutSummary {
  providerSlug: string;
  providerName: string;
  currency: string;
  totalRevenueAmountCents: number;
  totalPayoutAmountCents: number;
  lineItems: ProviderPayoutLineItem[];
}

export type ProviderPayoutRunStatus = "draft" | "approved" | "paid";

export interface ProviderPayoutRun {
  id: string;
  locationSlug: string;
  currency: string;
  status: ProviderPayoutRunStatus;
  fromDate: string;
  toDate: string;
  providerPayouts: ProviderPayoutSummary[];
  coveredOrderIds: string[];
  createdAt: string;
  createdByUserId?: string;
  approvedAt?: string;
  paidAt?: string;
}

export interface ProviderPerformanceRow {
  providerSlug: string;
  providerName: string;
  bookingCount: number;
  paidServiceRevenueCents: number;
  payoutAmountCents: number;
}

export interface MachineUtilizationRow {
  machineSlug: string;
  machineName: string;
  bookedMinutes: number;
  availableMinutes: number;
  utilizationPercent: number;
}

export interface LocationPerformanceSummary {
  locationSlug: string;
  bookingCount: number;
  paidOrderCount: number;
  paidRevenueCents: number;
}

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

export const resolveProviderForActor = (
  providers: ProviderResource[],
  actor: AppActor | null,
): ProviderResource | undefined => {
  if (!actor || !actor.email) {
    return undefined;
  }

  return providers.find((provider) => provider.email?.toLowerCase() === actor.email?.toLowerCase());
};

export const buildResolvedProviderSchedule = (input: {
  provider: ProviderResource;
  exceptions: ProviderScheduleException[];
}): ResolvedProviderSchedule => ({
  providerSlug: input.provider.slug,
  providerName: input.provider.name,
  locationSlug: input.provider.locationSlug,
  template: input.provider.availability.flatMap((window) =>
    window.daysOfWeek.map((dayOfWeek) => ({
      dayOfWeek,
      startMinute: window.startMinute,
      endMinute: window.endMinute,
    })),
  ),
  exceptions: input.exceptions,
});

const roundCurrency = (amount: number): number => Math.round(amount);

const resolveProviderCompPlan = (input: {
  compPlans: ProviderCompPlan[];
  providerSlug: string;
  locationSlug: string;
  serviceSlug: string;
  revenueStream: "services" | "retail";
}): ProviderCompPlan | undefined => {
  const scopedPlans = input.compPlans.filter(
    (plan) =>
      plan.providerSlug === input.providerSlug && plan.locationSlug === input.locationSlug,
  );
  const matchesRevenueStream = (plan: ProviderCompPlan): boolean =>
    plan.appliesToRevenueStream === input.revenueStream ||
    plan.appliesToRevenueStream === "mixed";

  return (
    scopedPlans.find(
      (plan) => plan.serviceSlug === input.serviceSlug && matchesRevenueStream(plan),
    ) ??
    scopedPlans.find((plan) => !plan.serviceSlug && matchesRevenueStream(plan))
  );
};

export const calculateProviderPayouts = (input: {
  providers: ProviderResource[];
  bookings: BookingRecord[];
  orders: OrderRecord[];
  compPlans: ProviderCompPlan[];
}): ProviderPayoutSummary[] => {
  const paidOrders = input.orders.filter((order) => order.status === "paid");
  const providerBySlug = new Map(input.providers.map((provider) => [provider.slug, provider]));
  const bookingById = new Map(input.bookings.map((booking) => [booking.id, booking]));
  const results = new Map<string, ProviderPayoutSummary>();

  for (const order of paidOrders) {
    for (const lineItem of order.lineItems) {
      if (lineItem.kind !== "booking" || lineItem.revenueStream !== "services") {
        continue;
      }

      const booking = bookingById.get(lineItem.referenceId);
      if (!booking) {
        continue;
      }

      const provider = providerBySlug.get(booking.providerSlug);
      if (!provider) {
        continue;
      }

      const compPlan = resolveProviderCompPlan({
        compPlans: input.compPlans,
        providerSlug: provider.slug,
        locationSlug: booking.locationSlug,
        serviceSlug: booking.serviceSlug,
        revenueStream: "services",
      });

      const commissionPercent = compPlan?.commissionPercent ?? 0;
      const payoutAmountCents = roundCurrency(
        (lineItem.finalAmount.amountCents * commissionPercent) / 100,
      );

      const current =
        results.get(provider.slug) ?? {
          providerSlug: provider.slug,
          providerName: provider.name,
          currency: order.currency,
          totalRevenueAmountCents: 0,
          totalPayoutAmountCents: 0,
          lineItems: [],
        };

      current.totalRevenueAmountCents += lineItem.finalAmount.amountCents;
      current.totalPayoutAmountCents += payoutAmountCents;
      current.lineItems.push({
        orderId: order.id,
        bookingId: booking.id,
        providerSlug: provider.slug,
        serviceSlug: booking.serviceSlug,
        revenueAmountCents: lineItem.finalAmount.amountCents,
        commissionPercent,
        payoutAmountCents,
      });
      results.set(provider.slug, current);
    }
  }

  return [...results.values()].sort((left, right) =>
    left.providerName.localeCompare(right.providerName),
  );
};

export const createProviderPayoutRun = (input: {
  locationSlug: string;
  fromDate: string;
  toDate: string;
  providers: ProviderResource[];
  bookings: BookingRecord[];
  orders: OrderRecord[];
  compPlans: ProviderCompPlan[];
  createdByUserId?: string;
  existingCoveredOrderIds?: string[];
  now?: string;
}): ProviderPayoutRun => {
  const existingCoveredOrderIds = new Set(input.existingCoveredOrderIds ?? []);
  const eligibleOrders = input.orders.filter((order) => {
    if (order.locationSlug !== input.locationSlug || order.status !== "paid") {
      return false;
    }

    const paidDate = (order.paidAt ?? order.createdAt).slice(0, 10);
    if (paidDate < input.fromDate || paidDate > input.toDate) {
      return false;
    }

    return !existingCoveredOrderIds.has(order.id);
  });

  const providerPayouts = calculateProviderPayouts({
    providers: input.providers.filter((provider) => provider.locationSlug === input.locationSlug),
    bookings: input.bookings.filter((booking) => booking.locationSlug === input.locationSlug),
    orders: eligibleOrders,
    compPlans: input.compPlans.filter((plan) => plan.locationSlug === input.locationSlug),
  });

  if (providerPayouts.length === 0) {
    throw new Error("No eligible provider payouts were found for this run.");
  }

  const coveredOrderIds = [...new Set(
    providerPayouts.flatMap((payout) => payout.lineItems.map((lineItem) => lineItem.orderId)),
  )];
  if (coveredOrderIds.length === 0) {
    throw new Error("Provider payout run cannot be created without covered orders.");
  }

  return {
    id: `prun_${randomUUID()}`,
    locationSlug: input.locationSlug,
    currency: providerPayouts[0]?.currency ?? "CAD",
    status: "draft",
    fromDate: input.fromDate,
    toDate: input.toDate,
    providerPayouts,
    coveredOrderIds,
    createdAt: input.now ?? new Date().toISOString(),
    createdByUserId: input.createdByUserId,
  };
};

export const approveProviderPayoutRun = (
  payoutRun: ProviderPayoutRun,
  now = new Date().toISOString(),
): ProviderPayoutRun => {
  if (payoutRun.status !== "draft") {
    throw new Error("Only draft payout runs can be approved.");
  }

  return {
    ...payoutRun,
    status: "approved",
    approvedAt: now,
  };
};

export const markProviderPayoutRunPaid = (
  payoutRun: ProviderPayoutRun,
  now = new Date().toISOString(),
): ProviderPayoutRun => {
  if (payoutRun.status !== "approved") {
    throw new Error("Only approved payout runs can be marked paid.");
  }

  return {
    ...payoutRun,
    status: "paid",
    paidAt: now,
  };
};

export const buildProviderPerformanceReport = (input: {
  providers: ProviderResource[];
  bookings: BookingRecord[];
  payouts: ProviderPayoutSummary[];
}): ProviderPerformanceRow[] => {
  const payoutByProviderSlug = new Map(
    input.payouts.map((payout) => [payout.providerSlug, payout]),
  );

  return input.providers.map((provider) => {
    const providerBookings = input.bookings.filter(
      (booking) => booking.providerSlug === provider.slug,
    );
    const payout = payoutByProviderSlug.get(provider.slug);

    return {
      providerSlug: provider.slug,
      providerName: provider.name,
      bookingCount: providerBookings.length,
      paidServiceRevenueCents: payout?.totalRevenueAmountCents ?? 0,
      payoutAmountCents: payout?.totalPayoutAmountCents ?? 0,
    };
  });
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const minutesBetween = (startAt: string, endAt: string): number =>
  Math.max(
    0,
    Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / (60 * 1000)),
  );

const availableMinutesForRange = (windows: RecurringTimeWindow[], fromDate: string, toDate: string): number => {
  const start = new Date(`${fromDate}T00:00:00.000Z`);
  const end = new Date(`${toDate}T00:00:00.000Z`);
  const totals: number[] = [];

  for (let current = start.getTime(); current <= end.getTime(); current += DAY_IN_MS) {
    const date = new Date(current);
    const dayOfWeek = date.getUTCDay();
    totals.push(
      sum(
        windows
          .filter((window) => window.daysOfWeek.includes(dayOfWeek))
          .map((window) => window.endMinute - window.startMinute),
      ),
    );
  }

  return sum(totals);
};

export const buildUtilizationReport = (input: {
  locationSlug: string;
  fromDate: string;
  toDate: string;
  machines: MachineResource[];
  bookings: BookingRecord[];
  orders: OrderRecord[];
}): { machines: MachineUtilizationRow[]; location: LocationPerformanceSummary } => {
  const machineRows = input.machines
    .filter((machine) => machine.locationSlug === input.locationSlug)
    .map((machine) => {
      const machineBookings = input.bookings.filter(
        (booking) =>
          booking.locationSlug === input.locationSlug &&
          booking.machineSlug === machine.slug &&
          booking.status === "confirmed",
      );
      const bookedMinutes = sum(
        machineBookings.map((booking) => minutesBetween(booking.startAt, booking.endAt)),
      );
      const availableMinutes = availableMinutesForRange(
        machine.availability,
        input.fromDate,
        input.toDate,
      );

      return {
        machineSlug: machine.slug,
        machineName: machine.name,
        bookedMinutes,
        availableMinutes,
        utilizationPercent:
          availableMinutes === 0 ? 0 : Number(((bookedMinutes / availableMinutes) * 100).toFixed(2)),
      };
    });

  const paidOrders = input.orders.filter(
    (order) => order.locationSlug === input.locationSlug && order.status === "paid",
  );

  return {
    machines: machineRows,
    location: {
      locationSlug: input.locationSlug,
      bookingCount: input.bookings.filter((booking) => booking.locationSlug === input.locationSlug)
        .length,
      paidOrderCount: paidOrders.length,
      paidRevenueCents: sum(paidOrders.map((order) => order.totalAmount.amountCents)),
    },
  };
};

export const mapScheduleExceptionsToBlockedWindows = (
  exceptions: ProviderScheduleException[],
): TimeWindow[] =>
  exceptions.map((exception) => ({
    startAt: exception.startsAt,
    endAt: exception.endsAt,
  }));
