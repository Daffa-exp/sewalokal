import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { tenantSchema } from "@/lib/validations/tenant";
import { getTenantsByOwner, createTenant } from "@/server/dal/tenants";
import { handleApiError } from "@/server/api-error";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;

    const tenants = await getTenantsByOwner(user.userId, { search });
    return NextResponse.json({ success: true, data: tenants });
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
    const validatedData = tenantSchema.parse(body);

    const tenant = await createTenant(validatedData, user.userId);
    return NextResponse.json({ success: true, data: tenant }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
