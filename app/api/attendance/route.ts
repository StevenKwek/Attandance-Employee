/**
 * GET  /api/attendance?userId=<uid>   — records by user
 * GET  /api/attendance?date=YYYY-MM-DD — records by date  (admin only)
 * POST /api/attendance                 — check-in (self only)
 */

import {
  checkIn,
  getAttendanceByUser,
  getAttendanceByDate,
  serializeAttendance,
} from "@/lib/services/attendance.service";
import {
  verifyAuth,
  requireAdmin,
  requireSelfOrAdmin,
  handleAuthError,
} from "@/lib/middleware/auth.middleware";
import type { ApiResponse, SerializedAttendance } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const ctx = await verifyAuth(request);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const date = searchParams.get("date");

    if (userId) {
      requireSelfOrAdmin(ctx, userId);
      const records = await getAttendanceByUser(userId);
      const response: ApiResponse<SerializedAttendance[]> = {
        success: true,
        data: records.map(serializeAttendance),
      };
      return Response.json(response);
    }

    if (date) {
      requireAdmin(ctx);
      const records = await getAttendanceByDate(date);
      const response: ApiResponse<SerializedAttendance[]> = {
        success: true,
        data: records.map(serializeAttendance),
      };
      return Response.json(response);
    }

    return Response.json(
      { success: false, error: "Provide ?userId=<uid> or ?date=YYYY-MM-DD" },
      { status: 400 }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const ctx = await verifyAuth(request);

    // Allow check-in only for own account
    const record = await checkIn(ctx.uid);

    const response: ApiResponse<SerializedAttendance> = {
      success: true,
      data: serializeAttendance(record),
    };
    return Response.json(response, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
