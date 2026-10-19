import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { roomSchema } from "@/lib/validations/property";
import { getRoomsByOwner, createRoom } from "@/server/dal/rooms";
import { handleApiError } from "@/server/api-error";
import { RoomStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId") || undefined;
    const statusParam = searchParams.get("status");
    const status = statusParam && ["VACANT", "OCCUPIED", "MAINTENANCE"].includes(statusParam)
      ? (statusParam as RoomStatus)
      : undefined;
    const search = searchParams.get("search") || undefined;
    const includeArchived = searchParams.get("archived") === "true";

    const rooms = await getRoomsByOwner(user.userId, {
      propertyId,
      status,
      search,
      includeArchived,
    });

    return NextResponse.json({ success: true, data: rooms });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = roomSchema.parse(body);

    const { propertyId, ...roomData } = validatedData;
    const room = await createRoom(propertyId, roomData, user.userId);

    return NextResponse.json({ success: true, data: room }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
