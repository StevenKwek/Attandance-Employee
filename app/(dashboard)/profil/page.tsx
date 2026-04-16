"use client";

import { useState, useEffect, useCallback } from "react";
import {
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  Briefcase,
  Camera,
  Save,
  Lock,
  CheckCircle2,
  Clock,
  TrendingUp,
  Edit3,
  Loader2,
} from "lucide-react";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { useAuth, getInitials } from "@/lib/hooks/use-auth";
import { auth } from "@/lib/firebase/config";
import type { SerializedAttendance, UserDocument } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
}

function workMinutes(checkIn: string | null, checkOut: string | null): number {
  if (!checkIn || !checkOut) return 0;
  return Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000);
}

type UiStatus = "hadir" | "terlambat" | "tidak_hadir";

function toUiStatus(s: string): UiStatus {
  if (s === "present") return "hadir";
  if (s === "late") return "terlambat";
  return "tidak_hadir";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ icon: Icon, label, value, mono, muted }: { icon: React.ElementType; label?: string; value: string; mono?: boolean; muted?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", label && "flex-col items-start gap-1")}>
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className={cn("text-sm", mono ? "font-mono" : "", muted ? "text-muted-foreground" : "text-foreground")}>{value}</span>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    hadir:       { label: "Hadir",       className: "bg-success/10 text-success" },
    terlambat:   { label: "Terlambat",   className: "bg-warning/10 text-warning" },
    tidak_hadir: { label: "Tidak Hadir", className: "bg-destructive/10 text-destructive" },
  };
  const s = map[status] ?? { label: status, className: "bg-secondary text-muted-foreground" };
  return <span className={cn("text-xs font-medium px-2 py-1 rounded-lg", s.className)}>{s.label}</span>;
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "Min. 8 karakter", pass: password.length >= 8 },
    { label: "Huruf besar", pass: /[A-Z]/.test(password) },
    { label: "Angka", pass: /[0-9]/.test(password) },
    { label: "Karakter khusus", pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const labels = ["Sangat Lemah", "Lemah", "Cukup", "Kuat", "Sangat Kuat"];
  const colors = ["bg-destructive", "bg-orange-500", "bg-warning", "bg-blue-500", "bg-success"];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Kekuatan password</span>
        <span className="font-medium text-foreground">{labels[score]}</span>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-300", i < score ? colors[score] : "bg-secondary")} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5">
            <CheckCircle2 className={cn("w-3 h-3", c.pass ? "text-success" : "text-muted-foreground/40")} />
            <span className={cn("text-xs", c.pass ? "text-foreground" : "text-muted-foreground")}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilPage() {
  const { profile, user } = useAuth();
  const userId = user?.uid ?? profile?.id;
  const [apiProfile, setApiProfile] = useState<UserDocument | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const displayProfile = apiProfile ?? profile;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [myRecords, setMyRecords] = useState<SerializedAttendance[]>([]);

  // Load profile from server API (fast, not blocked by ad blocker)
  useEffect(() => {
    if (!userId) return;
    apiFetch<UserDocument>(`/api/users/${userId}`)
      .then((data) => {
        setApiProfile(data);
        setName(data.name);
        setPhone(data.phone ?? "");
      })
      .catch(() => {
        // Fall back to Firestore profile if available
        if (profile) {
          setName(profile.name);
          setPhone(profile.phone ?? "");
        }
      })
      .finally(() => setProfileLoading(false));
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadHistory = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await apiFetch<SerializedAttendance[]>(`/api/attendance?userId=${userId}`);
      setMyRecords(data);
    } catch { /* ignore */ }
  }, [userId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Computed stats
  const hadirCount = myRecords.filter((r) => r.status === "present").length;
  const terlambatCount = myRecords.filter((r) => r.status === "late").length;
  const totalWorkHours = Math.round(
    myRecords.reduce((acc, r) => acc + workMinutes(r.checkIn, r.checkOut), 0) / 60
  );
  const kehadiranRate = myRecords.length > 0 ? Math.round((hadirCount / myRecords.length) * 100) : 0;

  const joinDate = displayProfile?.joinDate ? new Date(displayProfile.joinDate) : null;
  const yearsWorked = joinDate
    ? Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 365))
    : null;

  const initials = name ? getInitials(name) : "?";

  const handleSaveProfile = async () => {
    if (!userId) return;
    setSaving(true);
    setSaveError("");
    try {
      await apiFetch(`/api/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ name, phone }),
      });
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setName(profile?.name ?? "");
    setPhone(profile?.phone ?? "");
    setSaveError("");
    setEditing(false);
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Semua kolom wajib diisi.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Password baru dan konfirmasi tidak cocok.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password baru minimal 8 karakter.");
      return;
    }

    if (!user || !user.email) {
      setPasswordError("Sesi tidak ditemukan. Silakan login ulang.");
      return;
    }

    setPasswordSaving(true);
    try {
      // Re-authenticate first (required by Firebase for sensitive operations)
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setPasswordSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("wrong-password") || msg.includes("invalid-credential")) {
        setPasswordError("Password saat ini salah.");
      } else {
        setPasswordError("Gagal mengubah password. Coba lagi.");
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl w-full">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Profil Saya</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">Kelola informasi akun dan preferensi Anda</p>
      </div>

      {/* Profile card */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="relative shrink-0">
              <Avatar className="w-24 h-24 text-2xl">
                <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary-hover transition-colors" title="Ganti foto">
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h2 className="text-xl font-bold text-foreground">{name}</h2>
                <Badge variant="aktif" className="self-center sm:self-auto">Aktif</Badge>
              </div>
              <p className="text-muted-foreground text-sm mt-1 capitalize">{displayProfile?.role} {displayProfile?.department ? `• ${displayProfile.department}` : ""}</p>
              {joinDate && (
                <p className="text-muted-foreground text-xs mt-1">
                  Bergabung sejak {joinDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
                  {yearsWorked !== null && yearsWorked > 0 && ` • ${yearsWorked} tahun`}
                </p>
              )}
            </div>
            <Button
              variant={editing ? "outline" : "secondary"}
              size="sm"
              className="gap-2 shrink-0"
              onClick={() => editing ? handleCancelEdit() : setEditing(true)}
            >
              <Edit3 className="w-3.5 h-3.5" />
              {editing ? "Batal" : "Edit Profil"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={CheckCircle2} label="Total Hadir" value={hadirCount} color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" />
        <StatCard icon={Clock} label="Terlambat" value={terlambatCount} color="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400" />
        <StatCard icon={TrendingUp} label="Tingkat Hadir" value={`${kehadiranRate}%`} color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" />
        <StatCard icon={Briefcase} label="Total Jam Kerja" value={`${totalWorkHours}j`} color="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Personal info */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10"><User className="w-4 h-4 text-primary" /></div>
                <div>
                  <CardTitle className="text-base">Informasi Pribadi</CardTitle>
                  <CardDescription>Data diri dan kontak Anda</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nama Lengkap</Label>
                {editing ? (
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" />
                ) : (
                  <InfoRow icon={User} value={name} />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <InfoRow icon={Mail} value={displayProfile?.email ?? user?.email ?? "—"} muted={editing} />
                {editing && <p className="text-xs text-muted-foreground">Email tidak dapat diubah.</p>}
              </div>
              <div className="space-y-1.5">
                <Label>No. Telepon</Label>
                {editing ? (
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
                ) : (
                  <InfoRow icon={Phone} value={phone || "—"} />
                )}
              </div>

              {saveError && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{saveError}</p>
              )}

              {editing && (
                <div className="flex gap-2 pt-1">
                  <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : <><Save className="w-4 h-4" /> Simpan</>}
                  </Button>
                  <Button variant="outline" onClick={handleCancelEdit}>Batal</Button>
                </div>
              )}

              {saved && (
                <div className="flex items-center gap-2 text-success text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Profil berhasil disimpan!
                </div>
              )}
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10"><Lock className="w-4 h-4 text-primary" /></div>
                <div>
                  <CardTitle className="text-base">Ubah Password</CardTitle>
                  <CardDescription>Gunakan password yang kuat dan unik</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Password Saat Ini</Label>
                <Input type="password" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Password Baru</Label>
                  <Input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Konfirmasi Password</Label>
                  <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
              </div>
              {newPassword.length > 0 && <PasswordStrength password={newPassword} />}
              {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
              {passwordSaved && (
                <div className="flex items-center gap-2 text-success text-sm">
                  <CheckCircle2 className="w-4 h-4" />Password berhasil diubah!
                </div>
              )}
              <Button onClick={handleChangePassword} disabled={passwordSaving} variant="outline" className="gap-2">
                {passwordSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : <><Lock className="w-4 h-4" /> Ubah Password</>}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10"><Briefcase className="w-4 h-4 text-primary" /></div>
                <div>
                  <CardTitle className="text-base">Info Pekerjaan</CardTitle>
                  <CardDescription>Data kepegawaian</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow icon={Briefcase} label="Role" value={displayProfile?.role === "admin" ? "Admin" : "Karyawan"} />
              {displayProfile?.department && <InfoRow icon={Building2} label="Departemen" value={displayProfile.department} />}
              <InfoRow icon={User} label="User ID" value={(userId ?? "—").slice(0, 12) + "…"} mono />
              {joinDate && (
                <InfoRow icon={Calendar} label="Bergabung" value={joinDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Riwayat Terkini</CardTitle>
              <CardDescription>Absensi 5 hari terakhir</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {myRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada riwayat absensi.</p>
              ) : (
                myRecords.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{fmtDate(r.date)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fmtTime(r.checkIn)} – {fmtTime(r.checkOut)}
                      </p>
                    </div>
                    <StatusDot status={toUiStatus(r.status)} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
