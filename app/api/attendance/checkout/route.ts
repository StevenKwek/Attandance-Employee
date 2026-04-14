/**
 * PATCH /api/attendance/checkout
 * Records the check-out time for the calling user (today's record).
 * Requires: Authorization: Bearer <idToken>
 */

import { checkOut, serializeAttendance } from "@/lib/services/attendance.service";
import {
  verifyAuth,
  handleAuthError,
} from "@/lib/middleware/auth.middleware";
import type { ApiResponse, SerializedAttendance } from "@/lib/types";

export async function PATCH(request: Request): Promise<Response> {
  try {
    const ctx = await verifyAuth(request);

    const record = await checkOut(ctx.uid);

    const response: ApiResponse<SerializedAttendance> = {
      success: true,
      data: serializeAttendance(record),
    };
    return Response.json(response);
  } catch (error) {
    return handleAuthError(error);
  }
}
