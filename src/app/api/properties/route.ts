import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { propertySchema } from "@/lib/validations/property";
import { getPropertiesByOwner, createProperty } from "@/server/dal/properties";
import { handleApiError } from "@/server/api-error";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("archived") === "true";

    const properties = await getPropertiesByOwner(user.userId, includeArchived);
    return NextResponse.json({ success: true, data: properties });
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
    const validatedData = propertySchema.parse(body);

    const property = await createProperty(validatedData, user.userId);
    return NextResponse.json({ success: true, data: property }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
