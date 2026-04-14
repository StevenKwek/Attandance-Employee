"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/hooks/use-auth";

function DashboardSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar skeleton */}
      <div className="hidden lg:flex flex-col w-64 shrink-0 bg-sidebar-bg p-4 gap-2">
        <div className="flex items-center gap-2.5 px-2 py-3 mb-2">
          <Skeleton className="w-8 h-8 rounded-xl bg-white/10" />
          <Skeleton className="h-4 w-24 bg-white/10" />
        </div>
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-xl bg-white/5" />
        ))}
      </div>
      {/* Content skeleton */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="h-14 border-b border-border flex items-center px-4 gap-3 shrink-0">
          <Skeleton className="h-7 w-7 rounded-lg lg:hidden" />
          <Skeleton className="h-4 w-32" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
        </div>
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          <div className="space-y-1">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Skeleton className="lg:col-span-2 h-80 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading, profile } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }

    // Role-based redirect after auth resolves
    if (profile) {
      const isAdmin    = profile.role === "admin";
      const isEmployee = !isAdmin;
      const onAdminPage    = pathname.startsWith("/dashboard") || pathname.startsWith("/karyawan") || pathname.startsWith("/laporan") || pathname.startsWith("/settings");
      const onEmployeePage = pathname.startsWith("/beranda") || pathname.startsWith("/rekap");

      if (isEmployee && onAdminPage)   { router.replace("/beranda");   return; }
      if (isAdmin    && onEmployeePage) { router.replace("/dashboard"); return; }
    }
  }, [loading, user, profile, router, pathname]);

  if (loading) return <DashboardSkeleton />;
  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
