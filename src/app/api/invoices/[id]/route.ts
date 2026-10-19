import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getInvoiceById } from "@/server/dal/invoices";
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
    const invoice = await getInvoiceById(id, user.userId);
    return NextResponse.json({ success: true, data: invoice });
  } catch (error) {
    return handleApiError(error);
  }
}
