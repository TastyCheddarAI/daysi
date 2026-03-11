import { useQuery } from "@tanstack/react-query";

import {
  DAYSI_DEFAULT_LOCATION_SLUG,
  fetchDaysiPublicBusinessProfile,
} from "@/lib/daysi-public-api";
import type { BusinessSettings } from "@/types/business";

export type { BusinessSettings };

export function useBusinessSettings() {
  return useQuery({
    queryKey: ["business-settings", DAYSI_DEFAULT_LOCATION_SLUG],
    queryFn: async () => {
      const profile = await fetchDaysiPublicBusinessProfile(DAYSI_DEFAULT_LOCATION_SLUG);
      if (!profile) {
        return null;
      }

      return {
        id: `business-profile:${DAYSI_DEFAULT_LOCATION_SLUG}`,
        business_name: profile.businessName,
        tagline: profile.tagline,
        address_line1: profile.addressLine1,
        address_line2: profile.addressLine2,
        city: profile.city,
        province: profile.province,
        postal_code: profile.postalCode,
        phone: profile.phone,
        email: profile.email,
        instagram_url: profile.instagramUrl,
        facebook_url: profile.facebookUrl,
        hours_weekday: profile.hoursWeekday,
        hours_saturday: profile.hoursSaturday,
        hours_sunday: profile.hoursSunday,
        meta_keywords: profile.metaKeywords,
        meta_description: profile.metaDescription,
        referral_referee_discount: 0,
        referral_referrer_credit: 0,
      } satisfies BusinessSettings;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}
