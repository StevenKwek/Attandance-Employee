"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LogIn, LogOut, CheckCircle2, Clock, CalendarDays,
  TrendingUp, AlertCircle, XCircle, ChevronRight, Flame,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/hooks/use-auth";
import type { SerializedAttendance } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
}

function fmtTime(iso: string | null) {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
  });
}

function workMinutes(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return "--";
  const mins = Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000
  );
  return `${Math.floor(mins / 60)}j ${mins % 60}m`;
}

type UiStatus = "hadir" | "terlambat" | "tidak_hadir";

function toUiStatus(s: string): UiStatus {
  if (s === "present") return "hadir";
  if (s === "late")    return "terlambat";
  return "tidak_hadir";
}

const statusConfig: Record<UiStatus, { label: string; color: string; icon: React.ElementType }> = {
  hadir:       { label: "Hadir",       color: "text-success",     icon: CheckCircle2 },
  terlambat:   { label: "Terlambat",   color: "text-warning",     icon: AlertCircle },
  tidak_hadir: { label: "Tidak Hadir", color: "text-destructive", icon: XCircle },
};

interface ReportResult {
  records: SerializedAttendance[];
  summary: { totalPresent: number; totalLate: number; totalAbsent: number };
}

// ─── Live clock ───────────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        timeZone: "Asia/Jakarta",
      }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular-nums">{time}</span>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BerandaPage() {
  const { profile, user } = useAuth();
  const userId = user?.uid ?? profile?.id;
  const [loading,       setLoading]       = useState(true);
  const [todayRecord,   setTodayRecord]   = useState<SerializedAttendance | null>(null);
  const [recentHistory, setRecentHistory] = useState<SerializedAttendance[]>([]);
  const [summary, setSummary] = useState({ hadir: 0, terlambat: 0, tidak_hadir: 0, total: 0 });
  const [streak,  setStreak]  = useState(0);

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      setLoading(true);
      try {
        const today = todayISO();
        const now   = new Date();

        // Month range for summary
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          .toLocaleDateString("sv-SE");
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toLocaleDateString("sv-SE");

        // Fetch attendance history + monthly report in parallel
        const [history, report] = await Promise.all([
          apiFetch<SerializedAttendance[]>(`/api/attendance?userId=${userId}`)
            .catch(() => [] as SerializedAttendance[]),
          apiFetch<ReportResult>(`/api/reports?startDate=${monthStart}&endDate=${monthEnd}&userId=${userId}`)
            .catch(() => ({ records: [], summary: { totalPresent: 0, totalLate: 0, totalAbsent: 0 } })),
        ]);

        // Today's record
        const todayRec = history.find((r) => r.date === today) ?? null;
        setTodayRecord(todayRec);

        // Recent 5 records
        setRecentHistory(history.slice(0, 5));

        // Monthly summary
        setSummary({
          hadir:       report.summary.totalPresent,
          terlambat:   report.summary.totalLate,
          tidak_hadir: report.summary.totalAbsent,
          total:       report.summary.totalPresent + report.summary.totalLate + report.summary.totalAbsent,
        });

        // Streak: count consecutive hadir/terlambat days going back from today
        const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
        let s = 0;
        let prev = today;
        for (const r of sorted) {
          if (r.status === "absent") break;
          // Allow only consecutive dates (skip weekends)
          const diff = Math.round(
            (new Date(prev + "T00:00:00").getTime() - new Date(r.date + "T00:00:00").getTime()) /
            86400000
          );
          if (diff > 3) break; // gap bigger than a weekend
          s++;
          prev = r.date;
        }
        setStreak(s);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId]);

  const today   = todayISO();
  const todayStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "Asia/Jakarta",
  });

  const checkedIn  = !!todayRecord?.checkIn;
  const checkedOut = !!todayRecord?.checkOut;
  const uiStatus   = todayRecord ? toUiStatus(todayRecord.status) : null;
  const StatusIcon = uiStatus ? statusConfig[uiStatus].icon : null;
  const attendanceRate = summary.total > 0
    ? Math.round((summary.hadir / summary.total) * 100)
    : 0;

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">

      {/* ── Greeting ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {loading ? (
            <>
              <Skeleton className="h-7 w-52 mb-2" />
              <Skeleton className="h-4 w-64" />
            </>
          ) : (
            <>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                Selamat datang, {profile?.name?.split(" ")[0] ?? "—"} 👋
              </h1>
              <p className="text-muted-foreground mt-0.5 text-sm capitalize">{todayStr}</p>
            </>
          )}
        </div>
        {!loading && (
          <div className="hidden sm:flex items-center gap-2 bg-secondary rounded-xl px-4 py-2.5 shrink-0">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono font-semibold text-foreground">
              <LiveClock />
            </span>
          </div>
        )}
      </div>

      {/* ── Today status + check-in card ─────────────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-5">
          {/* Left — status */}
          <div className={`lg:col-span-2 p-6 flex flex-col gap-4 ${
            checkedIn
              ? "bg-gradient-to-br from-primary/10 to-primary/5"
              : "bg-gradient-to-br from-secondary to-background"
          }`}>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                Status Hari Ini
              </p>
              {loading ? (
                <Skeleton className="h-8 w-32" />
              ) : uiStatus ? (
                <div className="flex items-center gap-2">
                  {StatusIcon && <StatusIcon className={`w-6 h-6 ${statusConfig[uiStatus].color}`} />}
                  <span className={`text-2xl font-bold ${statusConfig[uiStatus].color}`}>
                    {statusConfig[uiStatus].label}
                  </span>
                </div>
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">Belum Absen</span>
              )}
            </div>

            <div className="flex sm:hidden items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-lg font-mono font-bold"><LiveClock /></span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background/60 backdrop-blur rounded-xl p-3 text-center border border-border">
                <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                  <LogIn className="w-3 h-3" /> Check-In
                </p>
                <p className="font-bold text-foreground text-sm">
                  {loading
                    ? <Skeleton className="h-4 w-12 mx-auto" />
                    : fmtTime(todayRecord?.checkIn ?? null)}
                </p>
              </div>
              <div className="bg-background/60 backdrop-blur rounded-xl p-3 text-center border border-border">
                <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                  <LogOut className="w-3 h-3" /> Check-Out
                </p>
                <p className="font-bold text-foreground text-sm">
                  {loading
                    ? <Skeleton className="h-4 w-12 mx-auto" />
                    : fmtTime(todayRecord?.checkOut ?? null)}
                </p>
              </div>
            </div>

            {checkedIn && checkedOut && (
              <div className="bg-success/10 rounded-xl px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total jam kerja</span>
                <span className="text-sm font-bold text-success">
                  {workMinutes(todayRecord?.checkIn ?? null, todayRecord?.checkOut ?? null)}
                </span>
              </div>
            )}
          </div>

          {/* Right — action buttons */}
          <div className="lg:col-span-3 p-6 flex flex-col justify-center gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">
                Jam Kerja
              </p>
              <p className="text-sm text-foreground">
                Masuk: <span className="font-semibold">08:00</span> — Pulang: <span className="font-semibold">17:00</span> WIB
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/absensi"
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200 group ${
                  checkedIn
                    ? "border-success/30 bg-success/5 cursor-default pointer-events-none"
                    : "border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/10 hover:shadow-md hover:-translate-y-0.5"
                }`}
              >
                <div className={`p-2.5 rounded-xl shrink-0 ${checkedIn ? "bg-success/10" : "bg-primary/10"}`}>
                  {checkedIn
                    ? <CheckCircle2 className="w-5 h-5 text-success" />
                    : <LogIn className="w-5 h-5 text-primary" />
                  }
                </div>
                <div>
                  <p className="font-semibold text-sm">
                    {checkedIn ? "Sudah Check-In" : "Check-In Sekarang"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {checkedIn
                      ? `Pukul ${fmtTime(todayRecord?.checkIn ?? null)}`
                      : "Tap untuk absen masuk"}
                  </p>
                </div>
              </Link>

              <Link
                href="/absensi"
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200 group ${
                  !checkedIn
                    ? "border-border bg-secondary/30 opacity-50 pointer-events-none"
                    : checkedOut
                    ? "border-success/30 bg-success/5 cursor-default pointer-events-none"
                    : "border-orange-300/50 bg-orange-50/50 dark:bg-orange-900/10 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:shadow-md hover:-translate-y-0.5"
                }`}
              >
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  checkedOut ? "bg-success/10" : "bg-orange-100 dark:bg-orange-900/20"
                }`}>
                  {checkedOut
                    ? <CheckCircle2 className="w-5 h-5 text-success" />
                    : <LogOut className="w-5 h-5 text-orange-500" />
                  }
                </div>
                <div>
                  <p className="font-semibold text-sm">
                    {checkedOut ? "Sudah Check-Out" : "Check-Out"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {checkedOut
                      ? `Pukul ${fmtTime(todayRecord?.checkOut ?? null)}`
                      : checkedIn ? "Tap untuk absen pulang" : "Check-in terlebih dahulu"}
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Monthly summary ───────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Ringkasan Bulan Ini</h2>
          <Link href="/rekap" className="flex items-center gap-1 text-xs text-primary hover:underline">
            Lihat rekap <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {loading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
          ) : (
            <>
              {[
                { label: "Hadir",      value: summary.hadir,       icon: CheckCircle2, color: "text-success",     bg: "bg-success/10" },
                { label: "Terlambat",  value: summary.terlambat,   icon: AlertCircle,  color: "text-warning",     bg: "bg-warning/10" },
                { label: "Tdk Hadir",  value: summary.tidak_hadir, icon: XCircle,      color: "text-destructive", bg: "bg-destructive/10" },
                { label: "Kehadiran",  value: `${attendanceRate}%`, icon: TrendingUp,  color: "text-primary",     bg: "bg-primary/10" },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <Card key={s.label}>
                    <CardContent className="p-4 flex flex-col gap-2">
                      <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${s.color}`} />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* ── Streak + recent activity ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-orange-500/10 to-yellow-500/5 border-orange-500/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <Flame className="w-7 h-7 text-orange-500" />
            </div>
            <div>
              {loading ? (
                <>
                  <Skeleton className="h-8 w-12 mb-1" />
                  <Skeleton className="h-3 w-28" />
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-foreground">{streak}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">hari berturut-turut hadir</p>
                  {streak > 0 && (
                    <p className="text-xs text-orange-500 font-medium mt-1">🔥 Pertahankan streak-mu!</p>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Riwayat Terakhir</CardTitle>
                <CardDescription>5 hari terakhir</CardDescription>
              </div>
              <Link href="/absensi" className="flex items-center gap-1 text-xs text-primary hover:underline">
                Lihat semua <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-xl" />
                ))}
              </div>
            ) : recentHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-3">
                  <CalendarDays className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Belum ada riwayat</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Mulai absen hari ini untuk melihat riwayat
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentHistory.map((r) => {
                  const st = toUiStatus(r.status);
                  const Ic = statusConfig[st].icon;
                  const isToday = r.date === today;
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Ic className={`w-4 h-4 shrink-0 ${statusConfig[st].color}`} />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {new Date(r.date + "T00:00:00").toLocaleDateString("id-ID", {
                              weekday: "short", day: "numeric", month: "short",
                            })}
                            {isToday && (
                              <span className="ml-2 text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5 font-semibold">
                                Hari ini
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {fmtTime(r.checkIn)} — {fmtTime(r.checkOut)}
                          </p>
                        </div>
                      </div>
                      <Badge variant={st}>{statusConfig[st].label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
