/**
 * Auth Middleware — verifies the Firebase ID token sent in the Authorization header.
 * Used inside Route Handlers to protect endpoints and resolve the caller's identity + role.
 *
 * Usage:
 *   const ctx = await verifyAuth(request);
 *   // ctx.uid, ctx.email, ctx.role
 */

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { AuthenticatedContext, UserRole } from "@/lib/types";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: number = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Extracts, verifies the ID token from `Authorization: Bearer <token>`,
 * then fetches the user's role from Firestore.
 * Throws `AuthError` on any failure.
 */
export async function verifyAuth(
  request: Request
): Promise<AuthenticatedContext> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Missing or malformed Authorization header");
  }

  const idToken = authHeader.slice(7);

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch {
    throw new AuthError("Invalid or expired ID token");
  }

  // Look up the user's role from Firestore
  const userSnap = await adminDb.collection("users").doc(decoded.uid).get();

  if (!userSnap.exists) {
    throw new AuthError("User profile not found", 404);
  }

  const role = userSnap.data()!.role as UserRole;

  return {
    uid: decoded.uid,
    email: decoded.email ?? "",
    role,
  };
}

/**
 * Asserts the caller has admin role. Throws `AuthError` (403) otherwise.
 */
export function requireAdmin(ctx: AuthenticatedContext): void {
  if (ctx.role !== "admin") {
    throw new AuthError("Admin access required", 403);
  }
}

/**
 * Asserts the caller is accessing their own resource OR is an admin.
 * Throws `AuthError` (403) otherwise.
 */
export function requireSelfOrAdmin(
  ctx: AuthenticatedContext,
  targetUserId: string
): void {
  if (ctx.role !== "admin" && ctx.uid !== targetUserId) {
    throw new AuthError("Access denied: not your resource", 403);
  }
}

/**
 * Wraps an AuthError (or generic error) into a structured JSON Response.
 */
export function handleAuthError(error: unknown): Response {
  if (error instanceof AuthError) {
    return Response.json(
      { success: false, error: error.message },
      { status: error.status }
    );
  }
  if (error instanceof Error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
  return Response.json(
    { success: false, error: "Internal server error" },
    { status: 500 }
  );
}
