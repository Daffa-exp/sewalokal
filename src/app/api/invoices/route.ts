import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { invoiceSchema } from "@/lib/validations/invoice";
import { getInvoicesByOwner, createInvoice } from "@/server/dal/invoices";
import { handleApiError } from "@/server/api-error";
import { InvoiceStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId") || undefined;
    const statusParam = searchParams.get("status");
    const status = statusParam && ["UNPAID", "PARTIAL", "PAID", "OVERDUE"].includes(statusParam)
      ? (statusParam as InvoiceStatus)
      : undefined;
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;
    const search = searchParams.get("search") || undefined;

    const invoices = await getInvoicesByOwner(user.userId, {
      propertyId,
      status,
      periodMonth: month,
      periodYear: year,
      search,
    });

    return NextResponse.json({ success: true, data: invoices });
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
    const validatedData = invoiceSchema.parse(body);

    const invoice = await createInvoice(validatedData, user.userId);
    return NextResponse.json({ success: true, data: invoice }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
