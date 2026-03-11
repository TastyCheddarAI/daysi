import type {
  AdminActionLogEntry,
  AiRunRecord,
  BookingRecord,
  BookingStatus,
  CreditEntry,
  CustomerEventRecord,
  CustomerNote,
  CustomerTag,
  ImportJob,
  ImportMappingProfile,
  LearningEntitlement,
  LearningEnrollment,
  LearningCertificate,
  LessonProgressRecord,
  ProviderPayoutRun,
  ReconciliationIssue,
  AccessAssignment,
  MembershipUsageRecord,
  OperationalMetricEventRecord,
  MembershipSubscription,
  ServicePackagePurchase,
  ServicePackageUsageRecord,
  OrderRecord,
  ReferralCode,
  ReferralProgram,
  ReferralRelationship,
  ReferralRewardEvent,
  SupportCase,
  SupportCaseEvent,
  SkinAssessmentIntakeRecord,
  SkinAssessmentRecord,
  TenantSetting,
  TreatmentPlanRecord,
  WaitlistEntryRecord,
} from "../../../packages/domain/src";

interface StoredBooking {
  booking: BookingRecord;
  managementToken: string;
}

interface StoredOrder {
  order: OrderRecord;
  managementToken: string;
}

interface StoredWaitlistEntry {
  waitlistEntry: WaitlistEntryRecord;
  managementToken: string;
}

interface StoredIdempotencyResponse {
  statusCode: number;
  payload: unknown;
}

const bookings = new Map<string, StoredBooking>();
const creditEntries = new Map<string, CreditEntry>();
const customerEvents = new Map<string, CustomerEventRecord>();
const customerNotes = new Map<string, CustomerNote>();
const customerTags = new Map<string, CustomerTag>();
const membershipUsageRecords = new Map<string, MembershipUsageRecord>();
const servicePackagePurchases = new Map<string, ServicePackagePurchase>();
const servicePackageUsageRecords = new Map<string, ServicePackageUsageRecord>();
const orders = new Map<string, StoredOrder>();
const providerPayoutRuns = new Map<string, ProviderPayoutRun>();
const accessAssignments = new Map<string, AccessAssignment>();
const adminActionLogEntries = new Map<string, AdminActionLogEntry>();
const aiRuns = new Map<string, AiRunRecord>();
const importJobs = new Map<string, ImportJob>();
const importMappingProfiles = new Map<string, ImportMappingProfile>();
const reconciliationIssues = new Map<string, ReconciliationIssue>();
const learningEntitlements = new Map<string, LearningEntitlement>();
const learningEnrollments = new Map<string, LearningEnrollment>();
const learningCertificates = new Map<string, LearningCertificate>();
const lessonProgressRecords = new Map<string, LessonProgressRecord>();
const membershipSubscriptions = new Map<string, MembershipSubscription>();
const operationalMetricEvents = new Map<string, OperationalMetricEventRecord>();
const referralPrograms = new Map<string, ReferralProgram>();
const referralCodes = new Map<string, ReferralCode>();
const referralRelationships = new Map<string, ReferralRelationship>();
const referralRewardEvents = new Map<string, ReferralRewardEvent>();
const supportCases = new Map<string, SupportCase>();
const supportCaseEvents = new Map<string, SupportCaseEvent>();
const skinAssessmentIntakes = new Map<string, SkinAssessmentIntakeRecord>();
const skinAssessmentRecords = new Map<string, SkinAssessmentRecord>();
const tenantSettings = new Map<string, TenantSetting>();
const treatmentPlans = new Map<string, TreatmentPlanRecord>();
const waitlistEntries = new Map<string, StoredWaitlistEntry>();
const idempotentResponses = new Map<string, StoredIdempotencyResponse>();
const processedStripeEvents = new Set<string>();

export const saveBooking = (booking: BookingRecord, managementToken: string): void => {
  bookings.set(booking.id, {
    booking,
    managementToken,
  });
};

