/**
 * Brand Configuration
 * 
 * Centralized configuration for brand-specific values that should be 
 * consistent across the application and easily changeable for templating.
 * 
 * For dynamic values that can be changed by admins, use the business_settings table.
 * This file is for static defaults and localStorage keys.
 */

export const BRAND_CONFIG = {
  // App name for code references (used in localStorage keys, etc.)
  APP_ID: "daysi",
  
  // Default business name (used as fallback if business_settings is empty)
  DEFAULT_BUSINESS_NAME: "daysi",
  
  // Default location
  DEFAULT_CITY: "Niverville",
  DEFAULT_PROVINCE: "MB",
  
  // Fallback phone (placeholder for when business_settings.phone is null)
  // Should be replaced with real number in business_settings
  FALLBACK_PHONE: "(204) 555-0000",
  FALLBACK_PHONE_INTL: "+12045550000",
  
  // localStorage keys
  STORAGE_KEYS: {
    CART: "daysi_cart",
    REFERRAL_CODE: "referral_code",
    AUTH_SESSION: "daysi_auth_session",
  },
  
  // Currency
  CURRENCY: "CAD",
  CURRENCY_SYMBOL: "$",
} as const;

// Type for the config
export type BrandConfig = typeof BRAND_CONFIG;
