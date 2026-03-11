import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amount);
}

/**
 * Calculate the applicable credit amount that can be applied to an order
 * @param creditBalance - The user's available credit balance
 * @param orderTotal - The total order amount after other discounts
 * @returns The amount of credits that can be applied (min of balance or order total)
 */
export function calculateApplicableCredits(
  creditBalance: number,
  orderTotal: number
): number {
  return Math.min(creditBalance, orderTotal);
}
