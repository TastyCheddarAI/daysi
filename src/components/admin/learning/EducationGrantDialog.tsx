import { useEffect, useState } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EducationGrantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offers: Array<{
    slug: string;
    title: string;
    staffGrantEnabled: boolean;
  }>;
  defaultOfferSlug?: string;
  isLoading?: boolean;
  onSubmit: (values: {
    offerSlug: string;
    customerName: string;
    customerEmail: string;
    actorUserId?: string;
  }) => void;
}

export function EducationGrantDialog(input: EducationGrantDialogProps) {
  const [offerSlug, setOfferSlug] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [actorUserId, setActorUserId] = useState("");

  useEffect(() => {
    if (!input.open) {
      return;
    }

    const availableOfferSlug =
      input.defaultOfferSlug ??
      input.offers.find((offer) => offer.staffGrantEnabled)?.slug ??
      "";
    setOfferSlug(availableOfferSlug);
    setCustomerName("");
    setCustomerEmail("");
    setActorUserId("");
  }, [input.defaultOfferSlug, input.offers, input.open]);

  const selectableOffers = input.offers.filter((offer) => offer.staffGrantEnabled);

  return (
    <Dialog open={input.open} onOpenChange={input.onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Grant Education Access</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            input.onSubmit({
              offerSlug,
              customerName: customerName.trim(),
              customerEmail: customerEmail.trim().toLowerCase(),
              actorUserId: actorUserId.trim() || undefined,
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="education-grant-offer">Offer</Label>
            <Select value={offerSlug} onValueChange={setOfferSlug}>
              <SelectTrigger id="education-grant-offer">
                <SelectValue placeholder="Select an offer" />
              </SelectTrigger>
              <SelectContent>
                {selectableOffers.map((offer) => (
                  <SelectItem key={offer.slug} value={offer.slug}>
                    {offer.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="education-grant-name">Customer Name</Label>
            <Input
              id="education-grant-name"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="education-grant-email">Customer Email</Label>
            <Input
              id="education-grant-email"
              type="email"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="education-grant-actor">Actor User ID</Label>
            <Input
              id="education-grant-actor"
              value={actorUserId}
              onChange={(event) => setActorUserId(event.target.value)}
              placeholder="Optional staff/provider user id"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => input.onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={input.isLoading || selectableOffers.length === 0 || !offerSlug}
            >
              Grant Access
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
