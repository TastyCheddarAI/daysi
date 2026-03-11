import { useState } from "react";
import {
  FileText,
  Plus,
  Pencil,
  Eye,
  Copy,
  Trash2,
  CheckCircle,
  Clock,
  Users,
  GripVertical,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-states";
import { StatsCardLoader } from "@/components/ui/loading-states";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";
import { toast } from "sonner";
import {
  useDaysiAdminIntakeForms,
  useCreateDaysiAdminIntakeForm,
  useUpdateDaysiAdminIntakeForm,
  useDeleteDaysiAdminIntakeForm,
} from "@/hooks/useDaysiAdminIntakeForms";
import type { DaysiAdminIntakeForm, FormField, IntakeFormStatus } from "@/lib/daysi-admin-api";

const fieldTypeLabels: Record<string, string> = {
  text: "Text Input",
  textarea: "Long Text",
  select: "Dropdown",
  multiselect: "Multi Select",
  checkbox: "Checkbox",
  date: "Date",
  signature: "E-Signature",
};

export default function AdminIntakeForms() {
  const locationSlug = DAYSI_DEFAULT_LOCATION_SLUG;
  const { data: forms = [], isLoading, refetch, isFetching } = useDaysiAdminIntakeForms({ locationSlug });
  const createForm = useCreateDaysiAdminIntakeForm();
  const updateForm = useUpdateDaysiAdminIntakeForm();
  const deleteForm = useDeleteDaysiAdminIntakeForm();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<DaysiAdminIntakeForm | null>(null);
  const [previewForm, setPreviewForm] = useState<DaysiAdminIntakeForm | null>(null);
  const [newFormName, setNewFormName] = useState("");
  const [newFormDescription, setNewFormDescription] = useState("");

  const handleToggleStatus = async (form: DaysiAdminIntakeForm) => {
    const newStatus: IntakeFormStatus = form.status === "active" ? "inactive" as IntakeFormStatus : "active";
    try {
      await updateForm.mutateAsync({
        formId: form.id,
        locationSlug,
        status: newStatus,
      });
      toast.success("Form status updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    }
  };

  const handleDuplicate = async (form: DaysiAdminIntakeForm) => {
    try {
      await createForm.mutateAsync({
        locationSlug,
        name: `${form.name} (Copy)`,
        description: form.description,
        fields: form.fields,
        assignedServices: form.assignedServices,
        requiredForBooking: form.requiredForBooking,
      });
      toast.success("Form duplicated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to duplicate form");
    }
  };

  const handleDelete = async (formId: string) => {
    try {
      await deleteForm.mutateAsync({ formId, locationSlug });
      toast.success("Form deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete form");
    }
  };

  const handleCreate = async () => {
    if (!newFormName.trim()) {
      toast.error("Form name is required");
      return;
    }
    try {
      await createForm.mutateAsync({
        locationSlug,
        name: newFormName,
        description: newFormDescription,
      });
      toast.success("Form created");
      setIsCreateOpen(false);
      setNewFormName("");
      setNewFormDescription("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create form");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Intake Forms</h1>
            <p className="text-muted-foreground mt-1">Create and manage patient intake forms</p>
          </div>
          <Button disabled>
            <Plus className="h-4 w-4 mr-2" />
            New Form
          </Button>
        </div>
        <StatsCardLoader count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Intake Forms</h1>
          <p className="text-muted-foreground mt-1">Create and manage patient intake forms</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Form
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Forms</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {forms.filter((f) => f.status === "active").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Completions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {forms.reduce((sum, f) => sum + f.completionCount, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Draft Forms</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {forms.filter((f) => f.status === "draft").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forms List */}
      <Card>
        <CardHeader>
          <CardTitle>Forms</CardTitle>
          <CardDescription>Manage your intake and consent forms</CardDescription>
        </CardHeader>
        <CardContent>
          {forms.length === 0 ? (
            <EmptyState
              title="No forms created"
              description="Create your first intake form to collect patient information"
              action={{ label: "Create Form", onClick: () => setIsCreateOpen(true) }}
              icon={<FileText className="h-8 w-8" />}
            />
          ) : (
            <div className="space-y-3">
              {forms.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{form.name}</h3>
                      <Badge 
                        variant={form.status === "active" ? "default" : "secondary"}
                      >
                        {form.status}
                      </Badge>
                      {form.requiredForBooking && (
                        <Badge variant="outline">Required</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {form.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{form.fields.length} fields</span>
                      <span>{form.completionCount} completions</span>
                      <span>Updated {new Date(form.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewForm(form)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(form)}
                      disabled={updateForm.isPending}
                    >
                      {form.status === "active" ? (
                        <ToggleRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate(form)}
                      disabled={createForm.isPending}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingForm(form)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(form.id)}
                      disabled={deleteForm.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Form</DialogTitle>
            <DialogDescription>Start with a name and description</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="formName">Form Name</Label>
              <Input
                id="formName"
                value={newFormName}
                onChange={(e) => setNewFormName(e.target.value)}
                placeholder="e.g., Laser Hair Removal Consultation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="formDescription">Description</Label>
              <Textarea
                id="formDescription"
                value={newFormDescription}
                onChange={(e) => setNewFormDescription(e.target.value)}
                placeholder="Brief description of this form's purpose"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createForm.isPending}>
              {createForm.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                "Create Form"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewForm} onOpenChange={() => setPreviewForm(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewForm?.name}</DialogTitle>
            <DialogDescription>{previewForm?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {previewForm?.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {field.type === "text" && <Input placeholder={field.placeholder} disabled />}
                {field.type === "textarea" && (
                  <Textarea placeholder={field.placeholder} disabled />
                )}
                {field.type === "select" && (
                  <Select disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {field.type === "checkbox" && (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" disabled />
                    <span className="text-sm text-muted-foreground">{field.label}</span>
                  </div>
                )}
                {field.type === "signature" && (
                  <div className="h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
                    <span className="text-sm text-muted-foreground">Signature pad</span>
                  </div>
                )}
              </div>
            ))}
            {previewForm?.fields.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                This form has no fields yet. Edit the form to add fields.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewForm(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
