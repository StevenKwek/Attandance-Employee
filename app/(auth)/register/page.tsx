"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye, EyeOff, Building2, ArrowRight,
  Lock, Mail, User, CheckCircle2,
} from "lucide-react";
import { startNavigation } from "@/components/ui/navigation-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { registerUser } from "@/lib/services/auth.service";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirm,  setShowConfirm]    = useState(false);
  const [loading,      setLoading]        = useState(false);
  const [name,         setName]           = useState("");
  const [email,        setEmail]          = useState("");
  const [password,     setPassword]       = useState("");
  const [confirm,      setConfirm]        = useState("");
  const [error,        setError]          = useState("");

  // ── Password strength ───────────────────────────────────────────────────────
  const strength = (() => {
    if (password.length === 0) return 0;
    let s = 0;
    if (password.length >= 8)              s++;
    if (/[A-Z]/.test(password))           s++;
    if (/[0-9]/.test(password))           s++;
    if (/[^A-Za-z0-9]/.test(password))    s++;
    return s;
  })();

  const strengthLabel = ["", "Lemah", "Cukup", "Kuat", "Sangat Kuat"][strength];
  const strengthColor = ["", "bg-destructive", "bg-warning", "bg-primary", "bg-success"][strength];

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Nama lengkap wajib diisi.");
      return;
    }
    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setLoading(true);
    try {
      await registerUser({ name: name.trim(), email, password, role: "employee" });
      startNavigation();
      router.push("/beranda");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("email-already-in-use")) {
        setError("Email sudah terdaftar. Silakan login.");
      } else if (msg.includes("invalid-email")) {
        setError("Format email tidak valid.");
      } else if (msg.includes("weak-password")) {
        setError("Password terlalu lemah. Gunakan minimal 8 karakter.");
      } else {
        setError("Terjadi kesalahan. Silakan coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">

      {/* ── Left panel — branding ────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:flex-1 bg-sidebar-bg flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 -left-20 w-96 h-96 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-20 -right-20 w-96 h-96 rounded-full bg-emerald-400 blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl">AbsensiPro</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Bergabung &<br />
              <span className="text-emerald-400">Mulai Absensi</span>
            </h2>
            <p className="mt-4 text-gray-400 text-lg max-w-sm">
              Daftar akun karyawan untuk mulai mencatat kehadiran harian kamu secara digital.
            </p>
          </div>

          <div className="space-y-3">
            {[
              "Absen masuk & pulang dari mana saja",
              "Lihat riwayat kehadiran kapan saja",
              "Rekap bulanan otomatis",
            ].map((text) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                </div>
                <p className="text-gray-300 text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-gray-500 text-sm">
          © 2026 AbsensiPro. All rights reserved.
        </div>
      </div>

      {/* ── Right panel — register form ───────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 bg-background min-h-screen lg:min-h-0">
        <div className="w-full max-w-md space-y-6">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-foreground font-bold text-xl">AbsensiPro</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground">Buat akun karyawan</h1>
            <p className="text-muted-foreground mt-1.5">
              Sudah punya akun?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Masuk di sini
              </Link>
            </p>
          </div>

          <Card className="shadow-none border-card-border">
            <CardContent className="p-6">
              <form onSubmit={handleRegister} className="space-y-4">

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Lengkap</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ahmad Fauzi"
                      className="pl-9"
                      required
                      autoComplete="name"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@perusahaan.com"
                      className="pl-9"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 karakter"
                      className="pl-9 pr-10"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Strength bar */}
                  {password.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                              i <= strength ? strengthColor : "bg-secondary"
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs font-medium ${
                        strength === 1 ? "text-destructive" :
                        strength === 2 ? "text-warning" :
                        strength === 3 ? "text-primary" : "text-success"
                      }`}>
                        {strengthLabel}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div className="space-y-2">
                  <Label htmlFor="confirm">Konfirmasi Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="confirm"
                      type={showConfirm ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Ulangi password"
                      className={`pl-9 pr-10 ${
                        confirm.length > 0 && confirm !== password
                          ? "border-destructive focus-visible:ring-destructive"
                          : confirm.length > 0 && confirm === password
                          ? "border-success focus-visible:ring-success"
                          : ""
                      }`}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirm.length > 0 && confirm !== password && (
                    <p className="text-xs text-destructive">Password tidak cocok</p>
                  )}
                  {confirm.length > 0 && confirm === password && (
                    <p className="text-xs text-success flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Password cocok
                    </p>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
                    {error}
                  </p>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Mendaftarkan...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Daftar Sekarang
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-xs text-center text-muted-foreground">
            Dengan mendaftar, akun kamu otomatis terdaftar sebagai <span className="font-medium text-foreground">Karyawan</span>.
            Hubungi admin jika kamu perlu akses lebih.
          </p>
        </div>
      </div>
    </div>
  );
}
