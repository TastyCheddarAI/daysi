import { useEffect, useState } from "react";
import { Building2, Clock, Loader2, Mail, MapPin, Phone, Save, Search, Share2 } from "lucide-react";
import { toast } from "sonner";

import { useDaysiAdminBusinessProfile, useUpdateDaysiAdminBusinessProfile } from "@/hooks/useDaysiAdminSettings";
import { BRAND_CONFIG } from "@/lib/brand.config";
import type { DaysiBusinessProfile } from "@/lib/daysi-public-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type BusinessProfileFormState = Record<keyof DaysiBusinessProfile, string>;

const buildDefaultFormState = (): BusinessProfileFormState => ({
  businessName: BRAND_CONFIG.DEFAULT_BUSINESS_NAME,
  tagline: "",
  addressLine1: "",
  addressLine2: "",
  city: BRAND_CONFIG.DEFAULT_CITY,
  province: BRAND_CONFIG.DEFAULT_PROVINCE,
  postalCode: "",
  phone: BRAND_CONFIG.FALLBACK_PHONE,
  email: "",
  instagramUrl: "",
  facebookUrl: "",
  hoursWeekday: "",
  hoursSaturday: "",
  hoursSunday: "",
  metaKeywords: "",
  metaDescription: "",
});

const toFormState = (profile: DaysiBusinessProfile | null | undefined): BusinessProfileFormState => ({
  businessName: profile?.businessName ?? BRAND_CONFIG.DEFAULT_BUSINESS_NAME,
  tagline: profile?.tagline ?? "",
  addressLine1: profile?.addressLine1 ?? "",
  addressLine2: profile?.addressLine2 ?? "",
  city: profile?.city ?? BRAND_CONFIG.DEFAULT_CITY,
  province: profile?.province ?? BRAND_CONFIG.DEFAULT_PROVINCE,
  postalCode: profile?.postalCode ?? "",
  phone: profile?.phone ?? BRAND_CONFIG.FALLBACK_PHONE,
  email: profile?.email ?? "",
  instagramUrl: profile?.instagramUrl ?? "",
  facebookUrl: profile?.facebookUrl ?? "",
  hoursWeekday: profile?.hoursWeekday ?? "",
  hoursSaturday: profile?.hoursSaturday ?? "",
  hoursSunday: profile?.hoursSunday ?? "",
  metaKeywords: profile?.metaKeywords ?? "",
  metaDescription: profile?.metaDescription ?? "",
});

const toNullableText = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toBusinessProfile = (form: BusinessProfileFormState): DaysiBusinessProfile => ({
  businessName: form.businessName.trim(),
  tagline: toNullableText(form.tagline),
  addressLine1: toNullableText(form.addressLine1),
  addressLine2: toNullableText(form.addressLine2),
  city: form.city.trim(),
  province: form.province.trim(),
  postalCode: toNullableText(form.postalCode),
  phone: toNullableText(form.phone),
  email: toNullableText(form.email),
  instagramUrl: toNullableText(form.instagramUrl),
  facebookUrl: toNullableText(form.facebookUrl),
  hoursWeekday: toNullableText(form.hoursWeekday),
  hoursSaturday: toNullableText(form.hoursSaturday),
  hoursSunday: toNullableText(form.hoursSunday),
  metaKeywords: toNullableText(form.metaKeywords),
  metaDescription: toNullableText(form.metaDescription),
});

export function BusinessSettingsCard() {
  const profileQuery = useDaysiAdminBusinessProfile();
  const updateProfile = useUpdateDaysiAdminBusinessProfile();
  const [form, setForm] = useState<BusinessProfileFormState>(buildDefaultFormState);

  useEffect(() => {
    if (profileQuery.isSuccess) {
      setForm(toFormState(profileQuery.data));
    }
  }, [profileQuery.data, profileQuery.isSuccess]);

  const updateField = (field: keyof BusinessProfileFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!form.businessName.trim() || !form.city.trim() || !form.province.trim()) {
      toast.error("Business name, city, and province are required.");
      return;
    }

    try {
      await updateProfile.mutateAsync({
        profile: toBusinessProfile(form),
      });
      toast.success("Business profile updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update business profile.");
    }
  };

  if (profileQuery.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (profileQuery.isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Unable to load the Daysi business profile.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Business Information
        </CardTitle>
        <CardDescription>
          Manage customer-facing business details served by the Daysi business-profile API.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Building2 className="h-4 w-4" />
            Business Identity
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={form.businessName}
                onChange={(event) => updateField("businessName", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={form.tagline}
                onChange={(event) => updateField("tagline", event.target.value)}
                placeholder="Your business tagline"
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <MapPin className="h-4 w-4" />
            Location
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="addressLine1">Address Line 1</Label>
              <Input
                id="addressLine1"
                value={form.addressLine1}
                onChange={(event) => updateField("addressLine1", event.target.value)}
                placeholder="123 Main Street"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input
                id="addressLine2"
                value={form.addressLine2}
                onChange={(event) => updateField("addressLine2", event.target.value)}
                placeholder="Suite 100"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(event) => updateField("city", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="province">Province</Label>
              <Input
                id="province"
                value={form.province}
                onChange={(event) => updateField("province", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                value={form.postalCode}
                onChange={(event) => updateField("postalCode", event.target.value)}
                placeholder="R0A 1E0"
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Phone className="h-4 w-4" />
            Contact
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="hello@example.com"
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Share2 className="h-4 w-4" />
            Social Media
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="instagramUrl">Instagram URL</Label>
              <Input
                id="instagramUrl"
                value={form.instagramUrl}
                onChange={(event) => updateField("instagramUrl", event.target.value)}
                placeholder="https://instagram.com/yourbusiness"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebookUrl">Facebook URL</Label>
              <Input
                id="facebookUrl"
                value={form.facebookUrl}
                onChange={(event) => updateField("facebookUrl", event.target.value)}
                placeholder="https://facebook.com/yourbusiness"
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            Business Hours
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="hoursWeekday">Weekdays</Label>
              <Input
                id="hoursWeekday"
                value={form.hoursWeekday}
                onChange={(event) => updateField("hoursWeekday", event.target.value)}
                placeholder="Tue - Fri: 9am - 6pm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hoursSaturday">Saturday</Label>
              <Input
                id="hoursSaturday"
                value={form.hoursSaturday}
                onChange={(event) => updateField("hoursSaturday", event.target.value)}
                placeholder="Sat: 9am - 4pm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hoursSunday">Sunday / Closed</Label>
              <Input
                id="hoursSunday"
                value={form.hoursSunday}
                onChange={(event) => updateField("hoursSunday", event.target.value)}
                placeholder="Sun - Mon: Closed"
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Search className="h-4 w-4" />
            SEO Metadata
          </div>
          <div className="space-y-2">
            <Label htmlFor="metaKeywords">Meta Keywords</Label>
            <Input
              id="metaKeywords"
              value={form.metaKeywords}
              onChange={(event) => updateField("metaKeywords", event.target.value)}
              placeholder="laser hair removal, skin rejuvenation, niverville"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="metaDescription">Meta Description</Label>
            <Textarea
              id="metaDescription"
              value={form.metaDescription}
              onChange={(event) => updateField("metaDescription", event.target.value)}
              placeholder="Customer-facing search description for the brand."
              rows={4}
            />
          </div>
        </div>

        <div className="pt-4">
          <Button onClick={handleSave} disabled={updateProfile.isPending}>
            {updateProfile.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
