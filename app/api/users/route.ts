/**
 * GET  /api/users  — list all users (admin only)
 */

import { getAllUsers } from "@/lib/services/users.service";
import {
  verifyAuth,
  requireAdmin,
  handleAuthError,
} from "@/lib/middleware/auth.middleware";
import type { ApiResponse, UserDocument } from "@/lib/types";

export async function GET(request: Request): Promise<Response> {
  try {
    const ctx = await verifyAuth(request);
    requireAdmin(ctx);

    const users = await getAllUsers();

    const response: ApiResponse<UserDocument[]> = { success: true, data: users };
    return Response.json(response);
  } catch (error) {
    return handleAuthError(error);
  }
}
