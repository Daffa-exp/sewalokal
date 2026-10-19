import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  getOwnerFinancialSummary,
  getRecentPayments,
  getActionableInvoices,
} from "@/server/dal/invoices";
import { getPropertiesByOwner } from "@/server/dal/properties";
import { getRoomsByOwner } from "@/server/dal/rooms";
import { handleApiError } from "@/server/api-error";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;

    const [properties, rooms, financials, recentPayments, actionableInvoices] = await Promise.all([
      getPropertiesByOwner(user.userId, false),
      getRoomsByOwner(user.userId, { includeArchived: false }),
      getOwnerFinancialSummary(user.userId, { periodMonth: month, periodYear: year }),
      getRecentPayments(user.userId, 5),
      getActionableInvoices(user.userId, 5),
    ]);

    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter((r) => r.status === "OCCUPIED").length;
    const vacantRooms = rooms.filter((r) => r.status === "VACANT").length;
    const maintenanceRooms = rooms.filter((r) => r.status === "MAINTENANCE").length;
    const occupancyPercentage = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        propertiesCount: properties.length,
        properties: properties.map((p) => ({
          id: p.id,
          name: p.name,
          city: p.city,
        })),
        roomsStats: {
          total: totalRooms,
          occupied: occupiedRooms,
          vacant: vacantRooms,
          maintenance: maintenanceRooms,
          occupancyPercentage,
        },
        financials,
        recentPayments,
        actionableInvoices,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
