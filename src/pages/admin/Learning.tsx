import { useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  GraduationCap,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { SEO } from "@/components/SEO";
import { EducationGrantDialog } from "@/components/admin/learning/EducationGrantDialog";
import {
  EducationOfferDialog,
  type EducationOfferFormValues,
} from "@/components/admin/learning/EducationOfferDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-states";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/loading-states";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCreateDaysiAdminEducationGrant,
  useCreateDaysiAdminEducationOffer,
  useDaysiAdminLearning,
  useUpdateDaysiAdminEducationOffer,
} from "@/hooks/useDaysiAdminLearning";
import type {
  DaysiAdminEducationOffer,
  DaysiAdminLearningEntitlement,
  DaysiLearningCertificate,
  DaysiLearningEnrollmentView,
} from "@/lib/daysi-admin-api";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";

const formatMoney = (amountCents: number, currency: string = "CAD") =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-CA", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Never";

export default function AdminLearning() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("offers");
  const [offerDialog, setOfferDialog] = useState<{
    open: boolean;
    editing?: DaysiAdminEducationOffer;
  }>({ open: false });
  const [grantDialog, setGrantDialog] = useState<{
    open: boolean;
    offerSlug?: string;
  }>({ open: false });

  const locationSlug = DAYSI_DEFAULT_LOCATION_SLUG;
  const learning = useDaysiAdminLearning({
    locationSlug,
    search: searchQuery,
  });
  const createOffer = useCreateDaysiAdminEducationOffer();
  const updateOffer = useUpdateDaysiAdminEducationOffer();
  const createGrant = useCreateDaysiAdminEducationGrant();

  const loading =
    learning.offersQuery.isLoading ||
    learning.statsQuery.isLoading ||
    learning.enrollmentsQuery.isLoading ||
    learning.certificatesQuery.isLoading ||
    learning.entitlementsQuery.isLoading;

  const error =
    learning.offersQuery.error ||
    learning.statsQuery.error ||
    learning.enrollmentsQuery.error ||
    learning.certificatesQuery.error ||
    learning.entitlementsQuery.error;

  const isRefreshing =
    learning.offersQuery.isFetching ||
    learning.statsQuery.isFetching ||
    learning.enrollmentsQuery.isFetching ||
    learning.certificatesQuery.isFetching ||
    learning.entitlementsQuery.isFetching;

  const refreshAll = () =>
    Promise.all([
      learning.offersQuery.refetch(),
      learning.statsQuery.refetch(),
      learning.enrollmentsQuery.refetch(),
      learning.certificatesQuery.refetch(),
      learning.entitlementsQuery.refetch(),
    ]);

  const offers = learning.offersQuery.data ?? [];
  const offerStats = useMemo(
    () =>
      new Map((learning.statsQuery.data?.offers ?? []).map((offer) => [offer.offerSlug, offer])),
    [learning.statsQuery.data?.offers],
  );

  const filteredOffers = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) {
      return offers;
    }

    return offers.filter(
      (offer) =>
        offer.title.toLowerCase().includes(needle) ||
        offer.slug.toLowerCase().includes(needle) ||
        offer.moduleSlugs.some((moduleSlug) => moduleSlug.toLowerCase().includes(needle)),
    );
  }, [offers, searchQuery]);

  const entitlements = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    const records = learning.entitlementsQuery.data ?? [];
    if (!needle) {
      return records;
    }

    return records.filter(
      (entitlement) =>
        entitlement.customerName.toLowerCase().includes(needle) ||
        entitlement.customerEmail.toLowerCase().includes(needle) ||
        entitlement.educationOfferTitle.toLowerCase().includes(needle) ||
        entitlement.educationOfferSlug.toLowerCase().includes(needle),
    );
  }, [learning.entitlementsQuery.data, searchQuery]);

  const statsCards = [
    {
      title: "Active Entitlements",
      value: learning.statsQuery.data?.totals.activeEntitlementCount ?? 0,
      description: "Customers or staff with live access",
      icon: ShieldCheck,
    },
    {
      title: "Enrollments",
      value: learning.statsQuery.data?.totals.enrollmentCount ?? 0,
      description: "Started education journeys",
      icon: GraduationCap,
    },
    {
      title: "Completion Rate",
      value: `${learning.statsQuery.data?.totals.completionRate ?? 0}%`,
      description: "Enrollments completed end to end",
      icon: Sparkles,
    },
    {
      title: "Certificates",
      value: learning.statsQuery.data?.totals.certificateCount ?? 0,
      description: "Issued learning completions",
      icon: Award,
    },
  ];

  const handleOfferSubmit = async (values: EducationOfferFormValues) => {
    try {
      if (offerDialog.editing) {
        await updateOffer.mutateAsync({
          locationSlug,
          slug: offerDialog.editing.slug,
          title: values.title,
          shortDescription: values.shortDescription,
          moduleSlugs: values.moduleSlugs,
          membershipEligible: values.membershipEligible,
          staffGrantEnabled: values.staffGrantEnabled,
          status: values.status,
          price: values.price,
        });
        toast.success("Education offer updated.");
      } else {
        await createOffer.mutateAsync({
          locationSlug,
          slug: values.slug,
          title: values.title,
          shortDescription: values.shortDescription,
          moduleSlugs: values.moduleSlugs,
          membershipEligible: values.membershipEligible,
          staffGrantEnabled: values.staffGrantEnabled,
          status: values.status,
          price: values.price,
        });
        toast.success("Education offer created.");
      }

      setOfferDialog({ open: false });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save education offer.");
    }
  };

  const handleGrantSubmit = async (values: {
    offerSlug: string;
    customerName: string;
    customerEmail: string;
    actorUserId?: string;
  }) => {
    try {
      await createGrant.mutateAsync({
        locationSlug,
        offerSlug: values.offerSlug,
        customerName: values.customerName,
        customerEmail: values.customerEmail,
        actorUserId: values.actorUserId,
      });
      toast.success("Education access granted.");
      setGrantDialog({ open: false });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to grant education access.");
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <SEO
          title="Learning Management | Admin"
          description="Manage Daysi education"
          keywords="daysi, admin, education, learning"
        />
        <div>
          <h1 className="text-2xl font-bold">Learning</h1>
          <p className="text-muted-foreground">Daysi education offers, grants, and learner performance</p>
        </div>
        <EmptyState
          title="Failed to load learning management"
          description="The Daysi learning workspace could not be loaded."
          action={{ label: "Retry", onClick: refreshAll }}
        />
      </div>
    );
  }

  if (loading) {
    return <PageLoader message="Loading Daysi learning management..." />;
  }

  return (
    <>
      <SEO
        title="Learning Management | Admin"
        description="Manage Daysi education"
        keywords="daysi, admin, education, learning"
      />
      <div className="space-y-6 min-w-0 max-w-full">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 truncate text-2xl font-bold">
              <GraduationCap className="h-6 w-6" />
              Learning
            </h1>
            <p className="text-muted-foreground">
              Daysi education offers, learner access, enrollments, and certificates
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setGrantDialog({ open: true })}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Grant Access
            </Button>
            <Button onClick={() => setOfferDialog({ open: true })}>
              <Plus className="mr-2 h-4 w-4" />
              New Offer
            </Button>
            <Button variant="outline" onClick={refreshAll} disabled={isRefreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
          {statsCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
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
            className="pl-9"
            placeholder="Search offers, students, or certificates..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex h-auto flex-wrap">
            <TabsTrigger value="offers">Offers</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="credentials">Credentials</TabsTrigger>
          </TabsList>

          <TabsContent value="offers">
            <LearningOffersTable
              offers={filteredOffers}
              offerStats={offerStats}
              onEdit={(offer) => setOfferDialog({ open: true, editing: offer })}
              onGrant={(offer) => setGrantDialog({ open: true, offerSlug: offer.slug })}
            />
          </TabsContent>

          <TabsContent value="students">
            <LearningEnrollmentsTable
              enrollments={learning.enrollmentsQuery.data?.enrollments ?? []}
            />
          </TabsContent>

          <TabsContent value="credentials">
            <div className="grid gap-6 xl:grid-cols-2">
              <LearningEntitlementsTable entitlements={entitlements} />
              <LearningCertificatesTable
                certificates={learning.certificatesQuery.data?.certificates ?? []}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <EducationOfferDialog
        open={offerDialog.open}
        onOpenChange={(open) => setOfferDialog((current) => ({ ...current, open }))}
        initialValues={offerDialog.editing}
        isLoading={createOffer.isPending || updateOffer.isPending}
        onSubmit={handleOfferSubmit}
      />

      <EducationGrantDialog
        open={grantDialog.open}
        onOpenChange={(open) => setGrantDialog((current) => ({ ...current, open }))}
        offers={offers}
        defaultOfferSlug={grantDialog.offerSlug}
        isLoading={createGrant.isPending}
        onSubmit={handleGrantSubmit}
      />
    </>
  );
}

