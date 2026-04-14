"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Clock,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  LogOut,
  X,
  UserCircle,
  Home,
  CalendarDays,
} from "lucide-react";
import { startNavigation } from "@/components/ui/navigation-progress";
import { logoutUser } from "@/lib/services/auth.service";
import { useAuth } from "@/lib/hooks/use-auth";

const adminNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Karyawan",  href: "/karyawan",  icon: Users },
  { label: "Absensi",   href: "/absensi",   icon: Clock },
  { label: "Laporan",   href: "/laporan",   icon: BarChart3 },
  { label: "Profil",    href: "/profil",    icon: UserCircle },
  { label: "Settings",  href: "/settings",  icon: Settings },
];

const employeeNavItems = [
  { label: "Beranda",  href: "/beranda",  icon: Home },
  { label: "Absensi",  href: "/absensi",  icon: Clock },
  { label: "Rekap",    href: "/rekap",    icon: CalendarDays },
  { label: "Profil",   href: "/profil",   icon: UserCircle },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

function NavContent({
  collapsed,
  onNavClick,
}: {
  collapsed: boolean;
  onNavClick?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const navItems = isAdmin ? adminNavItems : employeeNavItems;

  const handleLogout = async () => {
    try {
      await logoutUser();
    } finally {
      startNavigation();
      onNavClick?.();
      router.push("/login");
    }
  };

  return (
    <>
      {/* Role badge */}
      {!collapsed && (
        <div className="px-3 py-2 mx-2 mt-2 rounded-xl bg-white/5">
          <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground opacity-60 mb-0.5">
            Login sebagai
          </p>
          <p className="text-xs font-semibold text-sidebar-active-foreground truncate">
            {profile?.name ?? "—"}
          </p>
          <span className={cn(
            "inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full",
            isAdmin
              ? "bg-primary/20 text-primary"
              : "bg-emerald-500/20 text-emerald-400"
          )}>
            {isAdmin ? "Admin" : "Karyawan"}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {!collapsed && (
          <p className="px-2 mb-2 text-[10px] uppercase tracking-widest font-semibold text-sidebar-foreground opacity-60">
            Menu
          </p>
        )}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => { startNavigation(); onNavClick?.(); }}
              className={cn(
                "flex items-center rounded-xl transition-all duration-150 group",
                collapsed
                  ? "justify-center w-10 h-10 mx-auto"
                  : "gap-3 px-3 py-2.5",
                isActive
                  ? "bg-sidebar-active text-sidebar-active-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-active-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  "shrink-0 transition-transform group-hover:scale-105",
                  collapsed ? "w-5 h-5" : "w-4 h-4",
                  isActive ? "text-primary" : ""
                )}
              />
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
              {isActive && !collapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-4 border-t border-white/5 pt-4">
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center rounded-xl text-sidebar-foreground hover:bg-sidebar-hover hover:text-red-400 transition-all w-full",
            collapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 py-2.5"
          )}
          title={collapsed ? "Keluar" : undefined}
        >
          <LogOut className={collapsed ? "w-5 h-5" : "w-4 h-4 shrink-0"} />
          {!collapsed && <span className="text-sm font-medium">Keluar</span>}
        </button>
      </div>
    </>
  );
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Close mobile sidebar on route change
  const pathname = usePathname();
  useEffect(() => {
    onClose();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* ── Mobile drawer (< lg) ── */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          mobileOpen ? "visible" : "invisible pointer-events-none"
        )}
      >
        {/* Backdrop */}
        <div
          className={cn(
            "absolute inset-0 bg-black/60 transition-opacity duration-300",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={onClose}
        />

        {/* Drawer panel */}
        <aside
          className={cn(
            "absolute left-0 top-0 h-full w-72 bg-sidebar-bg flex flex-col",
            "transition-transform duration-300 ease-in-out shadow-2xl",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary shrink-0">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-none">AbsensiPro</p>
                <p className="text-sidebar-foreground text-xs mt-0.5">v2.0</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-sidebar-foreground hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <NavContent collapsed={false} onNavClick={onClose} />
        </aside>
      </div>

      {/* ── Desktop sidebar (≥ lg) ── */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen bg-sidebar-bg relative",
          "transition-all duration-300 ease-in-out shrink-0",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex items-center h-16 px-4 border-b border-white/5",
            collapsed ? "justify-center" : "gap-3"
          )}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-white font-semibold text-sm leading-none">AbsensiPro</p>
              <p className="text-sidebar-foreground text-xs mt-0.5">v2.0</p>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-card border border-card-border shadow-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>

        <NavContent collapsed={collapsed} />
      </aside>
    </>
  );
}
