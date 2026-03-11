import { useMemo, useState } from "react";
import {
  CreditCard,
  RefreshCw,
  Users,
  Sparkles,
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  BookOpen,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-states";
import { StatsCardLoader } from "@/components/ui/loading-states";
import {
  useDaysiMembershipPerformanceReport,
  useDaysiAdminMembershipPlans,
  useCreateDaysiAdminMembershipPlan,
  useUpdateDaysiAdminMembershipPlan,
  useDeleteDaysiAdminMembershipPlan,
  type DaysiMembershipPlanInput,
} from "@/hooks/useDaysiAdminBookings";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";
import { Progress } from "@/components/ui/progress";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

const formatMoney = (amountCents: number, currency: string = "CAD") =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);

interface PlanFormData {
  planName: string;
  planSlug: string;
  description: string;
  educationOnly: boolean;
  status: "active" | "inactive" | "archived";
  recurringAmountCents: number;
  currency: string;
  serviceAllowanceQuantity: number;
  serviceAllowancePeriodMonths: number;
  signupFeeAmountCents: number;
  commitmentMonths: number;
  benefits: string;
}

const defaultFormData: PlanFormData = {
  planName: "",
  planSlug: "",
  description: "",
  educationOnly: false,
  status: "active",
  recurringAmountCents: 0,
  currency: "CAD",
  serviceAllowanceQuantity: 0,
  serviceAllowancePeriodMonths: 1,
  signupFeeAmountCents: 0,
  commitmentMonths: 0,
  benefits: "",
};

