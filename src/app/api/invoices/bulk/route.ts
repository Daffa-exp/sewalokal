import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { bulkInvoiceSchema } from "@/lib/validations/invoice";
import { createBulkInvoices } from "@/server/dal/invoices";
import { handleApiError } from "@/server/api-error";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = bulkInvoiceSchema.parse(body);

    const result = await createBulkInvoices(validatedData, user.userId);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
