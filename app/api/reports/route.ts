/**
 * GET /api/reports?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD[&userId=<uid>]
 *
 * Returns attendance records + summary (present / late / absent) for the range.
 * - Admin: can query any user or all users
 * - Employee: can only query their own records (userId must match own uid)
 *
 * Requires: Authorization: Bearer <idToken>
 */

import { getAttendanceSummary } from "@/lib/services/reports.service";
import { serializeAttendance } from "@/lib/services/attendance.service";
import {
  verifyAuth,
  requireAdmin,
  requireSelfOrAdmin,
  handleAuthError,
} from "@/lib/middleware/auth.middleware";
import type { ApiResponse, AttendanceSummary, SerializedAttendance } from "@/lib/types";

interface SerializedReportResult {
  records: SerializedAttendance[];
  summary: AttendanceSummary;
}

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const ctx = await verifyAuth(request);
    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userId = searchParams.get("userId") ?? undefined;

    if (!startDate || !endDate) {
      return Response.json(
        {
          success: false,
          error: "startDate and endDate query params are required (YYYY-MM-DD)",
        },
        { status: 400 }
      );
    }

    if (startDate > endDate) {
      return Response.json(
        { success: false, error: "startDate must be before or equal to endDate" },
        { status: 400 }
      );
    }

    // Access control
    if (userId) {
      requireSelfOrAdmin(ctx, userId);
    } else {
      // No userId filter → full org report → admin only
      requireAdmin(ctx);
    }

    const result = await getAttendanceSummary(startDate, endDate, userId);

    const serialized: SerializedReportResult = {
      records: result.records.map(serializeAttendance),
      summary: result.summary,
    };

    const response: ApiResponse<SerializedReportResult> = { success: true, data: serialized };
    return Response.json(response);
  } catch (error) {
    return handleAuthError(error);
  }
}
