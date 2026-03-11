import { useEffect, useMemo, useState } from "react";
import { Gift, Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  useCreateDaysiAdminReferralProgram,
  useDaysiAdminReferralPrograms,
  useUpdateDaysiAdminReferralProgram,
} from "@/hooks/useDaysiAdminSettings";
import type { DaysiReferralProgram } from "@/lib/daysi-auth-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReferralProgramFormState {
  name: string;
  status: DaysiReferralProgram["status"];
  codePrefix: string;
  referredReward: string;
  advocateReward: string;
  secondLevelReward: string;
}

const emptyForm = (): ReferralProgramFormState => ({
  name: "Daysi Referral Program",
  status: "active",
  codePrefix: "DAYSI",
  referredReward: "10.00",
  advocateReward: "20.00",
  secondLevelReward: "",
});

const centsToInput = (amountCents?: number): string =>
  amountCents ? (amountCents / 100).toFixed(2) : "";

const toFormState = (program: DaysiReferralProgram | null | undefined): ReferralProgramFormState =>
  program
    ? {
        name: program.name,
        status: program.status,
        codePrefix: program.codePrefix,
        referredReward: centsToInput(program.referredReward?.amount.amountCents),
        advocateReward: centsToInput(program.advocateReward?.amount.amountCents),
        secondLevelReward: centsToInput(program.secondLevelReward?.amount.amountCents),
      }
    : emptyForm();

const toReward = (value: string) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return undefined;
  }

  return {
    kind: "account_credit" as const,
    amount: {
      currency: "CAD",
      amountCents: Math.round(amount * 100),
    },
  };
};

const formatCents = (amountCents?: number) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2,
  }).format((amountCents ?? 0) / 100);

export function ReferralSettingsCard() {
  const programsQuery = useDaysiAdminReferralPrograms();
  const createProgram = useCreateDaysiAdminReferralProgram();
  const updateProgram = useUpdateDaysiAdminReferralProgram();
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [form, setForm] = useState<ReferralProgramFormState>(emptyForm);

  const programs = programsQuery.data ?? [];
  const selectedProgram = useMemo(
    () => programs.find((program) => program.id === selectedProgramId) ?? null,
    [programs, selectedProgramId],
  );

  useEffect(() => {
    if (isCreatingNew) {
      return;
    }

    if (programs.length === 0) {
      setSelectedProgramId(null);
      setForm(emptyForm());
      return;
    }

    const nextProgram = selectedProgram ?? programs[0];
    if (selectedProgramId !== nextProgram.id) {
      setSelectedProgramId(nextProgram.id);
    }
    setForm(toFormState(nextProgram));
  }, [isCreatingNew, programs, selectedProgram, selectedProgramId]);

  const updateField = (field: keyof ReferralProgramFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCreateMode = () => {
    setIsCreatingNew(true);
    setSelectedProgramId(null);
    setForm(emptyForm());
  };

  const handleProgramSelection = (value: string) => {
    if (value === "__new") {
      handleCreateMode();
      return;
    }

    const nextProgram = programs.find((program) => program.id === value);
    setIsCreatingNew(false);
    setSelectedProgramId(value);
    setForm(toFormState(nextProgram));
  };

  const handleSave = async () => {
    const referredReward = toReward(form.referredReward);
    const advocateReward = toReward(form.advocateReward);
    const secondLevelReward = toReward(form.secondLevelReward);

    if (!referredReward && !advocateReward && !secondLevelReward) {
      toast.error("Add at least one referral reward before saving.");
      return;
    }

    try {
      if (isCreatingNew || !selectedProgram) {
        const program = await createProgram.mutateAsync({
          name: form.name.trim(),
          status: form.status,
          codePrefix: form.codePrefix.trim(),
          referredReward,
          advocateReward,
          secondLevelReward,
        });
        setIsCreatingNew(false);
        setSelectedProgramId(program.id);
        setForm(toFormState(program));
        toast.success("Referral program created.");
        return;
      }

      const updated = await updateProgram.mutateAsync({
        programId: selectedProgram.id,
        name: form.name.trim(),
        status: form.status,
        codePrefix: form.codePrefix.trim(),
        referredReward: referredReward ?? null,
        advocateReward: advocateReward ?? null,
        secondLevelReward: secondLevelReward ?? null,
      });
      setForm(toFormState(updated));
      toast.success("Referral program updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save referral program.");
    }
  };

  if (programsQuery.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (programsQuery.isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Unable to load referral programs.
        </CardContent>
      </Card>
    );
  }

  const previewRewards = {
    referredReward: toReward(form.referredReward),
    advocateReward: toReward(form.advocateReward),
    secondLevelReward: toReward(form.secondLevelReward),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Referral Program
        </CardTitle>
        <CardDescription>
          Manage Daysi referral programs with account-credit rewards instead of the retired percent settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="referralProgramSelect">Program</Label>
            <Select
              value={isCreatingNew ? "__new" : selectedProgramId ?? "__new"}
              onValueChange={handleProgramSelection}
            >
              <SelectTrigger id="referralProgramSelect">
                <SelectValue placeholder="Select a referral program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name} ({program.status})
                  </SelectItem>
                ))}
                <SelectItem value="__new">Create new program</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" onClick={handleCreateMode}>
            New Program
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="programName">Program Name</Label>
            <Input
              id="programName"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="programStatus">Status</Label>
            <Select
              value={form.status}
              onValueChange={(value: DaysiReferralProgram["status"]) => updateField("status", value)}
            >
              <SelectTrigger id="programStatus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="codePrefix">Code Prefix</Label>
          <Input
            id="codePrefix"
            value={form.codePrefix}
            onChange={(event) => updateField("codePrefix", event.target.value.toUpperCase())}
            placeholder="DAYSI"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="referredReward">New Customer Credit (CAD)</Label>
            <Input
              id="referredReward"
              type="number"
              min="0"
              step="0.01"
              value={form.referredReward}
              onChange={(event) => updateField("referredReward", event.target.value)}
              placeholder="10.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="advocateReward">Advocate Credit (CAD)</Label>
            <Input
              id="advocateReward"
              type="number"
              min="0"
              step="0.01"
              value={form.advocateReward}
              onChange={(event) => updateField("advocateReward", event.target.value)}
              placeholder="20.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondLevelReward">Second-Level Credit (CAD)</Label>
            <Input
              id="secondLevelReward"
              type="number"
              min="0"
              step="0.01"
              value={form.secondLevelReward}
              onChange={(event) => updateField("secondLevelReward", event.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          <div className="mb-2 flex items-center gap-2 font-medium">
            <Sparkles className="h-4 w-4" />
            Credit-Based Preview
          </div>
          <p className="text-muted-foreground">
            Share messaging and customer referral views now follow Daysi credit rewards.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
            {previewRewards.referredReward ? (
              <li>
                New customer reward: {formatCents(previewRewards.referredReward.amount.amountCents)} in account credit
              </li>
            ) : null}
            {previewRewards.advocateReward ? (
              <li>
                Advocate reward: {formatCents(previewRewards.advocateReward.amount.amountCents)} in account credit
              </li>
            ) : null}
            {previewRewards.secondLevelReward ? (
              <li>
                Second-level reward: {formatCents(previewRewards.secondLevelReward.amount.amountCents)} in account credit
              </li>
            ) : null}
          </ul>
        </div>

        <Button
          onClick={handleSave}
          disabled={createProgram.isPending || updateProgram.isPending}
        >
          {createProgram.isPending || updateProgram.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {isCreatingNew || !selectedProgram ? "Create Program" : "Save Changes"}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
