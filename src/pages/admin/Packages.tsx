import { useMemo, useState } from "react";
import {
  AlertTriangle,
  DollarSign,
  Edit,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { SEO } from "@/components/SEO";
import { PackageFormDialog, type PackageFormValues } from "@/components/admin/packages/PackageFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-states";
import {
  useDaysiAdminCatalog,
  useCreateDaysiAdminServicePackage,
  useUpdateDaysiAdminServicePackage,
  useDeleteDaysiAdminServicePackage,
} from "@/hooks/useDaysiAdminCatalog";
import type { DaysiPublicServicePackage } from "@/lib/daysi-admin-api";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";

const formatMoney = (amountCents: number, currency: string = "CAD") =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);

export default function AdminPackages() {
  const locationSlug = DAYSI_DEFAULT_LOCATION_SLUG;
  const catalog = useDaysiAdminCatalog(locationSlug);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<DaysiPublicServicePackage | null>(null);

  const services = catalog.servicesQuery.data ?? [];
  const packages = catalog.packagesQuery.data ?? [];

  const filteredPackages = useMemo(() => {
    if (!searchQuery.trim()) return packages;
    const query = searchQuery.toLowerCase();
    return packages.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.slug.toLowerCase().includes(query) ||
        p.shortDescription.toLowerCase().includes(query)
    );
  }, [packages, searchQuery]);

  const createPackage = useCreateDaysiAdminServicePackage();
  const updatePackage = useUpdateDaysiAdminServicePackage();
  const deletePackage = useDeleteDaysiAdminServicePackage();

  const handleCreate = async (values: PackageFormValues) => {
    try {
      await createPackage.mutateAsync({
        ...values,
        locationSlug,
      });
      setIsCreateDialogOpen(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleEdit = (pkg: DaysiPublicServicePackage) => {
    setSelectedPackage(pkg);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (values: PackageFormValues) => {
    if (!selectedPackage) return;
    try {
      await updatePackage.mutateAsync({
        ...values,
        locationSlug,
        slug: selectedPackage.slug,
      });
      setIsEditDialogOpen(false);
      setSelectedPackage(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleDelete = (pkg: DaysiPublicServicePackage) => {
    setSelectedPackage(pkg);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedPackage) return;
    try {
      await deletePackage.mutateAsync({
        locationSlug,
        slug: selectedPackage.slug,
      });
      setIsDeleteDialogOpen(false);
      setSelectedPackage(null);
    } catch {
      // Error handled by mutation
    }
  };

  const loading = catalog.packagesQuery.isLoading || catalog.servicesQuery.isLoading;

  return (
    <>
      <SEO
        title="Service Packages | Admin"
        description="Manage bundled service packages"
        keywords="daysi, admin, packages, bundles"
      />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Service Packages</h1>
            <p className="text-muted-foreground mt-1">Manage bundled service packages</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Package
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Packages</CardTitle>
                <CardDescription>
                  {filteredPackages.length} package{filteredPackages.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search packages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredPackages.length === 0 ? (
              <EmptyState
                title="No packages found"
                description={
                  searchQuery
                    ? "Try adjusting your search query"
                    : "Create your first service package"
                }
                action={
                  !searchQuery
                    ? { label: "Add Package", onClick: () => setIsCreateDialogOpen(true) }
                    : undefined
                }
              />
            ) : (
              <div className="space-y-3">
                {filteredPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{pkg.name}</h3>
                          <Badge variant={pkg.status === "published" ? "default" : "secondary"}>
                            {pkg.status}
                          </Badge>
                          {pkg.featureTags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {pkg.shortDescription}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {formatMoney(pkg.price.amountCents, pkg.price.currency)}
                          </span>
                          <span>{pkg.serviceCredits.length} service credits</span>
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(pkg)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(pkg)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <PackageFormDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSubmit={handleCreate}
          services={services}
          isLoading={createPackage.isPending}
        />

        {/* Edit Dialog */}
        <PackageFormDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSubmit={handleUpdate}
          initialValues={selectedPackage ?? undefined}
          services={services}
          isLoading={updatePackage.isPending}
        />

        {/* Delete Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Delete Package
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{selectedPackage?.name}&quot;? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deletePackage.isPending}
              >
                {deletePackage.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
