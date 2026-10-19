import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { propertySchema } from "@/lib/validations/property";
import { getPropertyById, updateProperty, archiveProperty, deleteProperty } from "@/server/dal/properties";
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
    const property = await getPropertyById(id, user.userId);
    return NextResponse.json({ success: true, data: property });
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
    const validatedData = propertySchema.partial().parse(body);

    const property = await updateProperty(id, validatedData, user.userId);
    return NextResponse.json({ success: true, data: property });
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
      await deleteProperty(id, user.userId);
      return NextResponse.json({ success: true, message: "Properti berhasil dihapus permanen" });
    }

    // Default to soft archive to safeguard financial/occupancy integrity
    const archived = await archiveProperty(id, user.userId);
    return NextResponse.json({ success: true, data: archived, message: "Properti berhasil diarsipkan" });
  } catch (error) {
    return handleApiError(error);
  }
}
