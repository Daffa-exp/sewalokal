import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { tenantSchema } from "@/lib/validations/tenant";
import { getTenantById, updateTenant, deleteTenant } from "@/server/dal/tenants";
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
    const tenant = await getTenantById(id, user.userId);
    return NextResponse.json({ success: true, data: tenant });
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
    const validatedData = tenantSchema.partial().parse(body);

    const tenant = await updateTenant(id, validatedData, user.userId);
    return NextResponse.json({ success: true, data: tenant });
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
    await deleteTenant(id, user.userId);
    return NextResponse.json({ success: true, message: "Data penghuni berhasil dihapus" });
  } catch (error) {
    return handleApiError(error);
  }
}