export const updateBooking = (booking: BookingRecord): void => {
  const existing = bookings.get(booking.id);
  if (!existing) {
    throw new Error("Booking not found in bootstrap store.");
  }

  bookings.set(booking.id, {
    ...existing,
    booking,
  });
};

export const getStoredBooking = (bookingId: string): StoredBooking | undefined =>
  bookings.get(bookingId);

export const listReservationWindows = (): Array<{
  bookingId: string;
  providerSlug: string;
  machineSlug: string;
  roomSlug?: string;
  startAt: string;
  endAt: string;
}> =>
  [...bookings.values()]
    .map((entry) => entry.booking)
    .filter((booking) => booking.status === "confirmed")
    .map((booking) => ({
      bookingId: booking.id,
      providerSlug: booking.providerSlug,
      machineSlug: booking.machineSlug,
      roomSlug: booking.roomSlug,
      startAt: booking.startAt,
      endAt: booking.endAt,
    }));

export const canManageBooking = (input: {
  bookingId: string;
  actorUserId?: string;
  actorRoles?: string[];
  managementToken?: string;
}): boolean => {
  const stored = bookings.get(input.bookingId);
  if (!stored) {
    return false;
  }

  if (input.actorRoles?.some((role) => ["staff", "admin", "owner"].includes(role))) {
    return true;
  }

  if (input.actorUserId && stored.booking.actorUserId === input.actorUserId) {
    return true;
  }

  if (input.managementToken && stored.managementToken === input.managementToken) {
    return true;
  }

  return false;
};

export const rememberIdempotentResponse = (
  scope: string,
  key: string,
  response: StoredIdempotencyResponse,
): void => {
  idempotentResponses.set(`${scope}::${key}`, response);
};

export const recallIdempotentResponse = (
  scope: string,
  key: string,
): StoredIdempotencyResponse | undefined =>
  idempotentResponses.get(`${scope}::${key}`);

export const listBookingsByStatus = (status: BookingStatus): BookingRecord[] =>
  [...bookings.values()]
    .map((entry) => entry.booking)
    .filter((booking) => booking.status === status);

export const listAllBookings = (): BookingRecord[] =>
  [...bookings.values()].map((entry) => entry.booking);

export const saveWaitlistEntry = (
  waitlistEntry: WaitlistEntryRecord,
  managementToken: string,
): void => {
  waitlistEntries.set(waitlistEntry.id, {
    waitlistEntry,
    managementToken,
  });
};

export const updateWaitlistEntry = (waitlistEntry: WaitlistEntryRecord): void => {
  const existing = waitlistEntries.get(waitlistEntry.id);
  if (!existing) {
    throw new Error("Waitlist entry not found in bootstrap store.");
  }

  waitlistEntries.set(waitlistEntry.id, {
    ...existing,
    waitlistEntry,
  });
};

export const getStoredWaitlistEntry = (
  waitlistEntryId: string,
): StoredWaitlistEntry | undefined => waitlistEntries.get(waitlistEntryId);

export const listAllWaitlistEntries = (): WaitlistEntryRecord[] =>
  [...waitlistEntries.values()]
    .map((entry) => entry.waitlistEntry)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

export const listWaitlistEntriesForActor = (input: {
  actorUserId?: string;
  actorEmail?: string;
}): WaitlistEntryRecord[] => {
  const actorEmail = input.actorEmail?.toLowerCase();

  return listAllWaitlistEntries().filter(
    (entry) =>
      (input.actorUserId && entry.actorUserId === input.actorUserId) ||
      (actorEmail && entry.customer.email.toLowerCase() === actorEmail),
  );
};

export const canManageWaitlistEntry = (input: {
  waitlistEntryId: string;
  actorUserId?: string;
  actorEmail?: string;
  managementToken?: string;
}): boolean => {
  const stored = waitlistEntries.get(input.waitlistEntryId);
  if (!stored) {
    return false;
  }

  if (input.actorUserId && stored.waitlistEntry.actorUserId === input.actorUserId) {
    return true;
  }

  if (
    input.actorEmail &&
    stored.waitlistEntry.customer.email.toLowerCase() === input.actorEmail.toLowerCase()
  ) {
    return true;
  }

  if (input.managementToken && stored.managementToken === input.managementToken) {
    return true;
  }

  return false;
};

