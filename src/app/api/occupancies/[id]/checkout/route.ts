import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { terminateOccupancy } from "@/server/dal/occupancies";
import { handleApiError } from "@/server/api-error";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const occupancy = await terminateOccupancy(id, user.userId);

    return NextResponse.json({
      success: true,
      data: occupancy,
      message: "Check-out berhasil. Kamar kini berstatus kosong.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
