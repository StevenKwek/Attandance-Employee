/**
 * UI type definitions — used by client components for display/badge logic.
 * These are intentionally separate from the backend Firestore types in lib/types/
 * because the UI uses Indonesian labels and additional display fields.
 *
 * NOTE: All dummy data arrays have been removed. Data is now fetched from Firebase
 * via the API routes in app/api/.
 */

export type AttendanceStatus = "hadir" | "terlambat" | "tidak_hadir" | "izin";
export type EmployeeRole = "Admin" | "Karyawan" | "Manajer" | "HR";
export type Department =
  | "Engineering"
  | "Marketing"
  | "Finance"
  | "HR"
  | "Operations";

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
  department: Department;
  phone: string;
  joinDate: string;
  avatar?: string;
  status: "aktif" | "nonaktif";
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: Department;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  workHours: number | null;
}

export interface MonthlyStats {
  month: string;
  hadir: number;
  terlambat: number;
  tidak_hadir: number;
  izin: number;
}

// ─── Status mapping helpers ───────────────────────────────────────────────────

/** Maps API status values (English) to UI status values (Indonesian). */
export function toUiStatus(apiStatus: string): AttendanceStatus {
  if (apiStatus === "present") return "hadir";
  if (apiStatus === "late") return "terlambat";
  return "tidak_hadir";
}

/** Maps UI status values to badge variant strings. */
export function statusLabel(uiStatus: AttendanceStatus): string {
  const map: Record<AttendanceStatus, string> = {
    hadir: "Hadir",
    terlambat: "Terlambat",
    tidak_hadir: "Tidak Hadir",
    izin: "Izin",
  };
  return map[uiStatus];
}
