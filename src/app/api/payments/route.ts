import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { recordPaymentSchema } from "@/lib/validations/invoice";
import { recordPayment } from "@/server/dal/invoices";
import { handleApiError } from "@/server/api-error";
import { db } from "@/server/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;

    const payments = await db.payment.findMany({
      where: {
        invoice: {
          occupancy: {
            room: {
              property: {
                ownerId: user.userId,
              },
            },
          },
        },
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            periodMonth: true,
            periodYear: true,
            occupancy: {
              select: {
                tenant: { select: { id: true, name: true } },
                room: {
                  select: {
                    roomNumber: true,
                    property: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { paidAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ success: true, data: payments });
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
    const validatedData = recordPaymentSchema.parse(body);

    const result = await recordPayment(validatedData, user.userId, user.userId);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
