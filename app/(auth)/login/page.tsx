"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Building2, ArrowRight, Lock, Mail } from "lucide-react";
import { startNavigation } from "@/components/ui/navigation-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { loginUser } from "@/lib/services/auth.service";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginUser({ email, password });

      // Fetch role to redirect to the right dashboard
      const uid = auth.currentUser?.uid;
      let role = "employee";
      if (uid) {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) role = snap.data().role ?? "employee";
      }

      startNavigation();
      router.push(role === "admin" ? "/dashboard" : "/beranda");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login gagal";
      // Map common Firebase error codes to user-friendly messages
      if (msg.includes("invalid-credential") || msg.includes("wrong-password") || msg.includes("user-not-found")) {
        setError("Email atau password salah.");
      } else if (msg.includes("too-many-requests")) {
        setError("Terlalu banyak percobaan. Coba lagi nanti.");
      } else if (msg.includes("user-disabled")) {
        setError("Akun Anda telah dinonaktifkan.");
      } else {
        setError("Terjadi kesalahan. Silakan coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:flex-1 bg-sidebar-bg flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 -left-20 w-96 h-96 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-20 -right-20 w-96 h-96 rounded-full bg-blue-400 blur-3xl" />
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
              Kelola Absensi<br />
              <span className="text-primary">Lebih Mudah</span>
            </h2>
            <p className="mt-4 text-gray-400 text-lg max-w-sm">
              Platform manajemen kehadiran dan produktivitas karyawan yang modern, cepat, dan akurat.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Karyawan", value: "1.2K+" },
              { label: "Akurasi", value: "99.9%" },
              { label: "Perusahaan", value: "50+" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10"
              >
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-gray-500 text-sm">
          © 2026 AbsensiPro. All rights reserved.
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 bg-background min-h-screen lg:min-h-0">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary">
              <Building2 className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-foreground font-bold text-xl">AbsensiPro</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground">Selamat datang kembali</h1>
            <p className="text-muted-foreground mt-1.5">
              Masuk ke dashboard AbsensiPro Anda
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Belum punya akun?{" "}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Daftar sebagai karyawan
              </Link>
            </p>
          </div>

          <Card className="shadow-none border-card-border">
            <CardContent className="p-6">
              <form onSubmit={handleLogin} className="space-y-4">
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

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9 pr-10"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Masuk...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Masuk ke Dashboard
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
