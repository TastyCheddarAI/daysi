import { BRAND_CONFIG } from "@/lib/brand.config";

const REFERRAL_CODE_KEY = BRAND_CONFIG.STORAGE_KEYS.REFERRAL_CODE;

export function storeReferralCode(code: string): void {
  localStorage.setItem(REFERRAL_CODE_KEY, code.toUpperCase());
}

export function getStoredReferralCode(): string | null {
  return localStorage.getItem(REFERRAL_CODE_KEY);
}

export function clearStoredReferralCode(): void {
  localStorage.removeItem(REFERRAL_CODE_KEY);
}

export function generateShareUrl(code: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/auth?ref=${code}`;
}

export const formatReferralCreditAmount = (
  amountCents: number,
  currency: string = "CAD",
): string =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);

export function buildReferralProgramSummary(input: {
  referredRewardAmountCents?: number;
  advocateRewardAmountCents?: number;
  secondLevelRewardAmountCents?: number;
  currency?: string;
}): string {
  const referredReward = input.referredRewardAmountCents
    ? `${formatReferralCreditAmount(input.referredRewardAmountCents, input.currency)} in account credit`
    : null;
  const advocateReward = input.advocateRewardAmountCents
    ? `${formatReferralCreditAmount(input.advocateRewardAmountCents, input.currency)} in account credit`
    : null;
  const secondLevelReward = input.secondLevelRewardAmountCents
    ? `${formatReferralCreditAmount(input.secondLevelRewardAmountCents, input.currency)} in second-level credit`
    : null;

  if (referredReward && advocateReward && secondLevelReward) {
    return `Friends receive ${referredReward}, you earn ${advocateReward} after their first qualifying order, and deeper network rewards can add ${secondLevelReward}.`;
  }

  if (referredReward && advocateReward) {
    return `Friends receive ${referredReward} and you earn ${advocateReward} after their first qualifying order.`;
  }

  if (referredReward) {
    return `Friends receive ${referredReward} when they join with your code.`;
  }

  if (advocateReward) {
    return `You earn ${advocateReward} when a friend places their first qualifying order.`;
  }

  return "Share your code to unlock the active Daysi referral rewards.";
}

export function generateShareText(
  code: string,
  input: {
    businessName?: string;
    referredRewardAmountCents?: number;
    currency?: string;
  } = {},
): string {
  const name = input.businessName || BRAND_CONFIG.DEFAULT_BUSINESS_NAME;
  const rewardLabel = input.referredRewardAmountCents
    ? `${formatReferralCreditAmount(input.referredRewardAmountCents, input.currency)} in account credit`
    : "exclusive referral rewards";
  return `Join me at ${name}. Use my referral code ${code} to unlock ${rewardLabel}.`;
}
