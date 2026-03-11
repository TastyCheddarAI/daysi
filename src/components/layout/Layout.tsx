import { Header } from "./Header";
import { Footer } from "./Footer";
import { useAnalytics } from "@/hooks/useAnalytics";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  // Auto-track page views
  useAnalytics();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
