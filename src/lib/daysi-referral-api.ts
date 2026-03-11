import { DAYSI_API_BASE_URL } from "./daysi-public-api";

// Types
export interface ReferralProgram {
  id: string;
  locationSlug: string;
  name: string;
  status: "draft" | "active" | "inactive" | "archived";
  codePrefix: string;
  referredReward?: {
    kind: "account_credit";
    amount: { currency: string; amountCents: number };
  };
  advocateReward?: {
    kind: "account_credit";
    amount: { currency: string; amountCents: number };
  };
  secondLevelReward?: {
    kind: "account_credit";
    amount: { currency: string; amountCents: number };
  };
  createdAt: string;
  updatedAt: string;
}

export interface ReferralCode {
  id: string;
  programId: string;
  locationSlug: string;
  ownerUserId?: string;
  ownerEmail: string;
  code: string;
  createdAt: string;
}

export interface ReferralRelationship {
  id: string;
  programId: string;
  locationSlug: string;
  referralCodeId: string;
  referralCode: string;
  referrerUserId?: string;
  referrerEmail: string;
  refereeUserId?: string;
  refereeEmail: string;
  status: "applied" | "qualified";
  createdAt: string;
  updatedAt: string;
  firstQualifiedOrderId?: string;
  qualifiedAt?: string;
}

export interface ReferralRewardEvent {
  id: string;
  programId: string;
  relationshipId: string;
  locationSlug: string;
  recipient: "referee" | "referrer" | "referrer_level_2";
  recipientUserId?: string;
  recipientEmail: string;
  reward: {
    kind: "account_credit";
    amount: { currency: string; amountCents: number };
  };
  sourceOrderId?: string;
  status: "earned" | "reversed";
  creditEntryId?: string;
  createdAt: string;
  reversedAt?: string;
}

export interface MyReferralOverview {
  locationSlug: string;
  program: ReferralProgram | null;
  referralCode: ReferralCode | null;
  appliedRelationship: ReferralRelationship | null;
  invitedRelationships: ReferralRelationship[];
  rewardEvents: ReferralRewardEvent[];
  summary: {
    invitedCount: number;
    qualifiedInviteCount: number;
    totalRewardAmount: { currency: string; amountCents: number };
  };
}

export interface ApplyReferralCodeInput {
  locationSlug: string;
  code: string;
}

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

// API Functions
export async function fetchMyReferralOverview(input: {
  token: string;
  locationSlug: string;
}): Promise<ApiResponse<{ overview: MyReferralOverview }>> {
  const params = new URLSearchParams({ locationSlug: input.locationSlug });
  const response = await fetch(`${DAYSI_API_BASE_URL}/v1/me/referral?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    return { ok: false, error: { code: "fetch_error", message: error.message || "Failed to fetch" } };
  }

  return response.json();
}

export async function applyReferralCode(input: {
  token: string;
  input: ApplyReferralCodeInput;
}): Promise<ApiResponse<{ relationship: ReferralRelationship; rewardEvents: ReferralRewardEvent[]; overview: MyReferralOverview }>> {
  const response = await fetch(`${DAYSI_API_BASE_URL}/v1/referrals/apply`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input.input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    return { ok: false, error: { code: "apply_error", message: error.message || "Failed to apply code" } };
  }

  return response.json();
}

// Admin API Functions
export interface AdminReferralProgramInput {
  locationSlug: string;
  name: string;
  status: "draft" | "active" | "inactive" | "archived";
  codePrefix?: string;
  referredReward?: { kind: "account_credit"; amount: { currency: string; amountCents: number } };
  advocateReward?: { kind: "account_credit"; amount: { currency: string; amountCents: number } };
  secondLevelReward?: { kind: "account_credit"; amount: { currency: string; amountCents: number } };
}

export async function fetchAdminReferralPrograms(input: {
  token: string;
  locationSlug?: string;
}): Promise<ApiResponse<{ programs: ReferralProgram[] }>> {
  const params = new URLSearchParams();
  if (input.locationSlug) params.set("locationSlug", input.locationSlug);
  
  const response = await fetch(`${DAYSI_API_BASE_URL}/v1/admin/referrals/programs?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    return { ok: false, error: { code: "fetch_error", message: error.message || "Failed to fetch" } };
  }

  return response.json();
}

export async function createAdminReferralProgram(input: {
  token: string;
  data: AdminReferralProgramInput;
}): Promise<ApiResponse<{ program: ReferralProgram }>> {
  const response = await fetch(`${DAYSI_API_BASE_URL}/v1/admin/referrals/programs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input.data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    return { ok: false, error: { code: "create_error", message: error.message || "Failed to create" } };
  }

  return response.json();
}

export async function updateAdminReferralProgram(input: {
  token: string;
  programId: string;
  data: Partial<AdminReferralProgramInput>;
}): Promise<ApiResponse<{ program: ReferralProgram }>> {
  const response = await fetch(`${DAYSI_API_BASE_URL}/v1/admin/referrals/programs/${input.programId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input.data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    return { ok: false, error: { code: "update_error", message: error.message || "Failed to update" } };
  }

  return response.json();
}
