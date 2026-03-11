import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Briefcase } from "lucide-react";
import { type DaysiAdminProviderSummary } from "@/lib/daysi-admin-api";

interface StaffColumnProps {
  provider: DaysiAdminProviderSummary;
  isHeader?: boolean;
}

export function StaffColumn({ provider, isHeader = false }: StaffColumnProps) {
  const initials = provider.providerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (!isHeader) {
    return <div className="flex-1 min-w-[120px] sm:min-w-[200px] relative border-r" />;
  }

  return (
    <div className="flex-1 min-w-[120px] sm:min-w-[200px] p-1 sm:p-2 border-r">
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
          <AvatarFallback className="bg-primary/10 text-primary text-[10px] sm:text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col items-center">
          <span className="font-medium text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none">
            {provider.providerName}
          </span>
          {provider.commissionPercent > 0 && (
            <Badge variant="outline" className="text-[10px] sm:text-xs py-0 h-4 sm:h-5">
              <Briefcase className="h-2.5 w-2.5 sm:h-3 sm:w-3 sm:mr-1" />
              <span className="hidden sm:inline">{provider.commissionPercent}%</span>
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
