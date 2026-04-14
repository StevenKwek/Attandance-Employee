"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Clock,
  BarChart2,
  Download,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import type { SerializedAttendance, AttendanceSummary } from "@/lib/types";

const PIE_COLORS = ["#3b82f6", "#f59e0b", "#ef4444"];

interface MonthStat {
  month: string;
  hadir: number;
  terlambat: number;
  tidak_hadir: number;
}

interface ReportResult {
  records: SerializedAttendance[];
  summary: AttendanceSummary;
}

const MONTHS = [
  { value: "1",  label: "Januari" },
  { value: "2",  label: "Februari" },
  { value: "3",  label: "Maret" },
  { value: "4",  label: "April" },
  { value: "5",  label: "Mei" },
  { value: "6",  label: "Juni" },
  { value: "7",  label: "Juli" },
  { value: "8",  label: "Agustus" },
  { value: "9",  label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
  });
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function statusLabel(s: string): string {
  if (s === "present") return "Hadir";
  if (s === "late")    return "Terlambat";
  return "Tidak Hadir";
}

function workDuration(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return "-";
  const mins = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000);
  return `${Math.floor(mins / 60)}j ${mins % 60}m`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Export helpers ───────────────────────────────────────────────────────────

function exportCSV(records: SerializedAttendance[], monthLabel: string, year: string) {
  const header = ["No", "User ID", "Tanggal", "Check-In", "Check-Out", "Jam Kerja", "Status"];
  const rows = records.map((r, i) => [
    i + 1,
    r.userId,
    fmtDate(r.date),
    fmtTime(r.checkIn),
    fmtTime(r.checkOut),
    workDuration(r.checkIn, r.checkOut),
    statusLabel(r.status),
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  triggerDownload(
    new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
    `laporan-absensi-${monthLabel}-${year}.csv`
  );
}

async function exportExcel(records: SerializedAttendance[], monthLabel: string, year: string) {
  const { utils, writeFile } = await import("xlsx");

  const data = records.map((r, i) => ({
    No: i + 1,
    "User ID": r.userId,
    Tanggal: fmtDate(r.date),
    "Check-In": fmtTime(r.checkIn),
    "Check-Out": fmtTime(r.checkOut),
    "Jam Kerja": workDuration(r.checkIn, r.checkOut),
    Status: statusLabel(r.status),
  }));

  const ws = utils.json_to_sheet(data);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, `${monthLabel} ${year}`);

  // Column widths
  ws["!cols"] = [
    { wch: 5 }, { wch: 30 }, { wch: 32 }, { wch: 10 },
    { wch: 10 }, { wch: 12 }, { wch: 14 },
  ];

  writeFile(wb, `laporan-absensi-${monthLabel}-${year}.xlsx`);
}

async function exportPDF(
  records: SerializedAttendance[],
  summary: AttendanceSummary,
  monthLabel: string,
  year: string
) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape" });

  // Title
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(`Laporan Absensi — ${monthLabel} ${year}`, 14, 18);

  // Summary bar
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Hadir: ${summary.totalPresent}   Terlambat: ${summary.totalLate}   Tidak Hadir: ${summary.totalAbsent}   Total: ${records.length}`,
    14, 26
  );

  autoTable(doc, {
    startY: 32,
    head: [["No", "User ID", "Tanggal", "Check-In", "Check-Out", "Jam Kerja", "Status"]],
    body: records.map((r, i) => [
      i + 1,
      r.userId,
      fmtDate(r.date),
      fmtTime(r.checkIn),
      fmtTime(r.checkOut),
      workDuration(r.checkIn, r.checkOut),
      statusLabel(r.status),
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 48 },
      2: { cellWidth: 52 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { cellWidth: 22 },
      6: { cellWidth: 24 },
    },
  });

  doc.save(`laporan-absensi-${monthLabel}-${year}.pdf`);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LaporanPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedYear, setSelectedYear]   = useState(String(now.getFullYear()));
  const [loading, setLoading]             = useState(true);
  const [exporting, setExporting]         = useState<"csv" | "excel" | "pdf" | null>(null);
  const [summary, setSummary]             = useState<AttendanceSummary>({ totalPresent: 0, totalLate: 0, totalAbsent: 0 });
  const [records, setRecords]             = useState<SerializedAttendance[]>([]);
  const [monthlyStats, setMonthlyStats]   = useState<MonthStat[]>([]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const year  = parseInt(selectedYear);
      const month = parseInt(selectedMonth);
      const start = new Date(year, month - 1, 1).toLocaleDateString("sv-SE");
      const end   = new Date(year, month, 0).toLocaleDateString("sv-SE");

      // Build trend date ranges
      const trendMonths = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return {
          label: d.toLocaleDateString("id-ID", { month: "short" }),
          start: d.toLocaleDateString("sv-SE"),
          end:   new Date(d.getFullYear(), d.getMonth() + 1, 0).toLocaleDateString("sv-SE"),
        };
      });

      // Fetch selected month + 6-month trend in parallel
      const [selectedResult, ...trendResults] = await Promise.all([
        apiFetch<ReportResult>(`/api/reports?startDate=${start}&endDate=${end}`).catch(() => ({
          records: [],
          summary: { totalPresent: 0, totalLate: 0, totalAbsent: 0 },
        })),
        ...trendMonths.map(({ start: s, end: e }) =>
          apiFetch<ReportResult>(`/api/reports?startDate=${s}&endDate=${e}`).catch(() => ({
            records: [],
            summary: { totalPresent: 0, totalLate: 0, totalAbsent: 0 },
          }))
        ),
      ]);

      setSummary(selectedResult.summary);
      setRecords(selectedResult.records);
      setMonthlyStats(
        trendMonths.map(({ label }, i) => ({
          month:       label,
          hadir:       trendResults[i].summary.totalPresent,
          terlambat:   trendResults[i].summary.totalLate,
          tidak_hadir: trendResults[i].summary.totalAbsent,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadReport(); }, [loadReport]);

  const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label ?? "";
  const total         = summary.totalPresent + summary.totalLate + summary.totalAbsent;
  const kehadiranRate = total > 0 ? Math.round((summary.totalPresent / total) * 100) : 0;

  const pieData = [
    { name: "Hadir",       value: summary.totalPresent },
    { name: "Terlambat",   value: summary.totalLate },
    { name: "Tidak Hadir", value: summary.totalAbsent },
  ];

  const handleExport = async (type: "csv" | "excel" | "pdf") => {
    if (loading || exporting) return;
    setExporting(type);
    try {
      if (type === "csv")   exportCSV(records, monthLabel, selectedYear);
      if (type === "excel") await exportExcel(records, monthLabel, selectedYear);
      if (type === "pdf")   await exportPDF(records, summary, monthLabel, selectedYear);
    } finally {
      setExporting(null);
    }
  };

  const exportButtons = [
    {
      type: "pdf"   as const,
      icon: FileText,
      label: "Export PDF",
      desc: "Laporan lengkap dalam format PDF",
      color: "text-red-500",
      bg: "bg-red-50 dark:bg-red-900/20",
    },
    {
      type: "excel" as const,
      icon: FileSpreadsheet,
      label: "Export Excel",
      desc: "Data mentah dalam format spreadsheet",
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-900/20",
    },
    {
      type: "csv"   as const,
      icon: Download,
      label: "Export CSV",
      desc: "Format data terpisah koma (CSV)",
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Laporan Absensi</h1>
          <p className="text-muted-foreground mt-0.5">Analisis dan ringkasan data kehadiran karyawan</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-36">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Hadir",    value: summary.totalPresent, icon: Users,    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600",   trendUp: true  },
          { label: "Terlambat",      value: summary.totalLate,    icon: Clock,    color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600", trendUp: false },
          { label: "Tidak Hadir",    value: summary.totalAbsent,  icon: Users,    color: "bg-red-100 dark:bg-red-900/30 text-red-600",      trendUp: false },
          { label: "Tingkat Hadir",  value: `${kehadiranRate}%`,  icon: BarChart2, color: "bg-green-100 dark:bg-green-900/30 text-green-600", trendUp: true  },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <div className={`p-2 rounded-xl ${s.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{s.value}</p>
                )}
                <div className="flex items-center gap-1 mt-1.5">
                  {s.trendUp
                    ? <TrendingUp className="w-3 h-3 text-success" />
                    : <TrendingDown className="w-3 h-3 text-destructive" />
                  }
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tren Absensi Bulanan</CardTitle>
            <CardDescription>Perbandingan kehadiran 6 bulan terakhir</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-[260px] w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyStats} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)", borderRadius: "12px", color: "var(--card-foreground)" }} />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }}
                    formatter={(v) => v === "hadir" ? "Hadir" : v === "terlambat" ? "Terlambat" : "Tidak Hadir"} />
                  <Bar dataKey="hadir"       fill="#3b82f6" radius={[4,4,0,0]} name="hadir" />
                  <Bar dataKey="terlambat"   fill="#f59e0b" radius={[4,4,0,0]} name="terlambat" />
                  <Bar dataKey="tidak_hadir" fill="#ef4444" radius={[4,4,0,0]} name="tidak_hadir" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribusi Status</CardTitle>
            <CardDescription>{monthLabel} {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-[180px] w-full rounded-xl" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)", borderRadius: "12px", color: "var(--card-foreground)" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {pieData.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.value}</span>
                        <span className="text-muted-foreground text-xs">
                          ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle>Export Laporan</CardTitle>
          <CardDescription>
            Unduh data absensi {monthLabel} {selectedYear}
            {!loading && records.length > 0 && ` — ${records.length} rekaman`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* No-data notice */}
          {!loading && records.length === 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
              <span className="text-warning mt-0.5 text-base leading-none">⚠</span>
              <div>
                <p className="text-sm font-medium text-foreground">Belum ada data absensi</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tidak ada rekaman absensi untuk {monthLabel} {selectedYear}.
                  Pilih bulan lain yang sudah memiliki data agar bisa diunduh.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {exportButtons.map((item) => {
              const Icon = item.icon;
              const isExporting = exporting === item.type;
              const isDisabled  = loading || !!exporting || records.length === 0;
              return (
                <button
                  key={item.type}
                  onClick={() => handleExport(item.type)}
                  disabled={isDisabled}
                  title={records.length === 0 && !loading ? "Tidak ada data untuk diekspor" : undefined}
                  className="relative flex items-center gap-4 p-4 rounded-2xl border border-card-border transition-all text-left group
                    enabled:hover:border-primary/40 enabled:hover:bg-secondary/50
                    disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className={`p-3 rounded-xl ${item.bg} shrink-0`}>
                    {isExporting
                      ? <Loader2 className={`w-5 h-5 ${item.color} animate-spin`} />
                      : <Icon className={`w-5 h-5 ${item.color}`} />
                    }
                  </div>
                  <div>
                    <p className="font-medium text-sm group-enabled:group-hover:text-primary transition-colors">
                      {isExporting ? "Mengunduh..." : item.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {!loading && records.length === 0
                        ? "Tidak ada data"
                        : item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