function LearningOffersTable(input: {
  offers: DaysiAdminEducationOffer[];
  offerStats: Map<
    string,
    {
      enrollmentCount: number;
      activeEntitlementCount: number;
      certificateCount: number;
      averagePercentComplete: number;
    }
  >;
  onEdit: (offer: DaysiAdminEducationOffer) => void;
  onGrant: (offer: DaysiAdminEducationOffer) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Offer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Modules</TableHead>
              <TableHead>Performance</TableHead>
              <TableHead className="w-[160px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {input.offers.length > 0 ? (
              input.offers.map((offer) => {
                const stats = input.offerStats.get(offer.slug);

                return (
                  <TableRow key={offer.slug}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{offer.title}</div>
                        <div className="text-xs text-muted-foreground">{offer.slug}</div>
                        <div className="text-xs text-muted-foreground">
                          {offer.shortDescription}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          offer.status === "published"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }
                      >
                        {offer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {offer.membershipEligible ? (
                          <Badge variant="outline">Membership</Badge>
                        ) : null}
                        {offer.staffGrantEnabled ? (
                          <Badge variant="outline">Staff Grant</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {offer.price.isFree
                        ? "Free"
                        : formatMoney(offer.price.amountCents, offer.price.currency)}
                    </TableCell>
                    <TableCell>{offer.moduleSlugs.length}</TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <div>{stats?.enrollmentCount ?? 0} enrollments</div>
                        <div>{stats?.activeEntitlementCount ?? 0} active access</div>
                        <div>{stats?.certificateCount ?? 0} certificates</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => input.onEdit(offer)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!offer.staffGrantEnabled}
                          onClick={() => input.onGrant(offer)}
                        >
                          Grant
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No education offers match the current filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function LearningEnrollmentsTable(input: {
  enrollments: DaysiLearningEnrollmentView[];
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Offer</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Certificate</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {input.enrollments.length > 0 ? (
              input.enrollments.map((entry) => (
                <TableRow key={entry.enrollment.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{entry.enrollment.customerName}</div>
                      <div className="text-xs text-muted-foreground">
                        {entry.enrollment.customerEmail}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{entry.enrollment.educationOfferTitle}</div>
                      <div className="text-xs text-muted-foreground">
                        {entry.enrollment.moduleSlugs.length} modules
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[180px]">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {entry.summary.completedModules}/{entry.summary.totalModules} complete
                        </span>
                        <span>{entry.summary.percentComplete}%</span>
                      </div>
                      <Progress value={entry.summary.percentComplete} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        entry.summary.percentComplete >= 100
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-sky-100 text-sky-800"
                      }
                    >
                      {entry.summary.percentComplete >= 100 ? "Completed" : "In Progress"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {entry.certificate ? (
                      <Badge variant="outline">Issued</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Pending</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(entry.enrollment.updatedAt)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No education enrollments match the current filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function LearningEntitlementsTable(input: {
  entitlements: DaysiAdminLearningEntitlement[];
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5" />
          Active Entitlements
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Offer</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Granted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {input.entitlements.length > 0 ? (
              input.entitlements.map((entitlement) => (
                <TableRow key={entitlement.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{entitlement.customerName}</div>
                      <div className="text-xs text-muted-foreground">
                        {entitlement.customerEmail}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{entitlement.educationOfferTitle}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{entitlement.source.replace("_", " ")}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(entitlement.grantedAt)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No active entitlements match the current filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function LearningCertificatesTable(input: {
  certificates: DaysiLearningCertificate[];
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5" />
          Certificates
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Offer</TableHead>
              <TableHead>Issued</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {input.certificates.length > 0 ? (
              input.certificates.map((certificate) => (
                <TableRow key={certificate.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{certificate.customerName}</div>
                      <div className="text-xs text-muted-foreground">
                        {certificate.customerEmail}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{certificate.educationOfferTitle}</TableCell>
                  <TableCell>{formatDate(certificate.issuedAt)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                  No certificates match the current filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