export const saveServicePackagePurchase = (
  purchase: ServicePackagePurchase,
): void => {
  servicePackagePurchases.set(purchase.id, purchase);
};

export const updateServicePackagePurchase = (
  purchase: ServicePackagePurchase,
): void => {
  servicePackagePurchases.set(purchase.id, purchase);
};

export const getServicePackagePurchase = (
  purchaseId: string,
): ServicePackagePurchase | undefined => servicePackagePurchases.get(purchaseId);

export const listAllServicePackagePurchases = (): ServicePackagePurchase[] =>
  [...servicePackagePurchases.values()];

export const listServicePackagePurchasesForActor = (input: {
  actorUserId?: string;
  actorEmail?: string;
}): ServicePackagePurchase[] =>
  [...servicePackagePurchases.values()].filter(
    (purchase) =>
      (input.actorUserId && purchase.actorUserId === input.actorUserId) ||
      (input.actorEmail && purchase.customerEmail === input.actorEmail),
  );

export const saveServicePackageUsageRecord = (
  usage: ServicePackageUsageRecord,
): ServicePackageUsageRecord => {
  servicePackageUsageRecords.set(usage.id, usage);
  return usage;
};

export const updateServicePackageUsageRecord = (
  usage: ServicePackageUsageRecord,
): void => {
  servicePackageUsageRecords.set(usage.id, usage);
};

export const listAllServicePackageUsageRecords = (): ServicePackageUsageRecord[] =>
  [...servicePackageUsageRecords.values()];

export const hasServicePackageUsageRecord = (input: {
  sourceOrderId: string;
  packagePurchaseId: string;
  serviceSlug: string;
  bookingId?: string;
}): boolean =>
  [...servicePackageUsageRecords.values()].some(
    (usage) =>
      usage.sourceOrderId === input.sourceOrderId &&
      usage.packagePurchaseId === input.packagePurchaseId &&
      usage.serviceSlug === input.serviceSlug &&
      usage.bookingId === input.bookingId &&
      usage.status === "consumed",
  );

export const reverseServicePackageUsageBySourceOrder = (
  sourceOrderId: string,
  reverse: (usage: ServicePackageUsageRecord) => ServicePackageUsageRecord,
): void => {
  for (const usage of servicePackageUsageRecords.values()) {
    if (usage.sourceOrderId !== sourceOrderId || usage.status !== "consumed") {
      continue;
    }

    servicePackageUsageRecords.set(usage.id, reverse(usage));
  }
};

export const saveOrder = (order: OrderRecord, managementToken: string): void => {
  orders.set(order.id, {
    order,
    managementToken,
  });
};

export const updateOrder = (order: OrderRecord): void => {
  const existing = orders.get(order.id);
  if (!existing) {
    throw new Error("Order not found in bootstrap store.");
  }

  orders.set(order.id, {
    ...existing,
    order,
  });
};

export const getStoredOrder = (orderId: string): StoredOrder | undefined => orders.get(orderId);

export const saveCustomerEvent = (event: CustomerEventRecord): void => {
  customerEvents.set(event.id, event);
};

export const saveSkinAssessmentIntake = (intake: SkinAssessmentIntakeRecord): void => {
  skinAssessmentIntakes.set(intake.id, intake);
};

export const getSkinAssessmentIntake = (
  intakeId: string,
): SkinAssessmentIntakeRecord | undefined => skinAssessmentIntakes.get(intakeId);

export const findSkinAssessmentIntakeByEvent = (input: {
  locationSlug: string;
  sourceApp: string;
  eventId: string;
}): SkinAssessmentIntakeRecord | undefined =>
  [...skinAssessmentIntakes.values()].find(
    (intake) =>
      intake.locationSlug === input.locationSlug &&
      intake.sourceApp === input.sourceApp &&
      intake.eventId === input.eventId,
  );

