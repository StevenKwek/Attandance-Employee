/**
 * POST /api/auth/logout
 * Revokes all refresh tokens for the calling user, invalidating all active sessions.
 * Requires: Authorization: Bearer <idToken>
 */

import { adminAuth } from "@/lib/firebase/admin";
import {
  verifyAuth,
  handleAuthError,
} from "@/lib/middleware/auth.middleware";
import type { ApiResponse } from "@/lib/types";

export async function POST(request: Request): Promise<Response> {
  try {
    const ctx = await verifyAuth(request);

    // Revoke all refresh tokens — forces re-authentication on every device
    await adminAuth.revokeRefreshTokens(ctx.uid);

    const response: ApiResponse = {
      success: true,
      data: { message: "Logged out successfully. All sessions revoked." },
    };
    return Response.json(response);
  } catch (error) {
    return handleAuthError(error);
  }
}
