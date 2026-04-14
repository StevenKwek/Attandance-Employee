/**
 * POST /api/auth/register
 * Creates a new Firebase Auth user and Firestore profile.
 * Body: { name, email, password, role? }
 */

import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { verifyAuth, requireAdmin, handleAuthError } from "@/lib/middleware/auth.middleware";
import type { RegisterPayload, ApiResponse, UserDocument, UserRole } from "@/lib/types";

export async function POST(request: Request): Promise<Response> {
  try {
    // Only admins can create users via this endpoint
    const ctx = await verifyAuth(request);
    requireAdmin(ctx);

    const body: RegisterPayload = await request.json();
    const { name, email, password, role = "employee", department, phone, joinDate, status = "aktif" } = body;

    if (!name || !email || !password) {
      return Response.json(
        { success: false, error: "name, email, and password are required" },
        { status: 400 }
      );
    }

    // Create Firebase Auth user
    const userRecord = await adminAuth.createUser({ email, password, displayName: name });

    // Save Firestore profile (only persist defined optional fields)
    const profile: Record<string, unknown> = {
      name,
      email,
      role: role as UserRole,
      status,
      createdAt: FieldValue.serverTimestamp(),
    };
    if (department) profile.department = department;
    if (phone) profile.phone = phone;
    if (joinDate) profile.joinDate = joinDate;

    await adminDb.collection("users").doc(userRecord.uid).set(profile);

    const data: Omit<UserDocument, "createdAt"> = {
      id: userRecord.uid,
      name,
      email,
      role: role as UserRole,
    };

    const response: ApiResponse<typeof data> = { success: true, data };
    return Response.json(response, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
