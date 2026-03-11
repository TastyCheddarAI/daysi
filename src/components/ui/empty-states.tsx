import { LucideIcon, Inbox, Search, FileX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
}

interface NoResultsProps {
  searchTerm?: string;
  onClear?: () => void;
  className?: string;
}

export function NoResults({ searchTerm, onClear, className }: NoResultsProps) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={
        searchTerm
          ? `No matches for "${searchTerm}". Try adjusting your search or filters.`
          : "Try adjusting your search or filters to find what you're looking for."
      }
      action={onClear ? { label: "Clear search", onClick: onClear } : undefined}
      className={className}
    />
  );
}

interface NoDataProps {
  entityName: string;
  onAdd?: () => void;
  className?: string;
}

export function NoData({ entityName, onAdd, className }: NoDataProps) {
  return (
    <EmptyState
      icon={FileX}
      title={`No ${entityName} yet`}
      description={`Get started by creating your first ${entityName.toLowerCase()}.`}
      action={onAdd ? { label: `Add ${entityName}`, onClick: onAdd } : undefined}
      className={className}
    />
  );
}
