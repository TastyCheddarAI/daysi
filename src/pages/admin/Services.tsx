import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Clock,
  DollarSign,
  Edit,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-states";
import {
  useDaysiAdminServices,
  useCreateDaysiAdminService,
  useUpdateDaysiAdminService,
  useDeleteDaysiAdminService,
  usePauseDaysiAdminService,
  type DaysiAdminServiceInput,
} from "@/hooks/useDaysiAdminBookings";
import { useDaysiAdminSession } from "@/hooks/useDaysiAdminSession";
import { DAYSI_DEFAULT_LOCATION_SLUG, getDaysiCategoryLabel } from "@/lib/daysi-public-api";
import type { DaysiPublicService } from "@/lib/daysi-admin-api";

const SERVICE_CATEGORIES = [
  { value: "laser", label: "Laser Treatments" },
  { value: "skin", label: "Skin Treatments" },
  { value: "consultation", label: "Consultations" },
  { value: "education", label: "Education" },
];

const DEFAULT_SERVICE: DaysiAdminServiceInput = {
  slug: "",
  variantSlug: "standard",
  categorySlug: "skin",
  name: "",
  shortDescription: "",
  durationMinutes: 60,
  bookable: true,
  retailAmountCents: 0,
  memberAmountCents: 0,
  membershipRequired: false,
  machineCapabilities: [],
  roomCapabilities: [],
  featureTags: [],
};

function formatMoney(amountCents: number, currency: string = "CAD") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

