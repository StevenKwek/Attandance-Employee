/**
 * Users Service — server-side Firestore operations for the "users" collection.
 * All functions use the Firebase Admin SDK and run in Route Handlers only.
 */

import {
  FieldValue,
  type DocumentSnapshot,
  type QuerySnapshot,
} from "firebase-admin/firestore";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import type { UserDocument, UpdateUserPayload, UserRole } from "@/lib/types";

const COLLECTION = "users";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function snapshotToUser(snap: DocumentSnapshot): UserDocument {
  const data = snap.data()!;
  return {
    id: snap.id,
    name: data.name,
    email: data.email,
    role: data.role as UserRole,
    department: data.department,
    phone: data.phone,
    joinDate: data.joinDate,
    status: data.status ?? "aktif",
    createdAt: data.createdAt,
  };
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getAllUsers(): Promise<UserDocument[]> {
  const snapshot: QuerySnapshot = await adminDb
    .collection(COLLECTION)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map(snapshotToUser);
}

export async function getUserById(id: string): Promise<UserDocument | null> {
  const snap: DocumentSnapshot = await adminDb
    .collection(COLLECTION)
    .doc(id)
    .get();

  if (!snap.exists) return null;
  return snapshotToUser(snap);
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateUser(
  id: string,
  payload: UpdateUserPayload
): Promise<UserDocument> {
  const ref = adminDb.collection(COLLECTION).doc(id);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new Error(`User ${id} not found`);
  }

  const updates: Record<string, unknown> = {};

  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.role !== undefined) updates.role = payload.role;
  if ("department" in payload) updates.department = (payload as { department?: string }).department;
  if ("phone" in payload) updates.phone = (payload as { phone?: string }).phone;
  if ("joinDate" in payload) updates.joinDate = (payload as { joinDate?: string }).joinDate;
  if ("status" in payload) updates.status = (payload as { status?: string }).status;

  // Sync email in Firebase Auth as well
  if (payload.email !== undefined) {
    await adminAuth.updateUser(id, { email: payload.email });
    updates.email = payload.email;
  }

  await ref.update({ ...updates, updatedAt: FieldValue.serverTimestamp() });

  const updated = await ref.get();
  return snapshotToUser(updated);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Deletes the user from both Firestore and Firebase Auth.
 * Admin-only — enforce role check in the route handler.
 */
export async function deleteUser(id: string): Promise<void> {
  const ref = adminDb.collection(COLLECTION).doc(id);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new Error(`User ${id} not found`);
  }

  // Delete in parallel for efficiency
  await Promise.all([
    ref.delete(),
    adminAuth.deleteUser(id),
  ]);
}