export default function AdminMemberships() {
  const locationSlug = DAYSI_DEFAULT_LOCATION_SLUG;
  const membershipQuery = useDaysiMembershipPerformanceReport(locationSlug);
  const plansQuery = useDaysiAdminMembershipPlans(locationSlug);
  const createPlan = useCreateDaysiAdminMembershipPlan();
  const updatePlan = useUpdateDaysiAdminMembershipPlan();
  const deletePlan = useDeleteDaysiAdminMembershipPlan();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<string | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(defaultFormData);

  const stats = useMemo(() => {
    const data = membershipQuery.data;
    return {
      totalSubscriptions: data?.totals.totalSubscriptions ?? 0,
      activeSubscriptions: data?.totals.activeSubscriptionCount ?? 0,
      pendingSubscriptions: data?.totals.pendingSubscriptionCount ?? 0,
      cancelledSubscriptions: data?.totals.cancelledSubscriptionCount ?? 0,
      educationOnly: data?.totals.educationOnlyActiveSubscriptionCount ?? 0,
      serviceMemberships: data?.totals.serviceMembershipActiveSubscriptionCount ?? 0,
      activeRecurring: data?.totals.activeRecurringAmount.amountCents ?? 0,
      currency: data?.totals.activeRecurringAmount.currency ?? "CAD",
      totalAllowance: data?.totals.serviceAllowanceTotalQuantity ?? 0,
      usedAllowance: data?.totals.serviceAllowanceUsedQuantity ?? 0,
      remainingAllowance: data?.totals.serviceAllowanceRemainingQuantity ?? 0,
    };
  }, [membershipQuery.data]);

  const allowancePercent = useMemo(() => {
    if (stats.totalAllowance === 0) return 0;
    return Math.round((stats.usedAllowance / stats.totalAllowance) * 100);
  }, [stats]);

  const loading = membershipQuery.isLoading || plansQuery.isLoading;

  const handleCreate = () => {
    setFormData(defaultFormData);
    setIsCreateOpen(true);
  };

  const handleEdit = (plan: { planSlug: string; planName: string; description?: string; educationOnly: boolean; status: string; recurringAmount: { amountCents: number; currency: string }; serviceAllowanceQuantity: number; serviceAllowancePeriodMonths: number; signupFeeAmount?: { amountCents: number; currency: string }; commitmentMonths?: number; benefits?: string[] }) => {
    setFormData({
      planName: plan.planName,
      planSlug: plan.planSlug,
      description: plan.description || "",
      educationOnly: plan.educationOnly,
      status: plan.status as "active" | "inactive" | "archived",
      recurringAmountCents: plan.recurringAmount.amountCents / 100,
      currency: plan.recurringAmount.currency,
      serviceAllowanceQuantity: plan.serviceAllowanceQuantity,
      serviceAllowancePeriodMonths: plan.serviceAllowancePeriodMonths,
      signupFeeAmountCents: plan.signupFeeAmount ? plan.signupFeeAmount.amountCents / 100 : 0,
      commitmentMonths: plan.commitmentMonths || 0,
      benefits: plan.benefits?.join("\n") || "",
    });
    setEditingPlan(plan.planSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: DaysiMembershipPlanInput = {
      planName: formData.planName,
      description: formData.description,
      educationOnly: formData.educationOnly,
      status: formData.status,
      recurringAmountCents: Math.round(formData.recurringAmountCents * 100),
      currency: formData.currency,
      serviceAllowanceQuantity: formData.educationOnly ? 0 : formData.serviceAllowanceQuantity,
      serviceAllowancePeriodMonths: formData.serviceAllowancePeriodMonths,
      signupFeeAmountCents: formData.signupFeeAmountCents > 0 ? Math.round(formData.signupFeeAmountCents * 100) : undefined,
      commitmentMonths: formData.commitmentMonths > 0 ? formData.commitmentMonths : undefined,
      benefits: formData.benefits.split("\n").filter(b => b.trim()),
    };

    if (editingPlan) {
      await updatePlan.mutateAsync({ locationSlug, planSlug: editingPlan, data });
      setEditingPlan(null);
    } else {
      await createPlan.mutateAsync({ locationSlug, data: { ...data, planSlug: formData.planSlug } });
      setIsCreateOpen(false);
    }
    setFormData(defaultFormData);
  };

  const handleDelete = async () => {
    if (deletingPlan) {
      await deletePlan.mutateAsync({ locationSlug, planSlug: deletingPlan });
      setDeletingPlan(null);
    }
  };

  const handleToggleStatus = async (planSlug: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    await updatePlan.mutateAsync({
      locationSlug,
      planSlug,
      data: { status: newStatus },
    });
  };

  if (membershipQuery.error || plansQuery.error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Memberships</h1>
          <p className="text-muted-foreground mt-1">Membership plan management</p>
        </div>
        <EmptyState
          title="Failed to load memberships"
          description="The membership data could not be loaded."
          action={{ label: "Retry", onClick: () => { membershipQuery.refetch(); plansQuery.refetch(); } }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Memberships</h1>
          <p className="text-muted-foreground mt-1">Manage membership plans and subscribers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => { membershipQuery.refetch(); plansQuery.refetch(); }} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            New Plan
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <StatsCardLoader count={4} />
      ) : (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Members
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
              <span className="text-muted-foreground text-xs">
                {stats.pendingSubscriptions} pending
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Monthly Recurring
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatMoney(stats.activeRecurring, stats.currency)}
              </div>
              <span className="text-muted-foreground text-xs">Active MRR</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Education Only
              </CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.educationOnly}</div>
              <span className="text-muted-foreground text-xs">Learning access</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Service Members
              </CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.serviceMemberships}</div>
              <span className="text-muted-foreground text-xs">With service credits</span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Service Allowance Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Service Credit Usage</CardTitle>
          <CardDescription>Across all active service memberships</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats.totalAllowance === 0 ? (
            <EmptyState
              title="No service credits in use"
              description="Service credit usage will appear here once members start using their allowances."
              icon={<Sparkles className="h-8 w-8" />}
            />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.usedAllowance}</p>
                  <p className="text-sm text-muted-foreground">Credits used</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{stats.remainingAllowance}</p>
                  <p className="text-sm text-muted-foreground">Credits remaining</p>
                </div>
              </div>
              <Progress value={allowancePercent} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                {allowancePercent}% of total credits used
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Plans List */}
      <Card>
        <CardHeader>
          <CardTitle>Membership Plans</CardTitle>
          <CardDescription>Active plans and their performance</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : plansQuery.data?.length === 0 ? (
            <EmptyState
              title="No membership plans"
              description="Create your first membership plan to get started"
              action={{ label: "Create Plan", onClick: handleCreate }}
            />
          ) : (
            <div className="space-y-3">
              {plansQuery.data?.map((plan) => (
                <div
                  key={plan.planSlug}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{plan.planName}</h3>
                      {plan.educationOnly && (
                        <Badge variant="secondary">Education Only</Badge>
                      )}
                      <Badge variant={plan.status === "active" ? "default" : "secondary"}>
                        {plan.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{formatMoney(plan.recurringAmount.amountCents, plan.recurringAmount.currency)}/mo</span>
                      {!plan.educationOnly && (
                        <span>{plan.serviceAllowanceQuantity} credits / {plan.serviceAllowancePeriodMonths}mo</span>
                      )}
                      {plan.commitmentMonths && (
                        <span>{plan.commitmentMonths}mo commitment</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={plan.status === "active"}
                      onCheckedChange={() => handleToggleStatus(plan.planSlug, plan.status)}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(plan)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeletingPlan(plan.planSlug)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Report */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Performance</CardTitle>
          <CardDescription>Subscriber metrics by plan</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : membershipQuery.data?.plans.length === 0 ? (
            <EmptyState
              title="No performance data"
              description="Performance metrics will appear once you have active subscribers"
            />
          ) : (
            <div className="space-y-3">
              {membershipQuery.data?.plans.map((plan) => (
                <div
                  key={plan.planSlug}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{plan.planName}</h3>
                      {plan.educationOnly && (
                        <Badge variant="secondary">Education Only</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{plan.totalSubscriptions} subscribers</span>
                      <span>{plan.activeSubscriptionCount} active</span>
                      <span>
                        {formatMoney(plan.activeRecurringAmount.amountCents, plan.activeRecurringAmount.currency)}/mo
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {plan.serviceAllowanceUsedQuantity} / {plan.serviceAllowanceTotalQuantity}
                    </p>
                    <p className="text-xs text-muted-foreground">Credits used</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || !!editingPlan} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingPlan(null);
          setFormData(defaultFormData);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Create Membership Plan"}</DialogTitle>
            <DialogDescription>
              {editingPlan 
                ? "Update the membership plan details" 
                : "Create a new membership plan for your customers"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="planName">Plan Name</Label>
              <Input
                id="planName"
                value={formData.planName}
                onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                placeholder="e.g., Glow Membership"
                required
              />
            </div>

            {!editingPlan && (
              <div className="space-y-2">
                <Label htmlFor="planSlug">Plan Slug</Label>
                <Input
                  id="planSlug"
                  value={formData.planSlug}
                  onChange={(e) => setFormData({ ...formData, planSlug: e.target.value })}
                  placeholder="e.g., glow-membership"
                  required
                  pattern="[a-z0-9-]+"
                  title="Lowercase letters, numbers, and hyphens only"
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier used in URLs (lowercase, numbers, hyphens only)
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the benefits of this membership..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="educationOnly">Education Only</Label>
                <p className="text-xs text-muted-foreground">
                  Members only get access to learning content, no service credits
                </p>
              </div>
              <Switch
                id="educationOnly"
                checked={formData.educationOnly}
                onCheckedChange={(checked) => setFormData({ ...formData, educationOnly: checked })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recurringAmount">Monthly Price</Label>
                <Input
                  id="recurringAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.recurringAmountCents || ""}
                  onChange={(e) => setFormData({ ...formData, recurringAmountCents: parseFloat(e.target.value) || 0 })}
                  placeholder="99.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!formData.educationOnly && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serviceAllowance">Monthly Credits</Label>
                  <Input
                    id="serviceAllowance"
                    type="number"
                    min="0"
                    value={formData.serviceAllowanceQuantity || ""}
                    onChange={(e) => setFormData({ ...formData, serviceAllowanceQuantity: parseInt(e.target.value) || 0 })}
                    placeholder="1"
                    required={!formData.educationOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allowancePeriod">Credit Period (months)</Label>
                  <Input
                    id="allowancePeriod"
                    type="number"
                    min="1"
                    value={formData.serviceAllowancePeriodMonths || ""}
                    onChange={(e) => setFormData({ ...formData, serviceAllowancePeriodMonths: parseInt(e.target.value) || 1 })}
                    placeholder="1"
                    required={!formData.educationOnly}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="signupFee">Signup Fee (optional)</Label>
                <Input
                  id="signupFee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.signupFeeAmountCents || ""}
                  onChange={(e) => setFormData({ ...formData, signupFeeAmountCents: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commitment">Commitment (months, optional)</Label>
                <Input
                  id="commitment"
                  type="number"
                  min="0"
                  value={formData.commitmentMonths || ""}
                  onChange={(e) => setFormData({ ...formData, commitmentMonths: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="benefits">Benefits (one per line)</Label>
              <Textarea
                id="benefits"
                value={formData.benefits}
                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                placeholder="Priority booking&#10;10% off retail products&#10;Exclusive member events"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "active" | "inactive" | "archived") => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingPlan(null);
                  setFormData(defaultFormData);
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createPlan.isPending || updatePlan.isPending}
              >
                {editingPlan ? "Save Changes" : "Create Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPlan} onOpenChange={(open) => !open && setDeletingPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Membership Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this membership plan? This action cannot be undone.
              Active subscriptions will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingPlan(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