export const listSkinAssessmentIntakes = (
  locationSlug?: string,
): SkinAssessmentIntakeRecord[] =>
  [...skinAssessmentIntakes.values()]
    .filter((intake) => (locationSlug ? intake.locationSlug === locationSlug : true))
    .sort((left, right) => right.receivedAt.localeCompare(left.receivedAt));

export const saveSkinAssessmentRecord = (assessment: SkinAssessmentRecord): void => {
  skinAssessmentRecords.set(assessment.id, assessment);
};

export const getSkinAssessmentRecord = (
  assessmentId: string,
): SkinAssessmentRecord | undefined => skinAssessmentRecords.get(assessmentId);

export const getSkinAssessmentRecordByRawIntakeId = (
  rawIntakeId: string,
): SkinAssessmentRecord | undefined =>
  [...skinAssessmentRecords.values()].find((assessment) => assessment.rawIntakeId === rawIntakeId);

export const listSkinAssessmentRecords = (
  locationSlug?: string,
): SkinAssessmentRecord[] =>
  [...skinAssessmentRecords.values()]
    .filter((assessment) => (locationSlug ? assessment.locationSlug === locationSlug : true))
    .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt));

export const listCustomerEvents = (): CustomerEventRecord[] =>
  [...customerEvents.values()].sort((left, right) =>
    right.occurredAt.localeCompare(left.occurredAt),
  );

export const saveCustomerNote = (note: CustomerNote): void => {
  customerNotes.set(note.id, note);
};

export const updateCustomerNote = (note: CustomerNote): void => {
  customerNotes.set(note.id, note);
};

export const getCustomerNote = (noteId: string): CustomerNote | undefined =>
  customerNotes.get(noteId);

export const listCustomerNotes = (): CustomerNote[] =>
  [...customerNotes.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

export const saveCustomerTag = (tag: CustomerTag): void => {
  customerTags.set(tag.id, tag);
};

export const getCustomerTag = (tagId: string): CustomerTag | undefined => customerTags.get(tagId);

export const deleteCustomerTag = (tagId: string): void => {
  customerTags.delete(tagId);
};

export const listCustomerTags = (): CustomerTag[] =>
  [...customerTags.values()].sort((left, right) => left.label.localeCompare(right.label));

export const saveProviderPayoutRun = (payoutRun: ProviderPayoutRun): void => {
  providerPayoutRuns.set(payoutRun.id, payoutRun);
};

export const updateProviderPayoutRun = (payoutRun: ProviderPayoutRun): void => {
  providerPayoutRuns.set(payoutRun.id, payoutRun);
};

export const getProviderPayoutRun = (
  payoutRunId: string,
): ProviderPayoutRun | undefined => providerPayoutRuns.get(payoutRunId);

export const listProviderPayoutRuns = (): ProviderPayoutRun[] =>
  [...providerPayoutRuns.values()].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );

export const listCoveredOrderIdsForLocation = (locationSlug: string): string[] =>
  [...new Set(
    listProviderPayoutRuns()
      .filter((payoutRun) => payoutRun.locationSlug === locationSlug)
      .flatMap((payoutRun) => payoutRun.coveredOrderIds),
  )];

export const saveAccessAssignment = (assignment: AccessAssignment): void => {
  accessAssignments.set(assignment.id, assignment);
};

export const updateAccessAssignment = (assignment: AccessAssignment): void => {
  accessAssignments.set(assignment.id, assignment);
};

export const getAccessAssignment = (
  assignmentId: string,
): AccessAssignment | undefined => accessAssignments.get(assignmentId);

export const deleteAccessAssignment = (assignmentId: string): void => {
  accessAssignments.delete(assignmentId);
};

export const listAccessAssignments = (): AccessAssignment[] =>
  [...accessAssignments.values()].sort((left, right) =>
    left.email.localeCompare(right.email),
  );

