"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Users,
  Filter,
  MoreHorizontal,
  Mail,
  Phone,
  Building2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import { getInitials } from "@/lib/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserDocument } from "@/lib/types";

const departmentColors: Record<string, string> = {
  Engineering: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Marketing: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Finance: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  HR: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  Operations: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

interface EmployeeForm {
  name: string;
  email: string;
  password: string;
  role: "admin" | "employee";
  department: string;
  phone: string;
  joinDate: string;
  status: "aktif" | "nonaktif";
}

const emptyForm: EmployeeForm = {
  name: "",
  email: "",
  password: "",
  role: "employee",
  department: "Engineering",
  phone: "",
  joinDate: "",
  status: "aktif",
};

export default function KaryawanPage() {
  const [employees, setEmployees] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<UserDocument | null>(null);
  const [formData, setFormData] = useState<EmployeeForm>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [apiError, setApiError] = useState("");

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<UserDocument[]>("/api/users");
      setEmployees(data);
    } catch {
      // Not admin or network error — show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  const filtered = employees.filter((e) => {
    const matchSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === "all" || e.department === filterDept;
    const matchStatus = filterStatus === "all" || (e.status ?? "aktif") === filterStatus;
    return matchSearch && matchDept && matchStatus;
  });

  const openAddModal = () => {
    setEditingEmployee(null);
    setFormData(emptyForm);
    setApiError("");
    setIsModalOpen(true);
  };

  const openEditModal = (emp: UserDocument) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      email: emp.email,
      password: "",
      role: emp.role,
      department: emp.department ?? "Engineering",
      phone: emp.phone ?? "",
      joinDate: emp.joinDate ?? "",
      status: emp.status ?? "aktif",
    });
    setApiError("");
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) return;
    if (!editingEmployee && !formData.password) {
      setApiError("Password wajib diisi untuk karyawan baru.");
      return;
    }
    setSaving(true);
    setApiError("");
    try {
      if (editingEmployee) {
        const payload: Record<string, unknown> = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          department: formData.department,
          phone: formData.phone,
          joinDate: formData.joinDate,
          status: formData.status,
        };
        await apiFetch(`/api/users/${editingEmployee.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            role: formData.role,
            department: formData.department,
            phone: formData.phone,
            joinDate: formData.joinDate,
            status: formData.status,
          }),
        });
      }
      await loadEmployees();
      setIsModalOpen(false);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await apiFetch(`/api/users/${id}`, { method: "DELETE" });
      await loadEmployees();
      setDeleteConfirm(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menghapus karyawan.");
    } finally {
      setDeleting(false);
    }
  };

  const activeCount = employees.filter((e) => (e.status ?? "aktif") === "aktif").length;
  const inactiveCount = employees.filter((e) => e.status === "nonaktif").length;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Manajemen Karyawan</h1>
          <p className="text-muted-foreground mt-0.5">Kelola data seluruh karyawan perusahaan</p>
        </div>
        <Button onClick={openAddModal} className="gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          Tambah Karyawan
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Total Karyawan", value: employees.length, color: "text-foreground" },
          { label: "Aktif", value: activeCount, color: "text-success" },
          { label: "Nonaktif", value: inactiveCount, color: "text-muted-foreground" },
        ].map((s) => (
          <Card key={s.label} className="text-center py-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Filter + Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Cari nama, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-44">
                <Building2 className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Departemen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Dept.</SelectItem>
                {["Engineering", "Marketing", "Finance", "HR", "Operations"].map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36">
                <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="aktif">Aktif</SelectItem>
                <SelectItem value="nonaktif">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Karyawan", "Departemen", "Role", "Kontak", "Bergabung", "Status", ""].map((h) => (
                      <th key={h} className="text-left py-3 px-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td className="py-3.5 px-2">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                          <div className="space-y-1.5">
                            <Skeleton className="h-3.5 w-28" />
                            <Skeleton className="h-3 w-36" />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-2"><Skeleton className="h-5 w-20 rounded-full" /></td>
                      <td className="py-3.5 px-2"><Skeleton className="h-3.5 w-16" /></td>
                      <td className="py-3.5 px-2"><Skeleton className="h-3.5 w-28" /></td>
                      <td className="py-3.5 px-2"><Skeleton className="h-3.5 w-20" /></td>
                      <td className="py-3.5 px-2"><Skeleton className="h-5 w-14 rounded-full" /></td>
                      <td className="py-3.5 px-2"><Skeleton className="h-7 w-7 rounded-lg" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">Tidak ada karyawan</p>
              <p className="text-sm text-muted-foreground mt-1">Coba ubah filter atau tambah karyawan baru</p>
              <Button onClick={openAddModal} className="mt-4 gap-2" size="sm">
                <Plus className="w-4 h-4" />
                Tambah Karyawan
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Karyawan", "Departemen", "Role", "Kontak", "Bergabung", "Status", ""].map((h) => (
                      <th key={h} className="text-left py-3 px-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((emp) => (
                    <tr key={emp.id} className="hover:bg-secondary/50 transition-colors group">
                      <td className="py-3.5 px-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9">
                            <AvatarFallback className="text-xs font-semibold">{getInitials(emp.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground leading-none">{emp.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-2">
                        {emp.department ? (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${departmentColors[emp.department] ?? "bg-secondary text-foreground"}`}>
                            {emp.department}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3.5 px-2 text-muted-foreground capitalize">{emp.role}</td>
                      <td className="py-3.5 px-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">{emp.email}</span>
                          </div>
                          {emp.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {emp.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-2 text-muted-foreground text-xs">
                        {emp.joinDate
                          ? new Date(emp.joinDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                          : "—"}
                      </td>
                      <td className="py-3.5 px-2">
                        <Badge variant={(emp.status ?? "aktif") as "aktif" | "nonaktif"}>
                          {emp.status === "nonaktif" ? "Nonaktif" : "Aktif"}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(emp)}>
                              <Pencil className="w-4 h-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteConfirm(emp.id)}>
                              <Trash2 className="w-4 h-4" />
                              Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)] sm:w-auto">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? "Edit Karyawan" : "Tambah Karyawan Baru"}</DialogTitle>
            <DialogDescription>
              {editingEmployee ? "Perbarui data karyawan di bawah ini" : "Isi data karyawan baru untuk ditambahkan ke sistem"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Nama Lengkap</Label>
                <Input placeholder="Ahmad Fauzi" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="ahmad@perusahaan.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              {!editingEmployee && (
                <div className="col-span-2 space-y-1.5">
                  <Label>Password</Label>
                  <Input type="password" placeholder="Min. 8 karakter" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as "admin" | "employee" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Karyawan</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Departemen</Label>
                <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Engineering", "Marketing", "Finance", "HR", "Operations"].map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>No. Telepon</Label>
                <Input placeholder="08xxxxxxxxxx" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal Bergabung</Label>
                <Input type="date" value={formData.joinDate} onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as "aktif" | "nonaktif" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aktif">Aktif</SelectItem>
                    <SelectItem value="nonaktif">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {apiError && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{apiError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving || !formData.name || !formData.email}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingEmployee ? "Simpan Perubahan" : "Tambah Karyawan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm w-[calc(100vw-2rem)] sm:w-auto">
          <DialogHeader>
            <DialogTitle>Hapus Karyawan</DialogTitle>
            <DialogDescription>Tindakan ini tidak dapat dibatalkan dan akan menghapus akun beserta data autentikasi karyawan.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" /> Hapus</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
