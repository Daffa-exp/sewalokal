import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { markReminderSent } from "@/server/dal/invoices";
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

    const { id } = await context.params;
    const updated = await markReminderSent(id, user.userId);

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        reminderSentAt: updated.reminderSentAt,
      },
      message: "Histori pengingat WhatsApp berhasil dicatat",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
