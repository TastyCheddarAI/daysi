import type {
  BookingRecord,
  BookingStatus,
  CreditEntry,
  MembershipSubscription,
  MembershipUsageRecord,
  OrderRecord,
  ServicePackagePurchase,
  ServicePackageUsageRecord,
} from "../../../../packages/domain/src";

import {
  findOrderByPaymentIntent,
  getMembershipSubscription,
  getServicePackagePurchase,
  getStoredBooking,
  getStoredOrder,
  hasCreditEntryForOrderAndType,
  hasMembershipUsageRecord,
  hasServicePackageUsageRecord,
  listAllBookings,
  listAllCreditEntries,
  listAllOrders,
  listAllMembershipSubscriptions,
  listAllMembershipUsageRecords,
  listAllServicePackagePurchases,
  listAllServicePackageUsageRecords,
  listBookingsByStatus,
  listCreditEntriesForActor,
  listMembershipSubscriptionsForActor,
  listOrdersForActor,
  listReservationWindows,
  listServicePackagePurchasesForActor,
  reverseMembershipUsageBySourceOrder,
  reverseServicePackageUsageBySourceOrder,
  saveBooking,
  saveCreditEntry,
  saveMembershipSubscription,
  saveMembershipUsageRecord,
  saveOrder,
  saveServicePackagePurchase,
  saveServicePackageUsageRecord,
  updateBooking,
  updateMembershipSubscription,
  updateOrder,
  updateServicePackagePurchase,
} from "../bootstrap-store";

type Awaitable<T> = T | Promise<T>;

export interface StoredBookingRecord {
  booking: BookingRecord;
  managementToken: string;
}

export interface StoredOrderRecord {
  order: OrderRecord;
  managementToken: string;
}

export interface ReservationWindowRecord {
  bookingId: string;
  providerSlug: string;
  machineSlug: string;
  roomSlug?: string;
  startAt: string;
  endAt: string;
}

export interface CommerceRepository {
  bookings: {
    save(booking: BookingRecord, managementToken: string): Awaitable<void>;
    update(booking: BookingRecord): Awaitable<void>;
    getStored(bookingId: string): Awaitable<StoredBookingRecord | undefined>;
    listAll(): Awaitable<BookingRecord[]>;
    listByStatus(status: BookingStatus): Awaitable<BookingRecord[]>;
    listReservationWindows(): Awaitable<ReservationWindowRecord[]>;
  };
  orders: {
    save(order: OrderRecord, managementToken: string): Awaitable<void>;
    update(order: OrderRecord): Awaitable<void>;
    getStored(orderId: string): Awaitable<StoredOrderRecord | undefined>;
    listAll(): Awaitable<OrderRecord[]>;
    listForActor(input: {
      actorUserId?: string;
      actorEmail?: string;
    }): Awaitable<OrderRecord[]>;
    findByPaymentIntent(
      paymentIntentId: string,
    ): Awaitable<StoredOrderRecord | undefined>;
  };
  memberships: {
    saveSubscription(subscription: MembershipSubscription): Awaitable<void>;
    updateSubscription(subscription: MembershipSubscription): Awaitable<void>;
    getSubscription(
      subscriptionId: string,
    ): Awaitable<MembershipSubscription | undefined>;
    listSubscriptionsForActor(input: {
      actorUserId?: string;
      actorEmail?: string;
    }): Awaitable<MembershipSubscription[]>;
    listAllSubscriptions(): Awaitable<MembershipSubscription[]>;
    saveUsageRecord(
      usage: MembershipUsageRecord,
    ): Awaitable<MembershipUsageRecord>;
    listAllUsageRecords(): Awaitable<MembershipUsageRecord[]>;
    hasUsageRecord(input: {
      sourceOrderId: string;
      subscriptionId: string;
      serviceSlug: string;
      bookingId?: string;
    }): Awaitable<boolean>;
    reverseUsageBySourceOrder(
      sourceOrderId: string,
      reverse: (usage: MembershipUsageRecord) => MembershipUsageRecord,
    ): Awaitable<void>;
  };
  packages: {
    savePurchase(purchase: ServicePackagePurchase): Awaitable<void>;
    updatePurchase(purchase: ServicePackagePurchase): Awaitable<void>;
    getPurchase(
      purchaseId: string,
    ): Awaitable<ServicePackagePurchase | undefined>;
    listAllPurchases(): Awaitable<ServicePackagePurchase[]>;
    listPurchasesForActor(input: {
      actorUserId?: string;
      actorEmail?: string;
    }): Awaitable<ServicePackagePurchase[]>;
    saveUsageRecord(
      usage: ServicePackageUsageRecord,
    ): Awaitable<ServicePackageUsageRecord>;
    listAllUsageRecords(): Awaitable<ServicePackageUsageRecord[]>;
    hasUsageRecord(input: {
      sourceOrderId: string;
      packagePurchaseId: string;
      serviceSlug: string;
      bookingId?: string;
    }): Awaitable<boolean>;
    reverseUsageBySourceOrder(
      sourceOrderId: string,
      reverse: (usage: ServicePackageUsageRecord) => ServicePackageUsageRecord,
    ): Awaitable<void>;
  };
  credits: {
    saveEntry(entry: CreditEntry): Awaitable<CreditEntry>;
    listAll(): Awaitable<CreditEntry[]>;
    listForActor(input: {
      actorUserId?: string;
      actorEmail?: string;
    }): Awaitable<CreditEntry[]>;
    hasEntryForOrderAndType(
      sourceOrderId: string,
      type: CreditEntry["type"],
    ): Awaitable<boolean>;
  };
}

