export interface BusinessSettings {
  id: string;
  business_name: string;
  tagline: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string;
  province: string;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  hours_weekday: string | null;
  hours_saturday: string | null;
  hours_sunday: string | null;
  meta_keywords: string | null;
  meta_description: string | null;
  referral_referee_discount: number;
  referral_referrer_credit: number;
}
