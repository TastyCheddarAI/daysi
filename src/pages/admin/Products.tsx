import { useMemo, useState, type ReactNode } from "react";
import { BookOpen, Boxes, Package, RefreshCw, Search, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-states";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/loading-states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDaysiAdminCatalog } from "@/hooks/useDaysiAdminCatalog";

const formatMoney = (amountCents: number, currency: string = "CAD") =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);

export default function AdminProducts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("services");
  const catalog = useDaysiAdminCatalog();

  const loading =
    catalog.servicesQuery.isLoading ||
    catalog.productsQuery.isLoading ||
    catalog.educationQuery.isLoading ||
    catalog.packagesQuery.isLoading;

  const error =
    catalog.servicesQuery.error ||
    catalog.productsQuery.error ||
    catalog.educationQuery.error ||
    catalog.packagesQuery.error;

  const isRefreshing =
    catalog.servicesQuery.isFetching ||
    catalog.productsQuery.isFetching ||
    catalog.educationQuery.isFetching ||
    catalog.packagesQuery.isFetching;

  const filtered = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    const match = (value: string) => value.toLowerCase().includes(needle);

    return {
      services: (catalog.servicesQuery.data ?? []).filter(
        (service) =>
          !needle ||
          match(service.name) ||
          match(service.slug) ||
          match(service.categorySlug) ||
          service.featureTags.some(match),
      ),
      products: (catalog.productsQuery.data ?? []).filter(
        (product) => !needle || match(product.name) || match(product.slug),
      ),
      education: (catalog.educationQuery.data ?? []).filter(
        (offer) =>
          !needle ||
          match(offer.title) ||
          match(offer.slug) ||
          offer.moduleSlugs.some(match),
      ),
      packages: (catalog.packagesQuery.data ?? []).filter(
        (servicePackage) =>
          !needle ||
          match(servicePackage.name) ||
          match(servicePackage.slug) ||
          servicePackage.featureTags.some(match),
      ),
    };
  }, [
    catalog.educationQuery.data,
    catalog.packagesQuery.data,
    catalog.productsQuery.data,
    catalog.servicesQuery.data,
    searchQuery,
  ]);

  const refreshAll = () =>
    Promise.all([
      catalog.servicesQuery.refetch(),
      catalog.productsQuery.refetch(),
      catalog.educationQuery.refetch(),
      catalog.packagesQuery.refetch(),
    ]);

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Catalog</h1>
          <p className="text-muted-foreground">Daysi service, retail, education, and package catalog</p>
        </div>
        <EmptyState
          title="Failed to load catalog"
          description="The Daysi catalog overview could not be loaded."
          action={{ label: "Retry", onClick: refreshAll }}
        />
      </div>
    );
  }

  if (loading) {
    return <PageLoader message="Loading Daysi catalog..." />;
  }

  const statCards = [
    {
      title: "Services",
      value: String(catalog.servicesQuery.data?.length ?? 0),
      description: "Bookable treatment definitions",
      icon: Sparkles,
    },
    {
      title: "Retail Products",
      value: String(catalog.productsQuery.data?.length ?? 0),
      description: "Internal standalone products",
      icon: Boxes,
    },
    {
      title: "Education Offers",
      value: String(catalog.educationQuery.data?.length ?? 0),
      description: "Paid or free learning offers",
      icon: BookOpen,
    },
    {
      title: "Service Packages",
      value: String(catalog.packagesQuery.data?.length ?? 0),
      description: "Prepaid bundle offers",
      icon: Package,
    },
  ];

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">Catalog</h1>
          <p className="text-muted-foreground">
            Daysi-owned service, product, education, and package definitions
          </p>
        </div>
        <Button variant="outline" onClick={refreshAll} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium truncate">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search catalog..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="products">Retail</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <CatalogTable
            emptyText="No services match the current filter."
            columns={["Service", "Category", "Price", "Duration", "Status"]}
            rows={filtered.services.map((service) => [
              <div key={`${service.slug}-name`} className="space-y-1">
                <div className="font-medium">{service.name}</div>
                <div className="text-xs text-muted-foreground">{service.slug}</div>
              </div>,
              <Badge key={`${service.slug}-category`} variant="outline">
                {service.categorySlug}
              </Badge>,
              <span key={`${service.slug}-price`}>
                {formatMoney(service.price.retailAmountCents, service.price.currency)}
              </span>,
              <span key={`${service.slug}-duration`}>{service.durationMinutes} min</span>,
              <Badge
                key={`${service.slug}-status`}
                className={service.bookable ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800"}
              >
                {service.bookable ? "Bookable" : "Hidden"}
              </Badge>,
            ])}
          />
        </TabsContent>

        <TabsContent value="products">
          <CatalogTable
            emptyText="No retail products match the current filter."
            columns={["Product", "Price"]}
            rows={filtered.products.map((product) => [
              <div key={`${product.slug}-name`} className="space-y-1">
                <div className="font-medium">{product.name}</div>
                <div className="text-xs text-muted-foreground">{product.slug}</div>
              </div>,
              <span key={`${product.slug}-price`}>
                {formatMoney(product.price.amountCents, product.price.currency)}
              </span>,
            ])}
          />
        </TabsContent>

        <TabsContent value="education">
          <CatalogTable
            emptyText="No education offers match the current filter."
            columns={["Offer", "Status", "Price", "Modules"]}
            rows={filtered.education.map((offer) => [
              <div key={`${offer.slug}-name`} className="space-y-1">
                <div className="font-medium">{offer.title}</div>
                <div className="text-xs text-muted-foreground">{offer.slug}</div>
              </div>,
              <Badge
                key={`${offer.slug}-status`}
                className={offer.status === "published" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}
              >
                {offer.status}
              </Badge>,
              <span key={`${offer.slug}-price`}>
                {offer.price.isFree
                  ? "Free"
                  : formatMoney(offer.price.amountCents, offer.price.currency)}
              </span>,
              <span key={`${offer.slug}-modules`}>{offer.moduleSlugs.length}</span>,
            ])}
          />
        </TabsContent>

        <TabsContent value="packages">
          <CatalogTable
            emptyText="No service packages match the current filter."
            columns={["Package", "Status", "Price", "Credits"]}
            rows={filtered.packages.map((servicePackage) => [
              <div key={`${servicePackage.slug}-name`} className="space-y-1">
                <div className="font-medium">{servicePackage.name}</div>
                <div className="text-xs text-muted-foreground">{servicePackage.slug}</div>
              </div>,
              <Badge
                key={`${servicePackage.slug}-status`}
                className={servicePackage.status === "published" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}
              >
                {servicePackage.status}
              </Badge>,
              <span key={`${servicePackage.slug}-price`}>
                {formatMoney(servicePackage.price.amountCents, servicePackage.price.currency)}
              </span>,
              <span key={`${servicePackage.slug}-credits`}>
                {servicePackage.serviceCredits.reduce(
                  (total, credit) => total + credit.quantity,
                  0,
                )}{" "}
                credits
              </span>,
            ])}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CatalogTable(input: {
  columns: string[];
  rows: ReactNode[][];
  emptyText: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {input.columns.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {input.rows.length > 0 ? (
              input.rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <TableCell key={`${rowIndex}-${cellIndex}`}>{cell}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={input.columns.length} className="py-8 text-center text-muted-foreground">
                  {input.emptyText}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
