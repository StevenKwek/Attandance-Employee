"use client";

import { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { useAuth, getInitials } from "@/lib/hooks/use-auth";
import type { UserDocument, SerializedAttendance } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────

type ApiStatus = "present" | "late" | "absent";

interface MonthStat {
  month: string;
  hadir: number;
  terlambat: number;
}

interface ReportResult {
  records: SerializedAttendance[];
  summary: { totalPresent: number; totalLate: number; totalAbsent: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusLabel(s: ApiStatus) {
  return s === "present" ? "Hadir" : s === "late" ? "Terlambat" : "Tidak Hadir";
}

function statusVariant(s: ApiStatus): "hadir" | "terlambat" | "tidak_hadir" {
  return s === "present" ? "hadir" : s === "late" ? "terlambat" : "tidak_hadir";
}

function fmtTime(iso: string | null) {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

function todayISO() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  color,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  trend: "up" | "down" | "neutral";
  trendValue: string;
  color: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1.5 text-foreground">{value}</p>
          </div>
          <div className={`p-3 rounded-2xl ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-4">
          {trend === "up" ? (
            <TrendingUp className="w-3.5 h-3.5 text-success" />
          ) : trend === "down" ? (
            <TrendingDown className="w-3.5 h-3.5 text-destructive" />
          ) : (
            <Activity className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <span
            className={`text-xs font-medium ${
              trend === "up"
                ? "text-success"
                : trend === "down"
                ? "text-destructive"
                : "text-muted-foreground"
            }`}
          >
            {trendValue}
          </span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
      </CardContent>
      <div
        className={`absolute bottom-0 right-0 w-24 h-24 rounded-full opacity-5 blur-2xl translate-x-8 translate-y-8 ${color}`}
      />
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserDocument[]>([]);
  const [todayRecords, setTodayRecords] = useState<SerializedAttendance[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthStat[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const today = todayISO();

        // Fetch in parallel where possible
        const [usersData, todayData] = await Promise.all([
          apiFetch<UserDocument[]>("/api/users").catch(() => [] as UserDocument[]),
          apiFetch<SerializedAttendance[]>(`/api/attendance?date=${today}`).catch(() => [] as SerializedAttendance[]),
        ]);

        setUsers(usersData);
        setTodayRecords(todayData);

        // Build 6-month chart data — fetch all months in parallel
        const now = new Date();
        const months = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
          return {
            label: d.toLocaleDateString("id-ID", { month: "short" }),
            start: d.toLocaleDateString("sv-SE"),
            end: new Date(d.getFullYear(), d.getMonth() + 1, 0).toLocaleDateString("sv-SE"),
          };
        });

        const reports = await Promise.all(
          months.map(({ start, end }) =>
            apiFetch<ReportResult>(`/api/reports?startDate=${start}&endDate=${end}`)
              .catch(() => ({ records: [], summary: { totalPresent: 0, totalLate: 0, totalAbsent: 0 } }))
          )
        );

        const stats: MonthStat[] = months.map(({ label }, i) => ({
          month: label,
          hadir: reports[i].summary.totalPresent,
          terlambat: reports[i].summary.totalLate,
        }));
        setMonthlyStats(stats);
      } finally {
        setLoading(false);
      }
    };

    if (user) load();
  }, [user]);

  const activeEmployees = users.filter((u) => u.status !== "nonaktif").length;
  const hadirCount = todayRecords.filter((r) => r.status === "present").length;
  const terlambatCount = todayRecords.filter((r) => r.status === "late").length;
  const tidakHadirCount = todayRecords.filter((r) => r.status === "absent").length;

  const todayStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-0.5">
          Selamat datang, {profile?.name ?? "—"}. Berikut ringkasan absensi hari ini.
        </p>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16 mb-4" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Karyawan"
            value={activeEmployees}
            description="karyawan aktif"
            icon={Users}
            trend="neutral"
            trendValue=""
            color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          />
          <StatCard
            title="Hadir Hari Ini"
            value={hadirCount}
            description="dari total karyawan"
            icon={UserCheck}
            trend="up"
            trendValue=""
            color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
          />
          <StatCard
            title="Terlambat"
            value={terlambatCount}
            description="hari ini"
            icon={Clock}
            trend="neutral"
            trendValue=""
            color="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
          />
          <StatCard
            title="Tidak Hadir"
            value={tidakHadirCount}
            description="hari ini"
            icon={UserX}
            trend="neutral"
            trendValue=""
            color="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
          />
        </div>
      )}

      {/* Chart + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tren Absensi 6 Bulan</CardTitle>
            <CardDescription>Data kehadiran karyawan 6 bulan terakhir</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-[260px] w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart
                  data={monthlyStats}
                  margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradHadir" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradTerlambat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--card-border)",
                      borderRadius: "12px",
                      color: "var(--card-foreground)",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }}
                    formatter={(v) => (v === "hadir" ? "Hadir" : "Terlambat")}
                  />
                  <Area type="monotone" dataKey="hadir" stroke="#3b82f6" strokeWidth={2} fill="url(#gradHadir)" name="hadir" />
                  <Area type="monotone" dataKey="terlambat" stroke="#f59e0b" strokeWidth={2} fill="url(#gradTerlambat)" name="terlambat" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Today's breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Hari Ini</CardTitle>
            <CardDescription className="capitalize">{todayStr}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {[
              { label: "Hadir", value: hadirCount, total: activeEmployees, color: "bg-success" },
              { label: "Terlambat", value: terlambatCount, total: activeEmployees, color: "bg-warning" },
              { label: "Tidak Hadir", value: tidakHadirCount, total: activeEmployees, color: "bg-destructive" },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value}/{item.total || "—"}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: item.total ? `${Math.round((item.value / item.total) * 100)}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-3 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tingkat Kehadiran</span>
                <span className="font-bold text-success text-lg">
                  {activeEmployees
                    ? `${Math.round((hadirCount / activeEmployees) * 100)}%`
                    : "—"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Aktivitas Terbaru</CardTitle>
            <CardDescription>Check-in hari ini</CardDescription>
          </div>
          <Badge variant="secondary" className="font-normal">
            {todayRecords.length} aktivitas
          </Badge>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
            </div>
          ) : todayRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Belum ada absensi hari ini.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Karyawan", "Check-In", "Check-Out", "Status"].map((h) => (
                      <th key={h} className="text-left py-3 px-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {todayRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">{r.userId.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-mono text-xs text-muted-foreground">{r.userId.slice(0, 8)}…</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 font-mono text-muted-foreground">{fmtTime(r.checkIn)}</td>
                      <td className="py-3 px-2 font-mono text-muted-foreground">{fmtTime(r.checkOut)}</td>
                      <td className="py-3 px-2">
                        <Badge variant={statusVariant(r.status as ApiStatus)}>
                          {statusLabel(r.status as ApiStatus)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
