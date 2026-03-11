import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PageLoader } from "@/components/ui/loading-states";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { ChatProvider } from "@/contexts/ChatContext";
import {
  createMutationCache,
  createQueryCache,
  shouldRetryQuery,
} from "@/lib/query-error-handler";

const Index = lazy(() => import("./pages/Index"));
const Treatment = lazy(() => import("./pages/Treatment"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Advisor = lazy(() => import("./pages/Advisor"));
const Booking = lazy(() => import("./pages/Booking"));
const Contact = lazy(() => import("./pages/Contact"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Checkout = lazy(() => import("./pages/Checkout"));
const CartCheckout = lazy(() => import("./pages/CartCheckout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const ServicesPricing = lazy(() => import("./pages/ServicesPricing"));
const Product = lazy(() => import("./pages/Product"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminSchedule = lazy(() => import("./pages/admin/Schedule"));
const AdminBookings = lazy(() => import("./pages/admin/Bookings"));
const AdminRevenue = lazy(() => import("./pages/admin/Revenue"));
const AdminAnalytics = lazy(() => import("./pages/admin/Analytics"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminCustomers = lazy(() => import("./pages/admin/Customers"));
const AdminServices = lazy(() => import("./pages/admin/Services"));
const AdminPackages = lazy(() => import("./pages/admin/Packages"));
const AdminMemberships = lazy(() => import("./pages/admin/Memberships"));
const AdminStaff = lazy(() => import("./pages/admin/Staff"));
const AdminReferrals = lazy(() => import("./pages/admin/Referrals"));
const AdminImports = lazy(() => import("./pages/admin/Imports"));
const AdminAudit = lazy(() => import("./pages/admin/Audit"));
const AdminIntakeForms = lazy(() => import("./pages/admin/IntakeForms"));
const AdminAPIDocs = lazy(() => import("./pages/admin/APIDocs"));
const DashboardReferrals = lazy(() => import("./pages/dashboard/Referrals"));
const AdminAuth = lazy(() => import("./pages/AdminAuth"));
const AdminLearning = lazy(() => import("./pages/admin/Learning"));
const AdminEducationModules = lazy(() => import("./pages/admin/EducationModules"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LaserHairRemoval = lazy(() => import("./pages/services/LaserHairRemoval"));
const TattooRemoval = lazy(() => import("./pages/services/TattooRemoval"));
const SkinRejuvenation = lazy(() => import("./pages/services/SkinRejuvenation"));
const AntiAging = lazy(() => import("./pages/services/AntiAging"));
const SuccessSystem = lazy(() => import("./pages/SuccessSystem"));
const ModuleDetail = lazy(() => import("./pages/ModuleDetail"));
const ModuleCheckout = lazy(() => import("./pages/ModuleCheckout"));
const LessonView = lazy(() => import("./pages/LessonView"));
const AdminLayout = lazy(() =>
  import("@/components/admin/AdminLayout").then((module) => ({
    default: module.AdminLayout,
  })),
);
const ChatWidget = lazy(() =>
  import("@/components/chat").then((module) => ({
    default: module.ChatWidget,
  })),
);

const queryClient = new QueryClient({
  queryCache: createQueryCache(),
  mutationCache: createMutationCache(),
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const RouteLoader = ({ message = "Loading page..." }: { message?: string }) => (
  <PageLoader message={message} className="min-h-[60vh]" />
);

function AdminRoutes() {
  return (
    <Suspense fallback={<RouteLoader message="Loading admin workspace..." />}>
      <AdminLayout>
        <ErrorBoundary variant="section">
          <Outlet />
        </ErrorBoundary>
      </AdminLayout>
    </Suspense>
  );
}

const App = () => {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CartProvider>
            <ChatProvider>
              <TooltipProvider>
                <ErrorBoundary>
                  <Toaster />
                  <BrowserRouter
                    future={{
                      v7_startTransition: true,
                      v7_relativeSplatPath: true,
                    }}
                  >
                    <AdminAuthProvider>
                      <ScrollToTop />
                      <Suspense fallback={<RouteLoader />}>
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/treatment" element={<Treatment />} />
                          <Route path="/gallery" element={<Gallery />} />
                          <Route path="/pricing" element={<Pricing />} />
                          <Route path="/advisor" element={<Advisor />} />
                          <Route path="/booking" element={<Booking />} />
                          <Route path="/contact" element={<Contact />} />
                          <Route path="/auth" element={<Auth />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/dashboard/referrals" element={<DashboardReferrals />} />
                          <Route path="/checkout" element={<Checkout />} />
                          <Route path="/checkout/cart" element={<CartCheckout />} />
                          <Route path="/order-confirmation" element={<OrderConfirmation />} />
                          <Route path="/services" element={<ServicesPricing />} />
                          <Route path="/product/:id" element={<Product />} />
                          <Route path="/privacy" element={<Privacy />} />
                          <Route path="/terms" element={<Terms />} />
                          <Route path="/services/laser-hair-removal" element={<LaserHairRemoval />} />
                          <Route path="/services/tattoo-removal" element={<TattooRemoval />} />
                          <Route path="/services/skin-rejuvenation" element={<SkinRejuvenation />} />
                          <Route path="/services/anti-aging" element={<AntiAging />} />
                          <Route path="/admin/auth" element={<AdminAuth />} />
                          <Route path="/success-system" element={<SuccessSystem />} />
                          <Route path="/success-system/:moduleSlug" element={<ModuleDetail />} />
                          <Route
                            path="/success-system/:moduleSlug/checkout"
                            element={<ModuleCheckout />}
                          />
                          <Route
                            path="/success-system/:moduleSlug/:lessonId"
                            element={<LessonView />}
                          />
                          <Route path="/admin" element={<AdminRoutes />}>
                            <Route index element={<AdminDashboard />} />
                            <Route path="schedule" element={<AdminSchedule />} />
                            <Route path="bookings" element={<AdminBookings />} />
                            <Route path="revenue" element={<AdminRevenue />} />
                            <Route path="analytics" element={<AdminAnalytics />} />
                            <Route path="settings" element={<AdminSettings />} />
                            <Route path="products" element={<AdminProducts />} />
                            <Route path="services" element={<AdminServices />} />
                            <Route path="packages" element={<AdminPackages />} />
                            <Route path="memberships" element={<AdminMemberships />} />
                            <Route path="customers" element={<AdminCustomers />} />
                            <Route path="learning" element={<AdminLearning />} />
                            <Route path="education-modules" element={<AdminEducationModules />} />
                            <Route path="staff" element={<AdminStaff />} />
                            <Route path="referrals" element={<AdminReferrals />} />
                            <Route path="imports" element={<AdminImports />} />
                            <Route path="audit" element={<AdminAudit />} />
                            <Route path="intake-forms" element={<AdminIntakeForms />} />
                            <Route path="api-docs" element={<AdminAPIDocs />} />
                          </Route>
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                        <Suspense fallback={null}>
                          <ChatWidget />
                        </Suspense>
                      </Suspense>
                    </AdminAuthProvider>
                  </BrowserRouter>
                </ErrorBoundary>
              </TooltipProvider>
            </ChatProvider>
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
