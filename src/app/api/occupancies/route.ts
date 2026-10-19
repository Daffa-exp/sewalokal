import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { occupancySchema } from "@/lib/validations/tenant";
import { createOccupancy } from "@/server/dal/occupancies";
import { handleApiError } from "@/server/api-error";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = occupancySchema.parse(body);

    const occupancy = await createOccupancy(validatedData, user.userId);
    return NextResponse.json({ success: true, data: occupancy }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
