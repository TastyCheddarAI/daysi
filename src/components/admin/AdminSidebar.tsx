import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  DollarSign,
  Cloud,
  Users,
  CalendarDays,
  GraduationCap,
  Sparkles,
  Package,
  UserCog,
  CreditCard,
  Boxes,
  Gift,
  Upload,
  FileText,
  ClipboardList,
  BookOpen,
  Brain,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";

interface AdminSidebarProps {
  isAdmin: boolean;
  isAssociate?: boolean;
  onSignOut: () => void;
}

interface NavItem {
  path: string;
  icon: React.ElementType;
  label: string;
  staffAccess: boolean;
  associateAccess: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { path: "/admin", icon: LayoutDashboard, label: "Dashboard", staffAccess: true, associateAccess: true },
      { path: "/admin/schedule", icon: CalendarDays, label: "Schedule", staffAccess: true, associateAccess: true },
      { path: "/admin/bookings", icon: Calendar, label: "Bookings", staffAccess: true, associateAccess: true },
    ],
  },
  {
    label: "Catalog",
    items: [
      { path: "/admin/services", icon: Sparkles, label: "Services", staffAccess: false, associateAccess: false },
      { path: "/admin/products", icon: Cloud, label: "Products", staffAccess: false, associateAccess: false },
      { path: "/admin/packages", icon: Package, label: "Packages", staffAccess: false, associateAccess: false },
      { path: "/admin/learning", icon: GraduationCap, label: "Learning", staffAccess: false, associateAccess: false },
      { path: "/admin/education-modules", icon: Brain, label: "AI Modules", staffAccess: false, associateAccess: false },
    ],
  },
  {
    label: "Tools",
    items: [
      { path: "/admin/imports", icon: Upload, label: "Imports", staffAccess: false, associateAccess: false },
      { path: "/admin/intake-forms", icon: FileText, label: "Intake Forms", staffAccess: false, associateAccess: false },
      { path: "/admin/audit", icon: ClipboardList, label: "Audit Log", staffAccess: false, associateAccess: false },
      { path: "/admin/api-docs", icon: BookOpen, label: "API Docs", staffAccess: false, associateAccess: false },
    ],
  },
  {
    label: "Customers",
    items: [
      { path: "/admin/customers", icon: Users, label: "Customer CRM", staffAccess: true, associateAccess: false },
      { path: "/admin/memberships", icon: CreditCard, label: "Memberships", staffAccess: false, associateAccess: false },
    ],
  },
  {
    label: "Growth",
    items: [
      { path: "/admin/referrals", icon: Gift, label: "Referrals", staffAccess: false, associateAccess: false },
      { path: "/admin/intelligence", icon: TrendingUp, label: "Intelligence", staffAccess: false, associateAccess: false },
    ],
  },
  {
    label: "Reports",
    items: [
      { path: "/admin/revenue", icon: DollarSign, label: "Revenue", staffAccess: true, associateAccess: false },
      { path: "/admin/analytics", icon: BarChart3, label: "Analytics", staffAccess: true, associateAccess: false },
    ],
  },
  {
    label: "Settings",
    items: [
      { path: "/admin/staff", icon: UserCog, label: "Staff", staffAccess: false, associateAccess: false },
      { path: "/admin/settings", icon: Settings, label: "Settings", staffAccess: false, associateAccess: false },
    ],
  },
];

export function AdminSidebar({ isAdmin, isAssociate = false, onSignOut }: AdminSidebarProps) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  const canSeeItem = (item: NavItem) => {
    if (isAdmin) return true;
    if (isAssociate) return item.associateAccess;
    return item.staffAccess;
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-background border rounded-md shadow-sm"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-card border-r transition-all duration-300",
          isCollapsed ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={cn(
            "flex items-center border-b h-16 px-4",
            isCollapsed ? "justify-center" : "justify-between"
          )}>
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">Admin</span>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:block p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
            {navGroups.map((group) => {
              const visibleItems = group.items.filter(canSeeItem);
              if (visibleItems.length === 0) return null;

              return (
                <div key={group.label}>
                  {!isCollapsed && (
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                      {group.label}
                    </h3>
                  )}
                  <div className="space-y-1">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.path);
                      
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                            active 
                              ? "bg-primary text-primary-foreground shadow-sm" 
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            isCollapsed && "justify-center"
                          )}
                          title={isCollapsed ? item.label : undefined}
                        >
                          <Icon className="h-5 w-5 flex-shrink-0" />
                          {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              onClick={onSignOut}
              className={cn(
                "w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                isCollapsed ? "justify-center px-2" : "justify-start"
              )}
            >
              <LogOut className="h-5 w-5" />
              {!isCollapsed && <span className="ml-3">Sign Out</span>}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
