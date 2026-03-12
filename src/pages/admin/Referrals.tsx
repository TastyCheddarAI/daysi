import { useMemo, useState } from "react";
import {
  Gift,
  Users,
  Plus,
  Pencil,
  TrendingUp,
  DollarSign,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Pause,
  Play,
  RefreshCw,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";
import { toast } from "sonner";
import {
  useDaysiAdminReferralPrograms,
  useCreateDaysiAdminReferralProgram,
  useUpdateDaysiAdminReferralProgram,
} from "@/hooks/useDaysiAdminSettings";
import type { DaysiReferralProgram } from "@/lib/daysi-auth-api";

const formatMoney = (amountCents: number, currency: string = "CAD") =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);

interface ProgramFormData {
  name: string;
  codePrefix: string;
  status: "draft" | "active" | "inactive" | "archived";
  referredRewardCents: number;
  advocateRewardCents: number;
  enableSecondLevel: boolean;
  secondLevelRewardCents: number;
}

const defaultFormData: ProgramFormData = {
  name: "",
  codePrefix: "",
  status: "active",
  referredRewardCents: 2500,
  advocateRewardCents: 2500,
  enableSecondLevel: false,
  secondLevelRewardCents: 1000,
};

export default function AdminReferrals() {
  const locationSlug = DAYSI_DEFAULT_LOCATION_SLUG;
  const { data: programs = [], isLoading, refetch, isFetching } = useDaysiAdminReferralPrograms({ locationSlug });
  const createProgram = useCreateDaysiAdminReferralProgram();
  const updateProgram = useUpdateDaysiAdminReferralProgram();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<DaysiReferralProgram | null>(null);
  const [formData, setFormData] = useState<ProgramFormData>(defaultFormData);

  // Calculate stats from real data
  const stats = useMemo(() => {
    if (!programs) return null;
    return {
      totalPrograms: programs.length,
      activePrograms: programs.filter((p) => p.status === "active").length,
      totalInvites: 0,
      qualifiedInvites: 0,
      conversionRate: 0,
      totalRewardsGiven: 0,
      activeParticipants: 0,
    };
  }, [programs]);

  const handleCreate = () => {
    setFormData(defaultFormData);
    setIsCreateOpen(true);
  };

  const handleEdit = (program: DaysiReferralProgram) => {
    setFormData({
      name: program.name,
      codePrefix: program.codePrefix || "",
      status: program.status,
      referredRewardCents: program.referredReward?.amount.amountCents || 0,
      advocateRewardCents: program.advocateReward?.amount.amountCents || 0,
      enableSecondLevel: !!program.secondLevelReward,
      secondLevelRewardCents: program.secondLevelReward?.amount.amountCents || 1000,
    });
    setEditingProgram(program);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const rewardData = {
      referredReward: formData.referredRewardCents > 0 ? {
        kind: "account_credit" as const,
        amount: { currency: "CAD" as const, amountCents: formData.referredRewardCents },
      } : undefined,
      advocateReward: formData.advocateRewardCents > 0 ? {
        kind: "account_credit" as const,
        amount: { currency: "CAD" as const, amountCents: formData.advocateRewardCents },
      } : undefined,
      secondLevelReward: formData.enableSecondLevel && formData.secondLevelRewardCents > 0 ? {
        kind: "account_credit" as const,
        amount: { currency: "CAD" as const, amountCents: formData.secondLevelRewardCents },
      } : undefined,
    };

    try {
      if (editingProgram) {
        await updateProgram.mutateAsync({
          programId: editingProgram.id,
          name: formData.name,
          status: formData.status,
          codePrefix: formData.codePrefix,
          ...rewardData,
        });
        toast.success("Program updated!");
        setEditingProgram(null);
      } else {
        await createProgram.mutateAsync({
          locationSlug,
          name: formData.name,
          status: formData.status,
          codePrefix: formData.codePrefix,
          ...rewardData,
        });
        toast.success("Program created!");
        setIsCreateOpen(false);
      }
      setFormData(defaultFormData);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save program");
    }
  };

  const handleToggleStatus = async (program: DaysiReferralProgram) => {
    const newStatus = program.status === "active" ? "inactive" : "active";
    try {
      await updateProgram.mutateAsync({
        programId: program.id,
        status: newStatus,
      });
      toast.success(`Program ${newStatus === "active" ? "activated" : "paused"}`);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Referral Programs</h1>
          <p className="text-muted-foreground mt-1">Manage referral campaigns and rewards</p>
        </div>
        <StatsCardLoader count={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Referral Programs</h1>
          <p className="text-muted-foreground mt-1">Manage referral campaigns and rewards</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Program
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Programs
            </CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPrograms || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats?.activePrograms || 0} active
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Invites
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalInvites || 0}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              {stats?.qualifiedInvites || 0} qualified
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rewards Given
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMoney(stats?.totalRewardsGiven || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Total distributed
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Participants
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeParticipants || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Advocates & referrals
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Programs List */}
      <Card>
        <CardHeader>
          <CardTitle>Programs</CardTitle>
          <CardDescription>Active and past referral campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {programs.length === 0 ? (
            <EmptyState
              title="No referral programs"
              description="Create your first referral program to start growing your customer base"
              action={{ label: "Create Program", onClick: handleCreate }}
              icon={Gift}
            />
          ) : (
            <div className="space-y-4">
              {programs.map((program) => (
                <div
                  key={program.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{program.name}</h3>
                      <Badge 
                        variant={program.status === "active" ? "default" : "secondary"}
                      >
                        {program.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      {program.codePrefix && (
                        <span className="font-mono bg-muted px-2 py-0.5 rounded">
                          {program.codePrefix}*
                        </span>
                      )}
                      {program.referredReward && (
                        <span>
                          New user: {formatMoney(program.referredReward.amount.amountCents)}
                        </span>
                      )}
                      {program.advocateReward && (
                        <span>
                          Advocate: {formatMoney(program.advocateReward.amount.amountCents)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(program)}
                      disabled={updateProgram.isPending}
                    >
                      {program.status === "active" ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(program)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Program Performance</CardTitle>
          <CardDescription>Referral activity over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Performance charts coming soon
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || !!editingProgram} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingProgram(null);
          setFormData(defaultFormData);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProgram ? "Edit Program" : "Create Referral Program"}
            </DialogTitle>
            <DialogDescription>
              Set up rewards for new users and advocates
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Program Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Spring Referral Campaign"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="codePrefix">Code Prefix</Label>
              <Input
                id="codePrefix"
                value={formData.codePrefix}
                onChange={(e) => setFormData({ ...formData, codePrefix: e.target.value.toUpperCase() })}
                placeholder="e.g., SPRING"
                className="font-mono"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Codes will be generated as {formData.codePrefix || "PREFIX"}123456
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: typeof formData.status) => 
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="referredReward">New User Reward</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="referredReward"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.referredRewardCents / 100}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      referredRewardCents: Math.round(parseFloat(e.target.value || "0") * 100) 
                    })}
                    className="pl-7"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="advocateReward">Advocate Reward</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="advocateReward"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.advocateRewardCents / 100}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      advocateRewardCents: Math.round(parseFloat(e.target.value || "0") * 100) 
                    })}
                    className="pl-7"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label htmlFor="secondLevel">Enable 2-Level Rewards</Label>
                <p className="text-xs text-muted-foreground">
                  Reward the referrer of the referrer
                </p>
              </div>
              <Switch
                id="secondLevel"
                checked={formData.enableSecondLevel}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, enableSecondLevel: checked })
                }
              />
            </div>

            {formData.enableSecondLevel && (
              <div className="space-y-2">
                <Label htmlFor="secondLevelReward">2nd Level Reward</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="secondLevelReward"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.secondLevelRewardCents / 100}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      secondLevelRewardCents: Math.round(parseFloat(e.target.value || "0") * 100) 
                    })}
                    className="pl-7"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingProgram(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createProgram.isPending || updateProgram.isPending}
              >
                {(createProgram.isPending || updateProgram.isPending) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingProgram ? (
                  "Save Changes"
                ) : (
                  "Create Program"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
