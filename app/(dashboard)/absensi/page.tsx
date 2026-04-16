"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Clock,
  LogIn,
  LogOut,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Loader2,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiFetch } from "@/lib/api-client";
import { useAuth, getInitials } from "@/lib/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import type { SerializedAttendance } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type UiStatus = "hadir" | "terlambat" | "tidak_hadir";

const statusConfig: Record<UiStatus, { label: string; icon: React.ElementType; color: string }> = {
  hadir:       { label: "Hadir",       icon: CheckCircle2, color: "text-success" },
  terlambat:   { label: "Terlambat",   icon: AlertCircle,  color: "text-warning" },
  tidak_hadir: { label: "Tidak Hadir", icon: XCircle,      color: "text-destructive" },
};

function toUiStatus(s: string): UiStatus {
  if (s === "present") return "hadir";
  if (s === "late") return "terlambat";
  return "tidak_hadir";
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function todayISO(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
}

function workMinutes(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return "—";
  const mins = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000);
  return `${Math.floor(mins / 60)}j ${mins % 60}m`;
}

// ─── Office hours ─────────────────────────────────────────────────────────────

const OFFICE_OPEN  = { hour: 7,  minute: 0  };   // 07:00 WIB
const OFFICE_CLOSE = { hour: 17, minute: 30 };   // 17:30 WIB

type OfficeStatus = "open" | "not_open_yet" | "closed";

function getOfficeStatus(): OfficeStatus {
  const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
  const wib = new Date(now);
  const current = wib.getHours() * 60 + wib.getMinutes();
  const open    = OFFICE_OPEN.hour  * 60 + OFFICE_OPEN.minute;
  const close   = OFFICE_CLOSE.hour * 60 + OFFICE_CLOSE.minute;
  if (current < open)   return "not_open_yet";
  if (current > close)  return "closed";
  return "open";
}

function pad(n: number) { return String(n).padStart(2, "0"); }
const OPEN_STR  = `${pad(OFFICE_OPEN.hour)}:${pad(OFFICE_OPEN.minute)}`;
const CLOSE_STR = `${pad(OFFICE_CLOSE.hour)}:${pad(OFFICE_CLOSE.minute)}`;