export const findAccessAssignmentByEmailAndRole = (input: {
  email?: string;
  role: AccessAssignment["role"];
}): AccessAssignment | undefined => {
  if (!input.email) {
    return undefined;
  }

  return listAccessAssignments().find(
    (assignment) =>
      assignment.role === input.role &&
      assignment.email.toLowerCase() === input.email?.toLowerCase(),
  );
};

export const saveAdminActionLogEntry = (entry: AdminActionLogEntry): void => {
  adminActionLogEntries.set(entry.id, entry);
};

export const saveOperationalMetricEvent = (
  event: OperationalMetricEventRecord,
): void => {
  operationalMetricEvents.set(event.id, event);
};

export const listOperationalMetricEvents = (): OperationalMetricEventRecord[] =>
  [...operationalMetricEvents.values()].sort((left, right) =>
    right.occurredAt.localeCompare(left.occurredAt),
  );

export const hasOperationalMetricEvent = (input: {
  eventType: OperationalMetricEventRecord["eventType"];
  sourceOrderId?: string;
  referenceId?: string;
}): boolean =>
  [...operationalMetricEvents.values()].some(
    (event) =>
      event.eventType === input.eventType &&
      event.sourceOrderId === input.sourceOrderId &&
      event.referenceId === input.referenceId,
  );

export const saveAiRun = (run: AiRunRecord): void => {
  aiRuns.set(run.id, run);
};

export const listAiRuns = (): AiRunRecord[] =>
  [...aiRuns.values()].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );

export const listAdminActionLogEntries = (): AdminActionLogEntry[] =>
  [...adminActionLogEntries.values()].sort((left, right) =>
    right.occurredAt.localeCompare(left.occurredAt),
  );

export const saveImportJob = (importJob: ImportJob): void => {
  importJobs.set(importJob.id, importJob);
};

export const updateImportJob = (importJob: ImportJob): void => {
  importJobs.set(importJob.id, importJob);
};

export const getImportJob = (importJobId: string): ImportJob | undefined =>
  importJobs.get(importJobId);

export const listImportJobs = (): ImportJob[] =>
  [...importJobs.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));

export const saveImportMappingProfile = (profile: ImportMappingProfile): void => {
  importMappingProfiles.set(profile.id, profile);
};

export const getImportMappingProfile = (
  profileId: string,
): ImportMappingProfile | undefined => importMappingProfiles.get(profileId);

export const listImportMappingProfiles = (locationSlug?: string): ImportMappingProfile[] =>
  [...importMappingProfiles.values()]
    .filter((profile) => (locationSlug ? profile.locationSlug === locationSlug : true))
    .sort((left, right) => left.name.localeCompare(right.name));

export const saveReconciliationIssue = (issue: ReconciliationIssue): void => {
  reconciliationIssues.set(issue.id, issue);
};

export const getReconciliationIssue = (
  issueId: string,
): ReconciliationIssue | undefined => reconciliationIssues.get(issueId);

export const listReconciliationIssues = (importJobId?: string): ReconciliationIssue[] =>
  [...reconciliationIssues.values()]
    .filter((issue) => (importJobId ? issue.importJobId === importJobId : true))
    .sort((left, right) => left.rowNumber - right.rowNumber);

export const saveReferralProgram = (program: ReferralProgram): void => {
  referralPrograms.set(program.id, program);
};

export const getReferralProgram = (
  programId: string,
): ReferralProgram | undefined => referralPrograms.get(programId);

export const listReferralPrograms = (locationSlug?: string): ReferralProgram[] =>
  [...referralPrograms.values()]
    .filter((program) => (locationSlug ? program.locationSlug === locationSlug : true))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

export const saveReferralCode = (code: ReferralCode): void => {
  referralCodes.set(code.id, code);
};

export const listReferralCodes = (locationSlug?: string): ReferralCode[] =>
  [...referralCodes.values()]
    .filter((code) => (locationSlug ? code.locationSlug === locationSlug : true))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

export const saveReferralRelationship = (relationship: ReferralRelationship): void => {
  referralRelationships.set(relationship.id, relationship);
};

