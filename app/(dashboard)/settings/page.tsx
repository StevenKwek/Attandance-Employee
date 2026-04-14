"use client";

import { useState } from "react";
import {
  Bell,
  Shield,
  Clock,
  Palette,
  Building2,
  Save,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

function SettingSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-0.5">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "bg-primary" : "bg-secondary border border-border"
      )}
    >
      <span
        className={cn(
          "inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
        style={{ width: "18px", height: "18px" }}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Company settings
  const [companyName, setCompanyName] = useState("PT. Maju Bersama Indonesia");
  const [companyAddress, setCompanyAddress] = useState("Jl. Sudirman No. 123, Jakarta");
  const [timezone, setTimezone] = useState("asia-jakarta");

  // Attendance settings
  const [checkInStart, setCheckInStart] = useState("07:00");
  const [checkInEnd, setCheckInEnd] = useState("09:00");
  const [lateThreshold, setLateThreshold] = useState("08:00");
  const [workHours, setWorkHours] = useState("9");

  // Notification settings
  const [notifLate, setNotifLate] = useState(true);
  const [notifAbsent, setNotifAbsent] = useState(true);
  const [notifReport, setNotifReport] = useState(false);
  const [notifEmail, setNotifEmail] = useState(true);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-3xl w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Pengaturan</h1>
          <p className="text-muted-foreground mt-0.5">
            Kelola konfigurasi sistem absensi
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Menyimpan...
            </>
          ) : saved ? (
            <>Tersimpan!</>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Simpan
            </>
          )}
        </Button>
      </div>

      {/* Theme */}
      <SettingSection
        icon={Palette}
        title="Tampilan"
        description="Atur tema dan tampilan aplikasi"
      >
        <div className="space-y-3">
          <Label>Mode Tampilan</Label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "light", label: "Terang", icon: Sun },
              { value: "dark", label: "Gelap", icon: Moon },
              { value: "system", label: "Sistem", icon: Monitor },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={cn(
                    "flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all",
                    theme === t.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </SettingSection>

      {/* Company info */}
      <SettingSection
        icon={Building2}
        title="Informasi Perusahaan"
        description="Data dan informasi umum perusahaan"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Nama Perusahaan</Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Alamat</Label>
            <Input
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Zona Waktu</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asia-jakarta">WIB (UTC+7)</SelectItem>
                <SelectItem value="asia-makassar">WITA (UTC+8)</SelectItem>
                <SelectItem value="asia-jayapura">WIT (UTC+9)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SettingSection>

      {/* Attendance rules */}
      <SettingSection
        icon={Clock}
        title="Aturan Absensi"
        description="Konfigurasi jam kerja dan batas waktu"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Mulai Check-In</Label>
            <Input
              type="time"
              value={checkInStart}
              onChange={(e) => setCheckInStart(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Batas Check-In</Label>
            <Input
              type="time"
              value={checkInEnd}
              onChange={(e) => setCheckInEnd(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Jam Masuk</Label>
            <Input
              type="time"
              value={lateThreshold}
              onChange={(e) => setLateThreshold(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Jam Kerja (jam)</Label>
            <Input
              type="number"
              min="1"
              max="12"
              value={workHours}
              onChange={(e) => setWorkHours(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Karyawan yang check-in setelah pukul {lateThreshold} akan ditandai
          sebagai &quot;Terlambat&quot;.
        </p>
      </SettingSection>

      {/* Notifications */}
      <SettingSection
        icon={Bell}
        title="Notifikasi"
        description="Atur kapan dan bagaimana Anda menerima notifikasi"
      >
        <div className="space-y-4">
          {[
            {
              label: "Notifikasi keterlambatan",
              desc: "Kirim notifikasi saat karyawan check-in terlambat",
              value: notifLate,
              onChange: setNotifLate,
            },
            {
              label: "Notifikasi ketidakhadiran",
              desc: "Kirim notifikasi saat karyawan tidak hadir",
              value: notifAbsent,
              onChange: setNotifAbsent,
            },
            {
              label: "Laporan mingguan otomatis",
              desc: "Kirim ringkasan laporan setiap Senin pagi",
              value: notifReport,
              onChange: setNotifReport,
            },
            {
              label: "Notifikasi via Email",
              desc: "Kirim notifikasi ke email selain sistem",
              value: notifEmail,
              onChange: setNotifEmail,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between py-1"
            >
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
              <Toggle checked={item.value} onChange={item.onChange} />
            </div>
          ))}
        </div>
      </SettingSection>

      {/* Security */}
      <SettingSection
        icon={Shield}
        title="Keamanan"
        description="Kelola password dan keamanan akun"
      >
        <div className="flex items-start gap-3 rounded-xl bg-secondary/50 px-4 py-3">
          <Shield className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Ubah Password</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Untuk mengubah password, buka halaman{" "}
              <a href="/profil" className="text-primary hover:underline font-medium">
                Profil
              </a>{" "}
              dan gunakan bagian &quot;Ubah Password&quot; di sana.
            </p>
          </div>
        </div>
      </SettingSection>
    </div>
  );
}
