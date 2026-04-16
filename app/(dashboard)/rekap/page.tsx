"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, CheckCircle2, AlertCircle,
  XCircle, Minus, TrendingUp, Clock, CalendarDays, Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/hooks/use-auth";
import type { SerializedAttendance } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type DayStatus = "hadir" | "terlambat" | "tidak_hadir" | "weekend" | "future" | "empty";

interface DayData {
  date: string;
  status: DayStatus;
  checkIn: string | null;
  checkOut: string | null;
}

interface MonthlySummary {
  hadir: number;
  terlambat: number;
  tidak_hadir: number;
  totalWorkDays: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS_ID   = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS_ID = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

function todayISO() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
}

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
  });
}

function workDuration(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return "—";
  const mins = Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000
  );
  return `${Math.floor(mins / 60)}j ${mins % 60}m`;
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00");
  return d.getDay() === 0 || d.getDay() === 6;
}

function toUiStatus(s: string): "hadir" | "terlambat" | "tidak_hadir" {
  if (s === "present") return "hadir";
  if (s === "late")    return "terlambat";
  return "tidak_hadir";
}

// ─── Day cell config ──────────────────────────────────────────────────────────

const dayConfig: Record<DayStatus, { bg: string; text: string; dot?: string; label?: string }> = {
  hadir:       { bg: "bg-success/15 border-success/30 hover:bg-success/25",              text: "text-success",             dot: "bg-success",     label: "Hadir" },
  terlambat:   { bg: "bg-warning/15 border-warning/30 hover:bg-warning/25",              text: "text-warning",             dot: "bg-warning",     label: "Terlambat" },
  tidak_hadir: { bg: "bg-destructive/10 border-destructive/20 hover:bg-destructive/20",  text: "text-destructive",         dot: "bg-destructive", label: "Tidak Hadir" },
  weekend:     { bg: "bg-secondary/40 border-transparent",                                text: "text-muted-foreground/50" },
  future:      { bg: "bg-secondary/20 border-transparent",                                text: "text-muted-foreground/40" },
  empty:       { bg: "bg-secondary/30 border-border/50 hover:bg-secondary/50",           text: "text-muted-foreground" },
};

// ─── Calendar grid ────────────────────────────────────────────────────────────

