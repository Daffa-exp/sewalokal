import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getMonthlyReportData } from "@/server/dal/invoices";
import { handleApiError } from "@/server/api-error";
import { formatDateIndonesia } from "@/lib/formatters";

/**
 * Sanitizes a CSV cell to avoid CSV injection and escapes quotes.
 */
function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }

  let str = String(value).trim();

  // Guard against CSV formula injection
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape double quotes by doubling them
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId") || undefined;
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;

    const report = await getMonthlyReportData(user.userId, {
      propertyId: propertyId === "ALL" ? undefined : propertyId,
      periodMonth: month,
      periodYear: year,
    });

    const headers = [
      "No. Tagihan",
      "Properti",
      "Nomor Kamar",
      "Nama Penghuni",
      "Nomor WhatsApp",
      "Periode Bulan",
      "Tahun",
      "Jatuh Tempo",
      "Total Tagihan (Rp)",
      "Total Terbayar (Rp)",
      "Sisa Tagihan (Rp)",
      "Status",
      "Pengingat Terakhir",
    ];

    const rows = report.items.map((item) => [
      sanitizeCsvCell(item.invoiceNumber),
      sanitizeCsvCell(item.propertyName),
      sanitizeCsvCell(item.roomNumber),
      sanitizeCsvCell(item.tenantName),
      sanitizeCsvCell(item.tenantPhone || "-"),
      sanitizeCsvCell(item.periodMonth),
      sanitizeCsvCell(item.periodYear),
      sanitizeCsvCell(formatDateIndonesia(item.dueDate)),
      sanitizeCsvCell(item.amount),
      sanitizeCsvCell(item.totalPaid),
      sanitizeCsvCell(item.remainingBalance),
      sanitizeCsvCell(
        item.status === "PAID"
          ? "Lunas"
          : item.status === "PARTIAL"
            ? "Sebagian"
            : item.status === "OVERDUE"
              ? "Jatuh Tempo"
              : "Belum Lunas"
      ),
      sanitizeCsvCell(item.reminderSentAt ? formatDateIndonesia(item.reminderSentAt) : "Belum pernah"),
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    const filename = `rekap-keuangan-sewalokal-${year || "semua"}-${month ? String(month).padStart(2, "0") : "semua"}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
