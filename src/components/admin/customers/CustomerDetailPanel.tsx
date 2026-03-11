import { useState, type ReactNode } from "react";
import { format } from "date-fns";
import {
  Activity,
  CreditCard,
  FileText,
  GraduationCap,
  Mail,
  Plus,
  Sparkles,
  Tags,
  User,
  X,
} from "lucide-react";

import type { DaysiCustomerDirectoryEntry } from "@/lib/daysi-admin-api";
import { useDaysiAdminCustomerContext } from "@/hooks/useDaysiAdminBookings";
import {
  useCreateDaysiAdminCustomerNote,
  useCreateDaysiAdminCustomerTag,
  useDeleteDaysiAdminCustomerTag,
} from "@/hooks/useDaysiAdminCustomers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const formatMoney = (amountCents: number) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amountCents / 100);

interface CustomerDetailPanelProps {
  customer: DaysiCustomerDirectoryEntry | null;
  open: boolean;
  onClose: () => void;
}

export function CustomerDetailPanel({ customer, open, onClose }: CustomerDetailPanelProps) {
  const contextQuery = useDaysiAdminCustomerContext({
    locationSlug: customer?.locationSlug ?? "",
    customerEmail: customer?.customerEmail,
  });
  const createNote = useCreateDaysiAdminCustomerNote();
  const createTag = useCreateDaysiAdminCustomerTag();
  const deleteTag = useDeleteDaysiAdminCustomerTag();

  const [noteBody, setNoteBody] = useState("");
  const [tagLabel, setTagLabel] = useState("");

  const context = contextQuery.data;

  const handleCreateNote = async () => {
    if (!customer || !noteBody.trim()) {
      return;
    }

    await createNote.mutateAsync({
      locationSlug: customer.locationSlug,
      customerEmail: customer.customerEmail,
      customerName: customer.customerName,
      body: noteBody.trim(),
    });
    setNoteBody("");
  };

  const handleCreateTag = async () => {
    if (!customer || !tagLabel.trim()) {
      return;
    }

    await createTag.mutateAsync({
      locationSlug: customer.locationSlug,
      customerEmail: customer.customerEmail,
      label: tagLabel.trim(),
    });
    setTagLabel("");
  };

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Customer CRM</SheetTitle>
        </SheetHeader>

        {!customer ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            Select a customer to view context.
          </div>
        ) : contextQuery.isLoading ? (
          <div className="mt-6 space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : context ? (
          <ScrollArea className="mt-6 h-[calc(100vh-110px)] pr-4">
            <Card className="mb-4">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold">
                      {context.customerName || customer.customerName || customer.customerEmail}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      {customer.customerEmail}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {context.segments.map((segment) => (
                        <Badge key={segment.key} variant="outline">
                          {segment.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <SummaryStat
                    icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
                    label="Revenue"
                    value={formatMoney(customer.summary.totalPaidRevenueAmountCents)}
                  />
                  <SummaryStat
                    icon={<Activity className="h-4 w-4 text-muted-foreground" />}
                    label="Bookings"
                    value={String(context.summary.bookingCount)}
                  />
                  <SummaryStat
                    icon={<GraduationCap className="h-4 w-4 text-muted-foreground" />}
                    label="Entitlements"
                    value={String(context.summary.activeEntitlementCount)}
                  />
                  <SummaryStat
                    icon={<Sparkles className="h-4 w-4 text-muted-foreground" />}
                    label="Credits"
                    value={formatMoney(context.summary.activeCreditAmountCents)}
                  />
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="activity">
              <TabsList className="mb-4">
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="tags">Tags</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="activity" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Events</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {context.recentEvents.length > 0 ? (
                      context.recentEvents.slice(0, 12).map((event) => (
                        <div key={event.id} className="rounded-lg border px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium">{event.eventType}</p>
                              <p className="text-xs text-muted-foreground">
                                {event.source} · {format(new Date(event.occurredAt), "MMM d, yyyy h:mm a")}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No customer activity yet.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Add Note</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      placeholder="Add operator context, follow-up notes, or customer preferences."
                      value={noteBody}
                      onChange={(event) => setNoteBody(event.target.value)}
                      rows={4}
                    />
                    <Button
                      onClick={handleCreateNote}
                      disabled={createNote.isPending || noteBody.trim().length === 0}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Save Note
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Saved Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {context.notes.length > 0 ? (
                      context.notes.map((note) => (
                        <div key={note.id} className="rounded-lg border px-4 py-3">
                          <p className="text-sm">{note.body}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {format(new Date(note.updatedAt), "MMM d, yyyy h:mm a")}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No notes saved for this customer.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tags" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tag Customer</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. high-value-lead"
                        value={tagLabel}
                        onChange={(event) => setTagLabel(event.target.value)}
                      />
                      <Button
                        onClick={handleCreateTag}
                        disabled={createTag.isPending || tagLabel.trim().length === 0}
                      >
                        Add Tag
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Active Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {context.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {context.tags.map((tag) => (
                          <Badge key={tag.id} variant="outline" className="gap-1 pr-1">
                            <Tags className="h-3 w-3" />
                            {tag.label}
                            <button
                              className="ml-1 rounded-full p-0.5 hover:bg-muted"
                              onClick={() =>
                                deleteTag.mutate({
                                  locationSlug: customer.locationSlug,
                                  customerEmail: customer.customerEmail,
                                  tagId: tag.id,
                                })
                              }
                              type="button"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No tags applied yet.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analysis" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Skin Assessment History</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {context.latestSkinAssessments.length > 0 ? (
                      context.latestSkinAssessments.map((assessment) => (
                        <div key={assessment.assessmentId} className="rounded-lg border px-4 py-3">
                          <p className="font-medium">{assessment.summary}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {format(new Date(assessment.capturedAt), "MMM d, yyyy h:mm a")}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {assessment.dominantConcernKeys.map((concern) => (
                              <Badge key={concern} variant="secondary">
                                {concern}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No skin assessments captured yet.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        ) : (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            Customer context could not be loaded.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SummaryStat(input: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <div className="mb-2">{input.icon}</div>
      <div className="text-lg font-semibold">{input.value}</div>
      <div className="text-xs text-muted-foreground">{input.label}</div>
    </div>
  );
}