export const updateReferralRelationship = (relationship: ReferralRelationship): void => {
  referralRelationships.set(relationship.id, relationship);
};

export const listReferralRelationships = (
  locationSlug?: string,
): ReferralRelationship[] =>
  [...referralRelationships.values()]
    .filter((relationship) =>
      locationSlug ? relationship.locationSlug === locationSlug : true,
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

export const saveReferralRewardEvent = (event: ReferralRewardEvent): void => {
  referralRewardEvents.set(event.id, event);
};

export const listReferralRewardEvents = (
  locationSlug?: string,
): ReferralRewardEvent[] =>
  [...referralRewardEvents.values()]
    .filter((event) => (locationSlug ? event.locationSlug === locationSlug : true))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

export const saveSupportCase = (supportCase: SupportCase): void => {
  supportCases.set(supportCase.id, supportCase);
};

export const updateSupportCase = (supportCase: SupportCase): void => {
  supportCases.set(supportCase.id, supportCase);
};

export const getSupportCase = (supportCaseId: string): SupportCase | undefined =>
  supportCases.get(supportCaseId);

export const listSupportCases = (): SupportCase[] =>
  [...supportCases.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

export const saveSupportCaseEvent = (event: SupportCaseEvent): void => {
  supportCaseEvents.set(event.id, event);
};

export const listSupportCaseEvents = (supportCaseId: string): SupportCaseEvent[] =>
  [...supportCaseEvents.values()]
    .filter((event) => event.supportCaseId === supportCaseId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

const buildTenantSettingKey = (locationSlug: string, key: string): string =>
  `${locationSlug}::${key}`;

export const saveTenantSetting = (setting: TenantSetting): void => {
  tenantSettings.set(buildTenantSettingKey(setting.locationSlug, setting.key), setting);
};

export const getTenantSetting = (
  locationSlug: string,
  key: string,
): TenantSetting | undefined => tenantSettings.get(buildTenantSettingKey(locationSlug, key));

export const listTenantSettings = (locationSlug?: string): TenantSetting[] =>
  [...tenantSettings.values()]
    .filter((setting) => (locationSlug ? setting.locationSlug === locationSlug : true))
    .sort((left, right) => left.key.localeCompare(right.key));

export const saveTreatmentPlan = (treatmentPlan: TreatmentPlanRecord): void => {
  treatmentPlans.set(treatmentPlan.id, treatmentPlan);
};

export const updateTreatmentPlan = (treatmentPlan: TreatmentPlanRecord): void => {
  treatmentPlans.set(treatmentPlan.id, treatmentPlan);
};

export const getTreatmentPlan = (
  treatmentPlanId: string,
): TreatmentPlanRecord | undefined => treatmentPlans.get(treatmentPlanId);

export const listTreatmentPlans = (locationSlug?: string): TreatmentPlanRecord[] =>
  [...treatmentPlans.values()]
    .filter((treatmentPlan) =>
      locationSlug ? treatmentPlan.locationSlug === locationSlug : true,
    )
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

export const saveCreditEntry = (entry: CreditEntry): CreditEntry => {
  creditEntries.set(entry.id, entry);
  return entry;
};

export const saveMembershipUsageRecord = (
  usage: MembershipUsageRecord,
): MembershipUsageRecord => {
  membershipUsageRecords.set(usage.id, usage);
  return usage;
};

export const updateMembershipUsageRecord = (usage: MembershipUsageRecord): void => {
  membershipUsageRecords.set(usage.id, usage);
};

export const listAllCreditEntries = (): CreditEntry[] =>
  [...creditEntries.values()];

export const listAllMembershipUsageRecords = (): MembershipUsageRecord[] =>
  [...membershipUsageRecords.values()];

export const listCreditEntriesForActor = (input: {
  actorUserId?: string;
  actorEmail?: string;
}): CreditEntry[] =>
  [...creditEntries.values()].filter(
    (entry) =>
      (input.actorUserId && entry.actorUserId === input.actorUserId) ||
      (input.actorEmail && entry.customerEmail === input.actorEmail),
  );

export const hasCreditEntryForOrderAndType = (
  sourceOrderId: string,
  type: CreditEntry["type"],
): boolean =>
  [...creditEntries.values()].some(
    (entry) => entry.sourceOrderId === sourceOrderId && entry.type === type,
  );

export const hasMembershipUsageRecord = (input: {
  sourceOrderId: string;
  subscriptionId: string;
  serviceSlug: string;
  bookingId?: string;
}): boolean =>
  [...membershipUsageRecords.values()].some(
    (usage) =>
      usage.sourceOrderId === input.sourceOrderId &&
      usage.subscriptionId === input.subscriptionId &&
      usage.serviceSlug === input.serviceSlug &&
      usage.bookingId === input.bookingId &&
      usage.status === "consumed",
  );

export const reverseMembershipUsageBySourceOrder = (
  sourceOrderId: string,
  reverse: (usage: MembershipUsageRecord) => MembershipUsageRecord,
): void => {
  for (const usage of membershipUsageRecords.values()) {
    if (usage.sourceOrderId !== sourceOrderId || usage.status !== "consumed") {
      continue;
    }

    membershipUsageRecords.set(usage.id, reverse(usage));
  }
};

export const canManageOrder = (input: {
  orderId: string;
  actorUserId?: string;
  actorRoles?: string[];
  managementToken?: string;
}): boolean => {
  const stored = orders.get(input.orderId);
  if (!stored) {
    return false;
  }

  if (input.actorRoles?.some((role) => ["staff", "admin", "owner"].includes(role))) {
    return true;
  }

  if (input.actorUserId && stored.order.actorUserId === input.actorUserId) {
    return true;
  }

  if (input.managementToken && stored.managementToken === input.managementToken) {
    return true;
  }

  return false;
};

export const listOrdersForActor = (input: {
  actorUserId?: string;
  actorEmail?: string;
}): OrderRecord[] =>
  [...orders.values()]
    .map((entry) => entry.order)
    .filter(
      (order) =>
      (input.actorUserId && order.actorUserId === input.actorUserId) ||
      (input.actorEmail && order.customer.email === input.actorEmail),
    );

export const listAllOrders = (): OrderRecord[] =>
  [...orders.values()].map((entry) => entry.order);

export const saveLearningEntitlement = (
  entitlement: LearningEntitlement,
): LearningEntitlement => {
  const existing = [...learningEntitlements.values()].find(
    (entry) =>
      entry.status === "active" &&
      entry.customerEmail === entitlement.customerEmail &&
      entry.educationOfferSlug === entitlement.educationOfferSlug,
  );

  if (existing) {
    return existing;
  }

  learningEntitlements.set(entitlement.id, entitlement);
  return entitlement;
};

export const updateLearningEntitlement = (
  entitlement: LearningEntitlement,
): void => {
  learningEntitlements.set(entitlement.id, entitlement);
};

export const listLearningEntitlementsForActor = (input: {
  actorUserId?: string;
  actorEmail?: string;
}): LearningEntitlement[] =>
  [...learningEntitlements.values()].filter(
    (entitlement) =>
      entitlement.status === "active" &&
      ((input.actorUserId && entitlement.actorUserId === input.actorUserId) ||
        (input.actorEmail && entitlement.customerEmail === input.actorEmail)),
  );

export const listAllLearningEntitlements = (): LearningEntitlement[] =>
  [...learningEntitlements.values()];

export const saveLearningEnrollment = (enrollment: LearningEnrollment): void => {
  learningEnrollments.set(enrollment.id, enrollment);
};

export const updateLearningEnrollment = (enrollment: LearningEnrollment): void => {
  learningEnrollments.set(enrollment.id, enrollment);
};

export const getLearningEnrollment = (
  enrollmentId: string,
): LearningEnrollment | undefined => learningEnrollments.get(enrollmentId);

export const listLearningEnrollments = (): LearningEnrollment[] =>
  [...learningEnrollments.values()].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );

export const saveLessonProgressRecord = (progress: LessonProgressRecord): void => {
  lessonProgressRecords.set(progress.id, progress);
};

export const updateLessonProgressRecord = (progress: LessonProgressRecord): void => {
  lessonProgressRecords.set(progress.id, progress);
};

export const listLessonProgressRecords = (
  enrollmentId?: string,
): LessonProgressRecord[] =>
  [...lessonProgressRecords.values()]
    .filter((progress) => (enrollmentId ? progress.enrollmentId === enrollmentId : true))
    .sort((left, right) => left.moduleSlug.localeCompare(right.moduleSlug));

export const saveLearningCertificate = (certificate: LearningCertificate): void => {
  learningCertificates.set(certificate.id, certificate);
};

export const listLearningCertificates = (): LearningCertificate[] =>
  [...learningCertificates.values()].sort((left, right) =>
    right.issuedAt.localeCompare(left.issuedAt),
  );

export const revokeLearningEntitlementsBySourceOrder = (
  sourceOrderId: string,
  revoke: (entitlement: LearningEntitlement) => LearningEntitlement,
): void => {
  for (const entitlement of learningEntitlements.values()) {
    if (entitlement.status !== "active" || entitlement.sourceOrderId !== sourceOrderId) {
      continue;
    }

    learningEntitlements.set(entitlement.id, revoke(entitlement));
  }
};

export const findOrderByPaymentIntent = (
  paymentIntentId: string,
): StoredOrder | undefined =>
  [...orders.values()].find((entry) => entry.order.paymentIntentId === paymentIntentId);

export const saveMembershipSubscription = (subscription: MembershipSubscription): void => {
  membershipSubscriptions.set(subscription.id, subscription);
};

export const updateMembershipSubscription = (subscription: MembershipSubscription): void => {
  membershipSubscriptions.set(subscription.id, subscription);
};

export const getMembershipSubscription = (
  subscriptionId: string,
): MembershipSubscription | undefined => membershipSubscriptions.get(subscriptionId);

export const listMembershipSubscriptionsForActor = (input: {
  actorUserId?: string;
  actorEmail?: string;
}): MembershipSubscription[] =>
  [...membershipSubscriptions.values()].filter(
    (subscription) =>
      (input.actorUserId && subscription.actorUserId === input.actorUserId) ||
      (input.actorEmail && subscription.customerEmail === input.actorEmail),
  );

export const listAllMembershipSubscriptions = (): MembershipSubscription[] =>
  [...membershipSubscriptions.values()];

export const hasProcessedStripeEvent = (eventId: string): boolean =>
  processedStripeEvents.has(eventId);

export const markStripeEventProcessed = (eventId: string): void => {
  processedStripeEvents.add(eventId);
};

export const resetBootstrapStore = (): void => {
  bookings.clear();
  creditEntries.clear();
  customerEvents.clear();
  customerNotes.clear();
  customerTags.clear();
  membershipUsageRecords.clear();
  servicePackagePurchases.clear();
  servicePackageUsageRecords.clear();
  orders.clear();
  providerPayoutRuns.clear();
  accessAssignments.clear();
  adminActionLogEntries.clear();
  aiRuns.clear();
  importJobs.clear();
  importMappingProfiles.clear();
  reconciliationIssues.clear();
  learningEntitlements.clear();
  learningEnrollments.clear();
  learningCertificates.clear();
  lessonProgressRecords.clear();
  membershipSubscriptions.clear();
  operationalMetricEvents.clear();
  referralPrograms.clear();
  referralCodes.clear();
  referralRelationships.clear();
  referralRewardEvents.clear();
  supportCases.clear();
  supportCaseEvents.clear();
  skinAssessmentIntakes.clear();
  skinAssessmentRecords.clear();
  tenantSettings.clear();
  treatmentPlans.clear();
  waitlistEntries.clear();
  idempotentResponses.clear();
  processedStripeEvents.clear();
};