function ServiceForm({
  service,
  onChange,
  isEditing = false,
}: {
  service: DaysiAdminServiceInput;
  onChange: (service: DaysiAdminServiceInput) => void;
  isEditing?: boolean;
}) {
  const [tagInput, setTagInput] = useState("");

  const addTag = () => {
    if (tagInput.trim() && !service.featureTags.includes(tagInput.trim())) {
      onChange({ ...service, featureTags: [...service.featureTags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    onChange({ ...service, featureTags: service.featureTags.filter((t: string) => t !== tag) });
  };

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="service-slug">Service Slug *</Label>
          <Input
            id="service-slug"
            value={service.slug}
            onChange={(e) => onChange({ ...service, slug: e.target.value })}
            placeholder="e.g., laser-hair-removal"
            disabled={isEditing}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Unique identifier, lowercase with hyphens
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="service-variant">Variant Slug</Label>
          <Input
            id="service-variant"
            value={service.variantSlug}
            onChange={(e) => onChange({ ...service, variantSlug: e.target.value })}
            placeholder="e.g., standard"
            className="font-mono text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="service-name">Service Name *</Label>
        <Input
          id="service-name"
          value={service.name}
          onChange={(e) => onChange({ ...service, name: e.target.value })}
          placeholder="e.g., Laser Hair Removal"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="service-description">Short Description *</Label>
        <Input
          id="service-description"
          value={service.shortDescription}
          onChange={(e) => onChange({ ...service, shortDescription: e.target.value })}
          placeholder="Brief description of the service"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="service-category">Category</Label>
          <Select
            value={service.categorySlug}
            onValueChange={(value) => onChange({ ...service, categorySlug: value })}
          >
            <SelectTrigger id="service-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="service-duration">Duration (minutes)</Label>
          <Input
            id="service-duration"
            type="number"
            min={5}
            step={5}
            value={service.durationMinutes}
            onChange={(e) =>
              onChange({ ...service, durationMinutes: parseInt(e.target.value) || 0 })
            }
          />
        </div>
      </div>

      <Separator className="my-4" />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="service-retail">Retail Price (cents)</Label>
          <Input
            id="service-retail"
            type="number"
            min={0}
            step={100}
            value={service.retailAmountCents}
            onChange={(e) =>
              onChange({ ...service, retailAmountCents: parseInt(e.target.value) || 0 })
            }
          />
          <p className="text-xs text-muted-foreground">
            {formatMoney(service.retailAmountCents)}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="service-member">Member Price (cents, optional)</Label>
          <Input
            id="service-member"
            type="number"
            min={0}
            step={100}
            value={service.memberAmountCents || ""}
            onChange={(e) =>
              onChange({
                ...service,
                memberAmountCents: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
          />
          <p className="text-xs text-muted-foreground">
            {service.memberAmountCents ? formatMoney(service.memberAmountCents) : "No member discount"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between space-x-2 pt-2">
        <div className="flex items-center space-x-2">
          <Switch
            id="service-bookable"
            checked={service.bookable}
            onCheckedChange={(checked) => onChange({ ...service, bookable: checked })}
          />
          <Label htmlFor="service-bookable" className="cursor-pointer">
            Bookable online
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="service-membership-required"
            checked={service.membershipRequired}
            onCheckedChange={(checked) => onChange({ ...service, membershipRequired: checked })}
          />
          <Label htmlFor="service-membership-required" className="cursor-pointer">
            Membership required
          </Label>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="space-y-2">
        <Label>Feature Tags</Label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Add a tag (e.g., 'popular', 'new')"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addTag}>
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {service.featureTags.map((tag: string) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminServices() {
  const session = useDaysiAdminSession();
  const locationSlug = DAYSI_DEFAULT_LOCATION_SLUG;

  const servicesQuery = useDaysiAdminServices(locationSlug);
  const createMutation = useCreateDaysiAdminService();
  const updateMutation = useUpdateDaysiAdminService();
  const deleteMutation = useDeleteDaysiAdminService();
  const pauseMutation = usePauseDaysiAdminService();

  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<DaysiPublicService | null>(null);
  const [newService, setNewService] = useState<DaysiAdminServiceInput>(DEFAULT_SERVICE);
  const [editForm, setEditForm] = useState<Partial<DaysiAdminServiceInput>>({});

  const filteredServices = useMemo(() => {
    const services = servicesQuery.data ?? [];
    if (!searchQuery.trim()) return services;
    const query = searchQuery.toLowerCase();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.slug.toLowerCase().includes(query) ||
        s.shortDescription.toLowerCase().includes(query)
    );
  }, [servicesQuery.data, searchQuery]);

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync({ locationSlug, service: newService });
      toast.success("Service created successfully");
      setIsCreateDialogOpen(false);
      setNewService(DEFAULT_SERVICE);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create service");
    }
  };

  const handleEdit = (service: DaysiPublicService) => {
    setSelectedService(service);
    setEditForm({
      name: service.name,
      shortDescription: service.shortDescription,
      durationMinutes: service.durationMinutes,
      bookable: service.bookable,
      retailAmountCents: service.price.retailAmountCents,
      memberAmountCents: service.price.memberAmountCents,
      membershipRequired: service.price.membershipRequired,
      featureTags: service.featureTags,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedService) return;
    try {
      await updateMutation.mutateAsync({
        locationSlug,
        serviceSlug: selectedService.slug,
        service: editForm,
      });
      toast.success("Service updated successfully");
      setIsEditDialogOpen(false);
      setSelectedService(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update service");
    }
  };

  const handleDelete = (service: DaysiPublicService) => {
    setSelectedService(service);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedService) return;
    try {
      await deleteMutation.mutateAsync({
        locationSlug,
        serviceSlug: selectedService.slug,
      });
      toast.success("Service deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedService(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete service");
    }
  };

  const handlePauseToggle = async (service: DaysiPublicService) => {
    try {
      await pauseMutation.mutateAsync({
        locationSlug,
        serviceSlug: service.slug,
        paused: service.bookable,
      });
      toast.success(service.bookable ? "Service paused" : "Service resumed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update service status");
    }
  };

  const isLoading = servicesQuery.isLoading || !session.ready;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Services</h1>
          <p className="text-muted-foreground mt-1">Manage your service catalog</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Service
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Service Catalog</CardTitle>
              <CardDescription>
                {filteredServices.length} service{filteredServices.length !== 1 ? "s" : ""} available
              </CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredServices.length === 0 ? (
            <EmptyState
              title="No services found"
              description={
                searchQuery
                  ? "Try adjusting your search query"
                  : "Get started by adding your first service"
              }
              action={
                !searchQuery
                  ? { label: "Add Service", onClick: () => setIsCreateDialogOpen(true) }
                  : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    service.bookable
                      ? "bg-card hover:bg-muted/50"
                      : "bg-muted/30 opacity-75"
                  }`}
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        service.bookable ? "bg-primary/10" : "bg-muted"
                      }`}
                    >
                      <Sparkles
                        className={`w-5 h-5 ${
                          service.bookable ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{service.name}</h3>
                        {!service.bookable && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                            Paused
                          </span>
                        )}
                        {service.price.membershipRequired && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                            Members Only
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {service.shortDescription}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {getDaysiCategoryLabel(service.categorySlug)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {service.durationMinutes} min
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {formatMoney(service.price.retailAmountCents)}
                          {service.price.memberAmountCents !== undefined && (
                            <span className="text-green-600">
                              {" "}
                              / {formatMoney(service.price.memberAmountCents)} member
                            </span>
                          )}
                        </span>
                      </div>
                      {service.featureTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {service.featureTags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 bg-secondary text-secondary-foreground text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {service.featureTags.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{service.featureTags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(service)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePauseToggle(service)}>
                        {service.bookable ? (
                          <>
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Resume
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(service)}
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
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Add New Service</DialogTitle>
            <DialogDescription>Create a new service for your catalog</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <ServiceForm service={newService} onChange={setNewService} />
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !newService.slug || !newService.name || !newService.shortDescription || createMutation.isPending
              }
            >
              {createMutation.isPending ? "Creating..." : "Create Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>Update service details</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {selectedService && (
              <ServiceForm
                service={{ ...DEFAULT_SERVICE, ...selectedService, ...editForm }}
                onChange={(updated) => setEditForm({ ...editForm, ...updated })}
                isEditing
              />
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Service
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedService?.name}&quot;? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
