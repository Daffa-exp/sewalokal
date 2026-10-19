import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { cancelPaymentSchema } from "@/lib/validations/invoice";
import { cancelPayment } from "@/server/dal/invoices";
import { handleApiError } from "@/server/api-error";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: paymentId } = await context.params;
    const body = await request.json();
    const validatedData = cancelPaymentSchema.parse({ ...body, paymentId });

    const result = await cancelPayment(paymentId, validatedData.reason, user.userId);
    return NextResponse.json({
      success: true,
      data: result,
      message: "Pembayaran berhasil dibatalkan dan saldo tagihan telah diperbarui",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
