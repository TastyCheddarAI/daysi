import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { DaysiPublicService, DaysiPublicServicePackage } from "@/lib/daysi-admin-api";

export interface PackageFormValues {
  slug: string;
  name: string;
  shortDescription: string;
  status: "draft" | "published";
  price: {
    currency: string;
    amountCents: number;
  };
  serviceCredits: Array<{
    serviceSlug: string;
    quantity: number;
  }>;
  featureTags: string[];
}

interface PackageFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PackageFormValues) => void;
  initialValues?: Partial<DaysiPublicServicePackage>;
  services: DaysiPublicService[];
  isLoading?: boolean;
}

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function PackageFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
  services,
  isLoading,
}: PackageFormDialogProps) {
  const [form, setForm] = useState<PackageFormValues>({
    slug: "",
    name: "",
    shortDescription: "",
    status: "draft",
    price: {
      currency: "CAD",
      amountCents: 0,
    },
    serviceCredits: [],
    featureTags: [],
  });

  const [tagInput, setTagInput] = useState("");
  const isEditing = !!initialValues?.slug;

  useEffect(() => {
    if (!open) return;

    setForm({
      slug: initialValues?.slug ?? "",
      name: initialValues?.name ?? "",
      shortDescription: initialValues?.shortDescription ?? "",
      status: initialValues?.status ?? "draft",
      price: {
        currency: initialValues?.price?.currency ?? "CAD",
        amountCents: initialValues?.price?.amountCents ?? 0,
      },
      serviceCredits: initialValues?.serviceCredits?.map((c) => ({
        serviceSlug: c.serviceSlug,
        quantity: c.quantity,
      })) ?? [],
      featureTags: initialValues?.featureTags ?? [],
    });
    setTagInput("");
  }, [initialValues, open]);

  const addServiceCredit = () => {
    if (services.length === 0) return;
    const firstService = services[0]!;
    setForm((current) => ({
      ...current,
      serviceCredits: [
        ...current.serviceCredits,
        { serviceSlug: firstService.slug, quantity: 1 },
      ],
    }));
  };

  const updateServiceCredit = (index: number, updates: Partial<{ serviceSlug: string; quantity: number }>) => {
    setForm((current) => ({
      ...current,
      serviceCredits: current.serviceCredits.map((credit, i) =>
        i === index ? { ...credit, ...updates } : credit
      ),
    }));
  };

  const removeServiceCredit = (index: number) => {
    setForm((current) => ({
      ...current,
      serviceCredits: current.serviceCredits.filter((_, i) => i !== index),
    }));
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    const normalizedTag = slugify(tagInput);
    if (form.featureTags.includes(normalizedTag)) return;
    setForm((current) => ({
      ...current,
      featureTags: [...current.featureTags, normalizedTag],
    }));
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setForm((current) => ({
      ...current,
      featureTags: current.featureTags.filter((t) => t !== tag),
    }));
  };

  const totalRetailValue = form.serviceCredits.reduce((sum, credit) => {
    const service = services.find((s) => s.slug === credit.serviceSlug);
    return sum + (service?.price.retailAmountCents ?? 0) * credit.quantity;
  }, 0);

  const savings = Math.max(0, totalRetailValue - form.price.amountCents);
  const savingsPercent = totalRetailValue > 0 ? Math.round((savings / totalRetailValue) * 100) : 0;

  const canSubmit =
    form.name.trim() &&
    form.shortDescription.trim() &&
    form.slug.trim() &&
    form.serviceCredits.length > 0 &&
    form.serviceCredits.every((c) => c.quantity > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Package" : "Create New Package"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the service package details"
              : "Bundle multiple services together at a discounted price"}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              ...form,
              slug: isEditing ? form.slug : slugify(form.slug || form.name),
            });
          }}
          className="space-y-6 py-4"
        >
          {/* Name and Slug */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="package-name">
                Package Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="package-name"
                placeholder="e.g., Laser Hair Removal Bundle"
                value={form.name}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    name: e.target.value,
                    slug: isEditing ? current.slug : slugify(e.target.value || current.slug),
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="package-slug">
                URL Slug <span className="text-red-500">*</span>
              </Label>
              <Input
                id="package-slug"
                placeholder="laser-hair-bundle"
                value={form.slug}
                onChange={(e) =>
                  setForm((current) => ({ ...current, slug: slugify(e.target.value) }))
                }
                disabled={isEditing}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="package-description">
              Short Description <span className="text-red-500">*</span>
            </Label>
            <Input
              id="package-description"
              placeholder="Brief description of what this package includes"
              value={form.shortDescription}
              onChange={(e) =>
                setForm((current) => ({ ...current, shortDescription: e.target.value }))
              }
              required
            />
          </div>

          {/* Status and Currency */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="package-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(value: "draft" | "published") =>
                  setForm((current) => ({ ...current, status: value }))
                }
              >
                <SelectTrigger id="package-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="package-currency">Currency</Label>
              <Select
                value={form.price.currency}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    price: { ...current.price, currency: value },
                  }))
                }
              >
                <SelectTrigger id="package-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="package-price">
              Package Price <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="package-price"
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                className="pl-7"
                value={form.price.amountCents / 100}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    price: {
                      ...current.price,
                      amountCents: Math.round(parseFloat(e.target.value || "0") * 100),
                    },
                  }))
                }
                required
              />
            </div>
          </div>

          {/* Service Credits */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>
                Included Services <span className="text-red-500">*</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addServiceCredit}
                disabled={services.length === 0}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Service
              </Button>
            </div>

            {form.serviceCredits.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                No services added yet. Click &quot;Add Service&quot; to include services in this package.
              </div>
            ) : (
              <div className="space-y-2">
                {form.serviceCredits.map((credit, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                    <Select
                      value={credit.serviceSlug}
                      onValueChange={(value) =>
                        updateServiceCredit(index, { serviceSlug: value })
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.slug} value={service.slug}>
                            {service.name} (
                            {new Intl.NumberFormat("en-CA", {
                              style: "currency",
                              currency: service.price.currency,
                            }).format(service.price.retailAmountCents / 100)}
                            )
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Qty:</span>
                      <Input
                        type="number"
                        min={1}
                        max={99}
                        value={credit.quantity}
                        onChange={(e) =>
                          updateServiceCredit(index, {
                            quantity: parseInt(e.target.value) || 1,
                          })
                        }
                        className="w-20"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeServiceCredit(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Feature Tags */}
          <div className="space-y-2">
            <Label>Feature Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag (e.g., popular, seasonal)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Add
              </Button>
            </div>
            {form.featureTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.featureTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Pricing Summary */}
          {form.serviceCredits.length > 0 && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-medium">Pricing Summary</h4>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Retail Value:</span>
                <span>
                  {new Intl.NumberFormat("en-CA", {
                    style: "currency",
                    currency: form.price.currency,
                  }).format(totalRetailValue / 100)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Package Price:</span>
                <span>
                  {new Intl.NumberFormat("en-CA", {
                    style: "currency",
                    currency: form.price.currency,
                  }).format(form.price.amountCents / 100)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span>Customer Savings:</span>
                <span className="text-emerald-600">
                  {new Intl.NumberFormat("en-CA", {
                    style: "currency",
                    currency: form.price.currency,
                  }).format(savings / 100)}{" "}
                  ({savingsPercent}%)
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isLoading}>
              {isLoading ? "Saving..." : isEditing ? "Update Package" : "Create Package"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