function CalendarGrid({
  year, month, days, selectedDate, onSelectDate,
}: {
  year: number; month: number; days: DayData[];
  selectedDate: string | null; onSelectDate: (d: DayData) => void;
}) {
  const today       = todayISO();
  const firstDay    = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayMap      = Object.fromEntries(days.map((d) => [d.date, d]));

  const cells: (null | DayData)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
      return dayMap[dateStr] ?? {
        date: dateStr,
        status: (isWeekend(dateStr) ? "weekend" : dateStr > today ? "future" : "empty") as DayStatus,
        checkIn: null, checkOut: null,
      };
    }),
  ];

  return (
    <div>
      <div className="grid grid-cols-7 mb-2">
        {DAYS_ID.map((d, i) => (
          <div key={d} className={`text-center text-xs font-semibold py-2 ${
            i === 0 || i === 6 ? "text-muted-foreground/50" : "text-muted-foreground"
          }`}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell, idx) => {
          if (!cell) return <div key={`blank-${idx}`} />;
          const cfg        = dayConfig[cell.status];
          const isToday    = cell.date === today;
          const isSelected = cell.date === selectedDate;
          const dayNum     = parseInt(cell.date.split("-")[2]);
          const clickable  = cell.status !== "weekend" && cell.status !== "future";

          return (
            <button
              key={cell.date}
              onClick={() => clickable && onSelectDate(cell)}
              disabled={!clickable}
              className={`
                relative aspect-square rounded-xl border text-sm font-medium
                transition-all duration-150 flex flex-col items-center justify-center gap-0.5
                ${cfg.bg} ${cfg.text}
                ${isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}
                ${isToday ? "ring-2 ring-primary/60" : ""}
                ${!clickable ? "cursor-default" : "cursor-pointer"}
              `}
            >
              <span className={`text-sm font-semibold leading-none ${isToday ? "text-primary" : ""}`}>
                {dayNum}
              </span>
              {cfg.dot && <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />}
              {isToday && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RekapPage() {
  const { profile, user } = useAuth();
  const userId = user?.uid ?? profile?.id;
  const now = new Date();

  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [loading,   setLoading]   = useState(true);
  const [days,      setDays]      = useState<DayData[]>([]);
  const [summary,   setSummary]   = useState<MonthlySummary>({
    hadir: 0, terlambat: 0, tidak_hadir: 0, totalWorkDays: 0,
  });
  const [selected, setSelected] = useState<DayData | null>(null);

  const loadMonth = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setSelected(null);
    try {
      const start = new Date(viewYear, viewMonth - 1, 1).toLocaleDateString("sv-SE");
      const end   = new Date(viewYear, viewMonth, 0).toLocaleDateString("sv-SE");

      const result = await apiFetch<{ records: SerializedAttendance[]; summary: { totalPresent: number; totalLate: number; totalAbsent: number } }>(
        `/api/reports?startDate=${start}&endDate=${end}&userId=${userId}`
      ).catch(() => ({ records: [], summary: { totalPresent: 0, totalLate: 0, totalAbsent: 0 } }));

      // Build day data from records
      const built: DayData[] = result.records.map((r) => ({
        date:     r.date,
        status:   toUiStatus(r.status),
        checkIn:  r.checkIn,
        checkOut: r.checkOut,
      }));
      setDays(built);

      // Count work days in month (Mon–Fri)
      let workDays = 0;
      const today  = todayISO();
      const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const d = `${viewYear}-${String(viewMonth).padStart(2,"0")}-${String(i).padStart(2,"0")}`;
        if (!isWeekend(d) && d <= today) workDays++;
      }

      setSummary({
        hadir:        result.summary.totalPresent,
        terlambat:    result.summary.totalLate,
        tidak_hadir:  result.summary.totalAbsent,
        totalWorkDays: workDays,
      });
    } finally {
      setLoading(false);
    }
  }, [userId, viewYear, viewMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadMonth(); }, [loadMonth]);

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth() + 1;
  const attendanceRate = summary.totalWorkDays > 0
    ? Math.round(((summary.hadir + summary.terlambat) / summary.totalWorkDays) * 100)
    : 0;

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Rekap Absensi</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Kalender kehadiran bulanan</p>
        </div>
        <button
          disabled
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl border border-card-border text-muted-foreground opacity-50 cursor-not-allowed self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          Export Bulan Ini
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <button
                onClick={prevMonth}
                className="flex items-center justify-center w-8 h-8 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-center">
                <h2 className="text-base font-bold text-foreground">
                  {MONTHS_ID[viewMonth - 1]} {viewYear}
                </h2>
                {isCurrentMonth && (
                  <span className="text-[10px] text-primary font-semibold uppercase tracking-wide">
                    Bulan ini
                  </span>
                )}
              </div>
              <button
                onClick={nextMonth}
                className="flex items-center justify-center w-8 h-8 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="grid grid-cols-7 gap-1.5">
                {[...Array(35)].map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-xl" />
                ))}
              </div>
            ) : (
              <CalendarGrid
                year={viewYear} month={viewMonth} days={days}
                selectedDate={selected?.date ?? null} onSelectDate={setSelected}
              />
            )}

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-border">
              {[
                { status: "hadir"       as DayStatus, label: "Hadir" },
                { status: "terlambat"   as DayStatus, label: "Terlambat" },
                { status: "tidak_hadir" as DayStatus, label: "Tidak Hadir" },
                { status: "empty"       as DayStatus, label: "Tidak ada data" },
                { status: "weekend"     as DayStatus, label: "Libur" },
              ].map(({ status, label }) => {
                const cfg = dayConfig[status];
                return (
                  <div key={status} className="flex items-center gap-1.5">
                    <span className={`w-3 h-3 rounded-sm border ${cfg.bg.split(" ")[0]} ${cfg.bg.split(" ")[1] ?? ""}`} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-4">

          {/* Detail panel */}
          <Card className={`transition-all duration-200 ${selected ? "border-primary/40" : ""}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Detail Hari</CardTitle>
              <CardDescription>
                {selected
                  ? new Date(selected.date + "T00:00:00").toLocaleDateString("id-ID", {
                      weekday: "long", day: "numeric", month: "long", year: "numeric",
                    })
                  : "Tap tanggal di kalender"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {!selected ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <CalendarDays className="w-8 h-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Pilih tanggal untuk melihat detail</p>
                </div>
              ) : selected.status === "empty" ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Minus className="w-8 h-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-medium text-foreground">Tidak ada data</p>
                  <p className="text-xs text-muted-foreground mt-1">Tidak ada rekaman absensi pada hari ini</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={selected.status as "hadir" | "terlambat" | "tidak_hadir"}>
                      {dayConfig[selected.status].label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Check-In
                    </span>
                    <span className="text-sm font-mono font-medium">{fmtTime(selected.checkIn)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Check-Out
                    </span>
                    <span className="text-sm font-mono font-medium">{fmtTime(selected.checkOut)}</span>
                  </div>
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Kerja</span>
                    <span className="text-sm font-bold text-foreground">
                      {workDuration(selected.checkIn, selected.checkOut)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ringkasan Bulan</CardTitle>
              <CardDescription>{MONTHS_ID[viewMonth - 1]} {viewYear}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {loading ? (
                [...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-xl" />)
              ) : (
                <>
                  {[
                    { icon: CheckCircle2, label: "Hadir",       value: summary.hadir,       color: "text-success" },
                    { icon: AlertCircle,  label: "Terlambat",   value: summary.terlambat,   color: "text-warning" },
                    { icon: XCircle,      label: "Tidak Hadir", value: summary.tidak_hadir, color: "text-destructive" },
                  ].map((s) => {
                    const Icon = s.icon;
                    return (
                      <div key={s.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${s.color}`} />
                          <span className="text-sm text-muted-foreground">{s.label}</span>
                        </div>
                        <span className="text-sm font-bold text-foreground">{s.value} hari</span>
                      </div>
                    );
                  })}

                  <div className="pt-3 border-t border-border space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <span className="text-sm text-muted-foreground">Kehadiran</span>
                      </div>
                      <span className="text-sm font-bold text-primary">{attendanceRate}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-700"
                        style={{ width: `${attendanceRate}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      {summary.hadir + summary.terlambat} / {summary.totalWorkDays} hari kerja
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
