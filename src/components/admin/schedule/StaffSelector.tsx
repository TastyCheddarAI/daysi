import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { type DaysiAdminProviderSummary } from "@/lib/daysi-admin-api";

interface StaffSelectorProps {
  providers: DaysiAdminProviderSummary[];
  selectedProviderSlug: string | null;
  onSelect: (providerSlug: string | null) => void;
  showAllOption?: boolean;
}

export function StaffSelector({
  providers,
  selectedProviderSlug,
  onSelect,
  showAllOption = false,
}: StaffSelectorProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Select
      value={selectedProviderSlug || "all"}
      onValueChange={(value) => onSelect(value === "all" ? null : value)}
    >
      <SelectTrigger className="w-full sm:w-[200px]">
        <SelectValue placeholder="Select staff member" />
      </SelectTrigger>
      <SelectContent>
        {showAllOption && (
          <SelectItem value="all">
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground">All Staff</span>
            </span>
          </SelectItem>
        )}
        {providers.map((provider) => {
          const displayName = provider.providerName;
          return (
            <SelectItem key={provider.providerSlug} value={provider.providerSlug}>
              <span className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px] bg-primary/10">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <span>{displayName}</span>
                {provider.commissionPercent > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({provider.commissionPercent}%)
                  </span>
                )}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
