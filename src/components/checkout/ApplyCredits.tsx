import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { Wallet } from "lucide-react";

interface ApplyCreditsProps {
  balance: number;
  applicable: number;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function ApplyCredits({
  balance,
  applicable,
  enabled,
  onToggle,
}: ApplyCreditsProps) {
  if (balance <= 0) return null;

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3">
        <Wallet className="h-5 w-5 text-primary" />
        <div>
          <Label htmlFor="apply-credits" className="font-medium cursor-pointer">
            Apply Store Credits
          </Label>
          <p className="text-sm text-muted-foreground">
            Balance: {formatCurrency(balance)} · Applicable: {formatCurrency(applicable)}
          </p>
        </div>
      </div>
      <Switch
        id="apply-credits"
        checked={enabled}
        onCheckedChange={onToggle}
      />
    </div>
  );
}