export const createInMemoryCommerceRepository = (): CommerceRepository => ({
  bookings: {
    save: (booking, managementToken) => {
      saveBooking(booking, managementToken);
    },
    update: (booking) => {
      updateBooking(booking);
    },
    getStored: getStoredBooking,
    listAll: listAllBookings,
    listByStatus: listBookingsByStatus,
    listReservationWindows,
  },
  orders: {
    save: (order, managementToken) => {
      saveOrder(order, managementToken);
    },
    update: (order) => {
      updateOrder(order);
    },
    getStored: getStoredOrder,
    listAll: listAllOrders,
    listForActor: listOrdersForActor,
    findByPaymentIntent: findOrderByPaymentIntent,
  },
  memberships: {
    saveSubscription: (subscription) => {
      saveMembershipSubscription(subscription);
    },
    updateSubscription: (subscription) => {
      updateMembershipSubscription(subscription);
    },
    getSubscription: getMembershipSubscription,
    listSubscriptionsForActor: listMembershipSubscriptionsForActor,
    listAllSubscriptions: listAllMembershipSubscriptions,
    saveUsageRecord: saveMembershipUsageRecord,
    listAllUsageRecords: listAllMembershipUsageRecords,
    hasUsageRecord: hasMembershipUsageRecord,
    reverseUsageBySourceOrder: reverseMembershipUsageBySourceOrder,
  },
  packages: {
    savePurchase: (purchase) => {
      saveServicePackagePurchase(purchase);
    },
    updatePurchase: (purchase) => {
      updateServicePackagePurchase(purchase);
    },
    getPurchase: getServicePackagePurchase,
    listAllPurchases: listAllServicePackagePurchases,
    listPurchasesForActor: listServicePackagePurchasesForActor,
    saveUsageRecord: saveServicePackageUsageRecord,
    listAllUsageRecords: listAllServicePackageUsageRecords,
    hasUsageRecord: hasServicePackageUsageRecord,
    reverseUsageBySourceOrder: reverseServicePackageUsageBySourceOrder,
  },
  credits: {
    saveEntry: saveCreditEntry,
    listAll: listAllCreditEntries,
    listForActor: listCreditEntriesForActor,
    hasEntryForOrderAndType: hasCreditEntryForOrderAndType,
  },
});
