import { Loader2 } from "lucide-react";
import { PricingCard } from "./PricingCard";
import {
  useDaysiBookableServices,
  useDaysiPublicServicePackages,
} from "@/hooks/useDaysiPublicBooking";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";

export function FeaturedPackages() {
  const { data: servicePackages, isLoading } = useDaysiPublicServicePackages(
    DAYSI_DEFAULT_LOCATION_SLUG,
  );
  const { data: services } = useDaysiBookableServices(DAYSI_DEFAULT_LOCATION_SLUG);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!servicePackages || servicePackages.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>No packages available at this time.</p>
      </div>
    );
  }

  const serviceNameBySlug = Object.fromEntries(
    (services ?? []).map((service) => [service.slug, service.name]),
  );
  const sortedByPrice = [...servicePackages].sort(
    (left, right) => left.price.amountCents - right.price.amountCents,
  );
  const middleIndex = Math.floor(sortedByPrice.length / 2);
  const popularId = servicePackages.find((entry) =>
    entry.name.toLowerCase().includes("glow"),
  )?.id 
    || sortedByPrice[middleIndex]?.id;

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
      {servicePackages.map((servicePackage, index) => (
        <PricingCard
          key={servicePackage.id}
          servicePackage={servicePackage}
          serviceNameBySlug={serviceNameBySlug}
          index={index}
          isPopular={servicePackage.id === popularId}
        />
      ))}
    </div>
  );
}
