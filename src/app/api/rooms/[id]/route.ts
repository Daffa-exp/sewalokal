import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { roomSchema } from "@/lib/validations/property";
import { getRoomById, updateRoom, archiveRoom, deleteRoom } from "@/server/dal/rooms";
import { handleApiError } from "@/server/api-error";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const room = await getRoomById(id, user.userId);
    return NextResponse.json({ success: true, data: room });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const validatedData = roomSchema.partial().parse(body);

    const room = await updateRoom(id, validatedData, user.userId);
    return NextResponse.json({ success: true, data: room });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";

    if (permanent) {
      await deleteRoom(id, user.userId);
      return NextResponse.json({ success: true, message: "Kamar berhasil dihapus permanen" });
    }

    // Default to soft archive to safeguard financial/occupancy integrity
    const archived = await archiveRoom(id, user.userId);
    return NextResponse.json({ success: true, data: archived, message: "Kamar berhasil diarsipkan" });
  } catch (error) {
    return handleApiError(error);
  }
}