/** Re-evaluates office status every 30 seconds */
function useOfficeStatus() {
  const [status, setStatus] = useState<OfficeStatus>(getOfficeStatus);
  useEffect(() => {
    const id = setInterval(() => setStatus(getOfficeStatus()), 30_000);
    return () => clearInterval(id);
  }, []);
  return status;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AbsensiPage() {
  const { profile, user } = useAuth();
  const userId = user?.uid ?? profile?.id;
  const officeStatus = useOfficeStatus();
  const [history, setHistory] = useState<SerializedAttendance[]>([]);
  const [todayRecord, setTodayRecord] = useState<SerializedAttendance | null>(null);
  const [loadingIn, setLoadingIn] = useState(false);
  const [loadingOut, setLoadingOut] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [apiError, setApiError] = useState("");

  const loadHistory = useCallback(async () => {
    if (!userId) return;
    setLoadingHistory(true);
    try {
      const data = await apiFetch<SerializedAttendance[]>(`/api/attendance?userId=${userId}`);
      setHistory(data);
      const today = todayISO();
      const rec = data.find((r) => r.date === today) ?? null;
      setTodayRecord(rec);
    } finally {
      setLoadingHistory(false);
    }
  }, [userId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleCheckIn = async () => {
    setApiError("");
    setLoadingIn(true);
    try {
      const record = await apiFetch<SerializedAttendance>("/api/attendance", { method: "POST" });
      setTodayRecord(record);
      setHistory((prev) => [record, ...prev.filter((r) => r.date !== record.date)]);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Check-in gagal.");
    } finally {
      setLoadingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setApiError("");
    setLoadingOut(true);
    try {
      const record = await apiFetch<SerializedAttendance>("/api/attendance/checkout", { method: "PATCH" });
      setTodayRecord(record);
      setHistory((prev) => prev.map((r) => (r.id === record.id ? record : r)));
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Check-out gagal.");
    } finally {
      setLoadingOut(false);
    }
  };

  const checkedIn = !!todayRecord?.checkIn;
  const checkedOut = !!todayRecord?.checkOut;
  const currentUiStatus = todayRecord ? toUiStatus(todayRecord.status) : null;

  const filteredHistory = history.filter((r) => {
    if (filterStatus === "all") return true;
    return toUiStatus(r.status) === filterStatus;
  });

  const exportCSV = () => {
    if (history.length === 0) return;
    const rows = [
      ["Nama", "Tanggal", "Check-In", "Check-Out", "Jam Kerja", "Status"],
      ...history.map((r) => {
        const uiStatus = toUiStatus(r.status);
        const label = statusConfig[uiStatus].label;
        const mins = r.checkIn && r.checkOut
          ? Math.round((new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 60000)
          : null;
        const durasi = mins !== null ? `${Math.floor(mins / 60)}j ${mins % 60}m` : "-";
        return [
          profile?.name ?? "-",
          r.date,
          fmtTime(r.checkIn),
          fmtTime(r.checkOut),
          durasi,
          label,
        ];
      }),
    ];
    const csv = "\uFEFF" + rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `absensi-${profile?.name?.replace(/\s+/g, "-") ?? "saya"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const todayStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Absensi</h1>
          <p className="text-muted-foreground mt-0.5 text-sm capitalize flex items-center gap-2 flex-wrap">
            {todayStr} • Jam kerja: {OPEN_STR} – {CLOSE_STR}
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              officeStatus === "open"
                ? "bg-success/15 text-success"
                : "bg-destructive/10 text-destructive"
            }`}>
              <Building2 className="w-3 h-3" />
              {officeStatus === "open" ? "Buka" : officeStatus === "not_open_yet" ? "Belum Buka" : "Tutup"}
            </span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          onClick={exportCSV}
          disabled={history.length === 0 || loadingHistory}
          title={history.length === 0 ? "Belum ada data untuk diekspor" : "Export riwayat absensi ke CSV"}
        >
          <Download className="w-4 h-4" />
          <span className="hidden xs:inline">Export CSV</span>
        </Button>
      </div>

      {/* Check-in / check-out panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Clock widget */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6 flex flex-col items-center justify-center gap-4 min-h-[280px]">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full border-4 border-primary/20 bg-primary/5 flex items-center justify-center mb-3">
                <Clock className="w-10 h-10 text-primary" />
              </div>
              <ClockDisplay />
              <p className="text-muted-foreground text-sm mt-1 capitalize">{todayStr.split(",")[0]}, {todayStr.split(",").slice(1).join(",").trim()}</p>
            </div>

            <div className="text-center">
              {currentUiStatus ? (
                <Badge variant={currentUiStatus} className="text-sm px-3 py-1">
                  {statusConfig[currentUiStatus].label}
                </Badge>
              ) : (
                <Badge variant="nonaktif" className="text-sm px-3 py-1">Belum Absen</Badge>
              )}
            </div>

            <div className="w-full grid grid-cols-2 gap-3">
              <div className="bg-secondary rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Check-In</p>
                <p className="font-bold text-foreground">{fmtTime(todayRecord?.checkIn ?? null)}</p>
              </div>
              <div className="bg-secondary rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Check-Out</p>
                <p className="font-bold text-foreground">{fmtTime(todayRecord?.checkOut ?? null)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Absensi Hari Ini</CardTitle>
            <CardDescription>Klik tombol check-in saat tiba dan check-out saat pulang</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {apiError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
                {apiError.includes(":") ? apiError.split(":").slice(1).join(":").trim() : apiError}
              </p>
            )}
            {!checkedIn && officeStatus !== "open" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary rounded-xl px-4 py-3">
                <Building2 className="w-4 h-4 shrink-0 text-destructive" />
                <span>
                  {officeStatus === "not_open_yet"
                    ? `Kantor belum buka. Check-in tersedia mulai pukul ${OPEN_STR} WIB.`
                    : `Kantor sudah tutup. Check-in hanya tersedia hingga pukul ${CLOSE_STR} WIB.`}
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Check-in */}
              <button
                onClick={handleCheckIn}
                disabled={checkedIn || loadingIn || officeStatus !== "open"}
                className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl p-8 border-2 transition-all duration-200 ${
                  checkedIn
                    ? "border-success/30 bg-success/5 cursor-not-allowed"
                    : officeStatus !== "open"
                    ? "border-border bg-secondary/30 cursor-not-allowed opacity-60"
                    : "border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/10 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer active:translate-y-0"
                }`}
              >
                {loadingIn ? (
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                ) : (
                  <div className={`p-4 rounded-2xl ${checkedIn ? "bg-success/10" : "bg-primary/10"}`}>
                    <LogIn className={`w-8 h-8 ${checkedIn ? "text-success" : "text-primary"}`} />
                  </div>
                )}
                <div className="text-center">
                  <p className="font-bold text-lg">{checkedIn ? "Sudah Check-In" : "Check-In"}</p>
                  <p className="text-sm text-muted-foreground">
                    {checkedIn
                      ? `Pukul ${fmtTime(todayRecord?.checkIn ?? null)}`
                      : officeStatus === "not_open_yet"
                      ? `Buka pukul ${OPEN_STR}`
                      : officeStatus === "closed"
                      ? "Kantor sudah tutup"
                      : "Klik untuk absen masuk"}
                  </p>
                </div>
                {checkedIn && <CheckCircle2 className="absolute top-3 right-3 w-5 h-5 text-success" />}
              </button>

              {/* Check-out */}
              <button
                onClick={handleCheckOut}
                disabled={!checkedIn || checkedOut || loadingOut}
                className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl p-8 border-2 transition-all duration-200 ${
                  !checkedIn
                    ? "border-border bg-secondary/30 cursor-not-allowed opacity-50"
                    : checkedOut
                    ? "border-success/30 bg-success/5 cursor-not-allowed"
                    : "border-orange-300/50 bg-orange-50/50 dark:bg-orange-900/10 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer active:translate-y-0"
                }`}
              >
                {loadingOut ? (
                  <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                ) : (
                  <div className={`p-4 rounded-2xl ${checkedOut ? "bg-success/10" : "bg-orange-100 dark:bg-orange-900/20"}`}>
                    <LogOut className={`w-8 h-8 ${checkedOut ? "text-success" : "text-orange-500"}`} />
                  </div>
                )}
                <div className="text-center">
                  <p className="font-bold text-lg">{checkedOut ? "Sudah Check-Out" : "Check-Out"}</p>
                  <p className="text-sm text-muted-foreground">
                    {checkedOut
                      ? `Pukul ${fmtTime(todayRecord?.checkOut ?? null)}`
                      : checkedIn
                      ? "Klik untuk absen pulang"
                      : "Absen masuk terlebih dahulu"}
                  </p>
                </div>
                {checkedOut && <CheckCircle2 className="absolute top-3 right-3 w-5 h-5 text-success" />}
              </button>
            </div>

            {/* Work duration */}
            {checkedIn && (
              <div className="bg-secondary rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Durasi Kerja</p>
                    <p className="text-xs text-muted-foreground">Sejak check-in</p>
                  </div>
                </div>
                <p className="font-bold text-foreground">
                  {workMinutes(todayRecord?.checkIn ?? null, todayRecord?.checkOut ?? null)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Riwayat Absensi Saya</CardTitle>
              <CardDescription>Data kehadiran pribadi</CardDescription>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36">
                <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="hadir">Hadir</SelectItem>
                <SelectItem value="terlambat">Terlambat</SelectItem>
                <SelectItem value="tidak_hadir">Tidak Hadir</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loadingHistory ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Karyawan", "Tanggal", "Check-In", "Check-Out", "Jam Kerja", "Status"].map((h) => (
                      <th key={h} className="text-left py-3 px-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                          <Skeleton className="h-3.5 w-24" />
                        </div>
                      </td>
                      <td className="py-3 px-2"><Skeleton className="h-3.5 w-28" /></td>
                      <td className="py-3 px-2"><Skeleton className="h-3.5 w-12" /></td>
                      <td className="py-3 px-2"><Skeleton className="h-3.5 w-12" /></td>
                      <td className="py-3 px-2"><Skeleton className="h-3.5 w-14" /></td>
                      <td className="py-3 px-2"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">Tidak ada data</p>
              <p className="text-sm text-muted-foreground mt-1">Belum ada rekaman absensi.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Karyawan", "Tanggal", "Check-In", "Check-Out", "Jam Kerja", "Status"].map((h) => (
                      <th key={h} className="text-left py-3 px-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredHistory.map((record) => {
                    const uiStatus = toUiStatus(record.status);
                    const StatusIcon = statusConfig[uiStatus].icon;
                    return (
                      <tr key={record.id} className="hover:bg-secondary/50 transition-colors">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-7 h-7">
                              <AvatarFallback className="text-[10px]">{getInitials(profile?.name ?? "?")}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground">{profile?.name ?? "—"}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">{fmtDate(record.date)}</td>
                        <td className="py-3 px-2 font-mono">{fmtTime(record.checkIn)}</td>
                        <td className="py-3 px-2 font-mono">{fmtTime(record.checkOut)}</td>
                        <td className="py-3 px-2 font-mono">{workMinutes(record.checkIn, record.checkOut)}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1.5">
                            <StatusIcon className={`w-3.5 h-3.5 ${statusConfig[uiStatus].color}`} />
                            <Badge variant={uiStatus}>{statusConfig[uiStatus].label}</Badge>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ClockDisplay() {
  const [time, setTime] = useState("--:--:--");
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Jakarta" }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return <p className="text-3xl font-bold font-mono text-foreground tabular-nums">{time}</p>;
}
