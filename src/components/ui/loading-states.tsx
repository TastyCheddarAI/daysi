import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
  message?: string;
  className?: string;
}

export function PageLoader({ message, className }: PageLoaderProps) {
  return (
    <div
      className={cn(
        "min-h-[400px] flex flex-col items-center justify-center gap-4",
        className
      )}
      role="status"
      aria-busy="true"
      aria-label={message || "Loading"}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      )}
    </div>
  );
}

interface CardLoaderProps {
  count?: number;
  className?: string;
}

export function CardLoader({ count = 1, className }: CardLoaderProps) {
  return (
    <div className={cn("grid gap-4", className)} role="status" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-card p-6 space-y-4"
        >
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-20 w-full" />
        </div>
      ))}
    </div>
  );
}

interface TableLoaderProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableLoader({
  rows = 5,
  columns = 4,
  className,
}: TableLoaderProps) {
  return (
    <div className={cn("space-y-3", className)} role="status" aria-busy="true">
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-10 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-12 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

interface InlineLoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-6 w-6",
};

export function InlineLoader({ size = "md", className }: InlineLoaderProps) {
  return (
    <Loader2
      className={cn("animate-spin text-muted-foreground", sizeMap[size], className)}
      role="status"
      aria-label="Loading"
    />
  );
}

interface StatsCardLoaderProps {
  count?: number;
  className?: string;
}

export function StatsCardLoader({ count = 4, className }: StatsCardLoaderProps) {
  return (
    <div
      className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}
      role="status"
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}
