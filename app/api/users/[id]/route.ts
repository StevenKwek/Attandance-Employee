/**
 * GET    /api/users/[id]  — get user by ID (self or admin)
 * PATCH  /api/users/[id]  — update user    (self or admin)
 * DELETE /api/users/[id]  — delete user    (admin only)
 */

import { getUserById, updateUser, deleteUser } from "@/lib/services/users.service";
import {
  verifyAuth,
  requireAdmin,
  requireSelfOrAdmin,
  handleAuthError,
} from "@/lib/middleware/auth.middleware";
import type { ApiResponse, UserDocument, UpdateUserPayload } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: Request,
  { params }: RouteContext
): Promise<Response> {
  try {
    const ctx = await verifyAuth(request);
    const { id } = await params;

    requireSelfOrAdmin(ctx, id);

    const user = await getUserById(id);
    if (!user) {
      return Response.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const response: ApiResponse<UserDocument> = { success: true, data: user };
    return Response.json(response);
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
): Promise<Response> {
  try {
    const ctx = await verifyAuth(request);
    const { id } = await params;

    requireSelfOrAdmin(ctx, id);

    // Employees cannot escalate their own role to admin
    const body: UpdateUserPayload = await request.json();
    if (body.role === "admin" && ctx.role !== "admin") {
      return Response.json(
        { success: false, error: "Only admins can assign the admin role" },
        { status: 403 }
      );
    }

    const updated = await updateUser(id, body);

    const response: ApiResponse<UserDocument> = { success: true, data: updated };
    return Response.json(response);
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext
): Promise<Response> {
  try {
    const ctx = await verifyAuth(request);
    const { id } = await params;

    requireAdmin(ctx);

    await deleteUser(id);

    const response: ApiResponse = {
      success: true,
      data: { message: `User ${id} deleted successfully` },
    };
    return Response.json(response);
  } catch (error) {
    return handleAuthError(error);
  }
}
