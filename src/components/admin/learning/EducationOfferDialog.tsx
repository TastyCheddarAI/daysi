import { useEffect, useState } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export interface EducationOfferFormValues {
  slug: string;
  title: string;
  shortDescription: string;
  moduleSlugs: string[];
  membershipEligible: boolean;
  staffGrantEnabled: boolean;
  status: "draft" | "published";
  price: {
    currency: string;
    amountCents: number;
    isFree: boolean;
  };
}

interface EducationOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: EducationOfferFormValues) => void;
  initialValues?: Partial<EducationOfferFormValues>;
  isLoading?: boolean;
}

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function EducationOfferDialog(input: EducationOfferDialogProps) {
  const [form, setForm] = useState<EducationOfferFormValues>({
    slug: "",
    title: "",
    shortDescription: "",
    moduleSlugs: [],
    membershipEligible: true,
    staffGrantEnabled: true,
    status: "draft",
    price: {
      currency: "CAD",
      amountCents: 0,
      isFree: false,
    },
  });

  useEffect(() => {
    if (!input.open) {
      return;
    }

    setForm({
      slug: input.initialValues?.slug ?? "",
      title: input.initialValues?.title ?? "",
      shortDescription: input.initialValues?.shortDescription ?? "",
      moduleSlugs: input.initialValues?.moduleSlugs ?? [],
      membershipEligible: input.initialValues?.membershipEligible ?? true,
      staffGrantEnabled: input.initialValues?.staffGrantEnabled ?? true,
      status: input.initialValues?.status ?? "draft",
      price: {
        currency: input.initialValues?.price?.currency ?? "CAD",
        amountCents: input.initialValues?.price?.amountCents ?? 0,
        isFree: input.initialValues?.price?.isFree ?? false,
      },
    });
  }, [input.initialValues, input.open]);

  return (
    <Dialog open={input.open} onOpenChange={input.onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {input.initialValues?.slug ? "Edit Education Offer" : "Create Education Offer"}
          </DialogTitle>
        </DialogHeader>

        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            input.onSubmit({
              ...form,
              slug: slugify(form.slug || form.title),
              moduleSlugs: form.moduleSlugs.filter(Boolean),
              price: {
                ...form.price,
                amountCents: form.price.isFree ? 0 : form.price.amountCents,
              },
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="education-offer-title">Title</Label>
              <Input
                id="education-offer-title"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                    slug: input.initialValues?.slug ? current.slug : slugify(event.target.value),
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="education-offer-slug">Slug</Label>
              <Input
                id="education-offer-slug"
                value={form.slug}
                onChange={(event) =>
                  setForm((current) => ({ ...current, slug: slugify(event.target.value) }))
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="education-offer-description">Short Description</Label>
            <Textarea
              id="education-offer-description"
              rows={3}
              value={form.shortDescription}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  shortDescription: event.target.value,
                }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="education-offer-modules">Module Slugs</Label>
            <Textarea
              id="education-offer-modules"
              rows={4}
              placeholder="laser-foundations&#10;consulting-script&#10;treatment-protocols"
              value={form.moduleSlugs.join("\n")}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  moduleSlugs: event.target.value
                    .split(/\r?\n|,/)
                    .map((value) => slugify(value))
                    .filter(Boolean),
                }))
              }
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="education-offer-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(value: "draft" | "published") =>
                  setForm((current) => ({ ...current, status: value }))
                }
              >
                <SelectTrigger id="education-offer-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="education-offer-currency">Currency</Label>
              <Input
                id="education-offer-currency"
                value={form.price.currency}
                maxLength={3}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    price: {
                      ...current.price,
                      currency: event.target.value.toUpperCase(),
                    },
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="education-offer-price">Price (cents)</Label>
              <Input
                id="education-offer-price"
                type="number"
                min={0}
                value={form.price.amountCents}
                disabled={form.price.isFree}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    price: {
                      ...current.price,
                      amountCents: Number(event.target.value),
                    },
                  }))
                }
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="font-medium">Free Offer</p>
                <p className="text-xs text-muted-foreground">Zero-price access product</p>
              </div>
              <Switch
                checked={form.price.isFree}
                onCheckedChange={(checked) =>
                  setForm((current) => ({
                    ...current,
                    price: {
                      ...current.price,
                      isFree: checked,
                      amountCents: checked ? 0 : current.price.amountCents,
                    },
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="font-medium">Membership Eligible</p>
                <p className="text-xs text-muted-foreground">Education membership can unlock it</p>
              </div>
              <Switch
                checked={form.membershipEligible}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, membershipEligible: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="font-medium">Staff Grants</p>
                <p className="text-xs text-muted-foreground">Admins can grant direct access</p>
              </div>
              <Switch
                checked={form.staffGrantEnabled}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, staffGrantEnabled: checked }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => input.onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={input.isLoading}>
              {input.initialValues?.slug ? "Save Offer" : "Create Offer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
