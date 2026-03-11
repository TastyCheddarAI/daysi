import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarClock,
  CreditCard,
  LogOut,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/loading-states";
import { EmptyState } from "@/components/ui/empty-states";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchDaysiMyCredits,
  fetchDaysiMyMemberships,
  fetchDaysiMyOrders,
} from "@/lib/daysi-auth-api";

const formatMoney = (amountCents: number, currency: string) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);

const formatDate = (value: string | undefined) =>
  value
    ? new Date(value).toLocaleString("en-CA", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Pending";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, session, loading: authLoading, signOut } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, navigate, user]);

  const ordersQuery = useQuery({
    queryKey: ["daysi-account-orders", session?.access_token],
    queryFn: () => fetchDaysiMyOrders(session!.access_token),
    enabled: !!session?.access_token,
    staleTime: 1000 * 30,
  });
  const membershipsQuery = useQuery({
    queryKey: ["daysi-account-memberships", session?.access_token],
    queryFn: () => fetchDaysiMyMemberships(session!.access_token),
    enabled: !!session?.access_token,
    staleTime: 1000 * 30,
  });
  const creditsQuery = useQuery({
    queryKey: ["daysi-account-credits", session?.access_token],
    queryFn: () => fetchDaysiMyCredits(session!.access_token),
    enabled: !!session?.access_token,
    staleTime: 1000 * 30,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PageLoader message="Loading your Daysi account..." />
      </div>
    );
  }

  if (!user || !session) {
    return null;
  }

  const orders = ordersQuery.data ?? [];
  const memberships = membershipsQuery.data ?? [];
  const credits = creditsQuery.data;
  const activeMembershipCount = memberships.filter((entry) => entry.status === "active").length;
  const paidOrders = orders.filter((order) => order.status === "paid");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">My Daysi Account</h1>
            <p className="text-sm text-muted-foreground">
              Customer access is now running through the Daysi API layer.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate("/booking")}>
              Book Appointment
            </Button>
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Session
              </CardTitle>
              <CardDescription>
                Manage your account details and view your activity.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <div className="text-sm text-muted-foreground">Name</div>
                <div className="font-medium">{user.displayName}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Email</div>
                <div className="font-medium">{user.email ?? "Not provided"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Access</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{session.sessionMode}</Badge>
                  {user.roles.map((role) => (
                    <Badge key={role} variant="secondary" className="capitalize">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Account Credit
                </CardTitle>
              </CardHeader>
              <CardContent>
                {creditsQuery.isLoading ? (
                  <PageLoader message="Loading credits..." className="min-h-[120px]" />
                ) : (
                  <>
                    <div className="text-3xl font-semibold">
                      {credits
                        ? formatMoney(
                            credits.availableAmount.amountCents,
                            credits.availableAmount.currency,
                          )
                        : "$0.00"}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {credits?.serviceAllowances.length ?? 0} active service allowance
                      {(credits?.serviceAllowances.length ?? 0) === 1 ? "" : "s"}.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Memberships
                </CardTitle>
              </CardHeader>
              <CardContent>
                {membershipsQuery.isLoading ? (
                  <PageLoader message="Loading memberships..." className="min-h-[120px]" />
                ) : (
                  <>
                    <div className="text-3xl font-semibold">{memberships.length}</div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {activeMembershipCount} active subscription
                      {activeMembershipCount === 1 ? "" : "s"}.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ordersQuery.isLoading ? (
                  <PageLoader message="Loading orders..." className="min-h-[120px]" />
                ) : (
                  <>
                    <div className="text-3xl font-semibold">{orders.length}</div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {paidOrders.length} paid order{paidOrders.length === 1 ? "" : "s"} on record.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Recent Orders
                </CardTitle>
                <CardDescription>
                  Orders are now being read from the new Daysi commerce engine.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ordersQuery.isLoading ? (
                  <PageLoader message="Loading orders..." className="min-h-[180px]" />
                ) : orders.length === 0 ? (
                  <EmptyState
                    icon={ShoppingBag}
                    title="No orders yet"
                    description="Browse services or packages to create your first Daysi order."
                    action={{
                      label: "View Pricing",
                      onClick: () => navigate("/pricing"),
                    }}
                  />
                ) : (
                  <div className="space-y-4">
                    {orders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className="rounded-2xl border border-border/70 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <div className="font-medium">{order.code}</div>
                          <div className="text-sm text-muted-foreground">
                            {order.lineItems.map((lineItem) => lineItem.description).join(" · ")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Created {formatDate(order.createdAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="capitalize">
                            {order.status.replace(/_/g, " ")}
                          </Badge>
                          <div className="font-semibold">
                            {formatMoney(order.totalAmount.amountCents, order.totalAmount.currency)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarClock className="h-5 w-5" />
                    Memberships
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {membershipsQuery.isLoading ? (
                    <PageLoader message="Loading memberships..." className="min-h-[160px]" />
                  ) : memberships.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No memberships yet. Explore Daysi plans when you are ready for
                      bundled access.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {memberships.slice(0, 4).map((membership) => (
                        <div key={membership.id} className="rounded-2xl border border-border/70 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-medium">{membership.planSlug}</div>
                            <Badge variant="secondary" className="capitalize">
                              {membership.status}
                            </Badge>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            Started {formatDate(membership.activatedAt ?? membership.createdAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <Button asChild>
                    <Link to="/booking">
                      Book a Treatment
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/pricing">View Packages</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link to="/advisor">Open the Advisor</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
