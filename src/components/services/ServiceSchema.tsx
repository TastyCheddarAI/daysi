interface ServiceSchemaProps {
  serviceName: string;
  description: string;
  provider: string;
  areaServed: string;
  url: string;
  image?: string;
  priceRange?: string;
}

export function ServiceSchema({
  serviceName,
  description,
  provider,
  areaServed,
  url,
  image,
  priceRange,
}: ServiceSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: serviceName,
    description: description,
    provider: {
      "@type": "LocalBusiness",
      name: provider,
      areaServed: areaServed,
    },
    url: url,
    ...(image && { image }),
    ...(priceRange && { priceRange }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
