// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as sessionModule from "@/lib/session";
import * as invoiceDal from "@/server/dal/invoices";
import * as propertyDal from "@/server/dal/properties";
import * as roomDal from "@/server/dal/rooms";
import { POST as postReminder } from "@/app/api/invoices/[id]/reminder/route";
import { GET as getReports } from "@/app/api/reports/route";
import { GET as getReportsExport } from "@/app/api/reports/export/route";
import { GET as getDashboardOverview } from "@/app/api/dashboard/overview/route";
import { AuthorizationError } from "@/server/dal/properties";

describe("Reports, Reminders & Dashboard Overview API Integration", () => {
  const mockOwnerA = {
    userId: "owner-usr-a",
    email: "owner-a@sewalokal.id",
    name: "Pak Budi",
    role: "OWNER" as const,
  };

  const mockReportItem = {
    id: "inv-01",
    invoiceNumber: "INV-202610-101-1234",
    propertyId: "prop-01",
    propertyName: "Kos Melati",
    roomNumber: "101",
    tenantName: "Andi Pratama",
    tenantPhone: "081234567890",
    periodMonth: 10,
    periodYear: 2026,
    dueDate: "2026-10-25T00:00:00.000Z",
    amount: 1500000,
    totalPaid: 500000,
    remainingBalance: 1000000,
    status: "PARTIAL" as const,
    reminderSentAt: null,
  };

  const mockFinancialSummary = {
    totalBilled: 1500000,
    totalPaid: 500000,
    remainingReceivable: 1000000,
    overdueAmount: 0,
    overdueCount: 0,
    unpaidCount: 1,
    paidCount: 0,
    collectionRate: 33.3,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(sessionModule, "getCurrentUser").mockResolvedValue(mockOwnerA);
  });

  describe("POST /api/invoices/[id]/reminder", () => {
    it("records reminderSentAt timestamp for valid invoice", async () => {
      const now = new Date();
      vi.spyOn(invoiceDal, "markReminderSent").mockResolvedValue({
        id: "inv-01",
        reminderSentAt: now,
      } as unknown as never);

      const request = new NextRequest("http://localhost:3000/api/invoices/inv-01/reminder", {
        method: "POST",
      });

      const response = await postReminder(request, {
        params: Promise.resolve({ id: "inv-01" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe("inv-01");
      expect(data.data.reminderSentAt).toBeDefined();
    });

    it("returns 403 Forbidden when unauthorized user tries to mark reminder", async () => {
      vi.spyOn(invoiceDal, "markReminderSent").mockRejectedValue(new AuthorizationError());

      const request = new NextRequest("http://localhost:3000/api/invoices/inv-01/reminder", {
        method: "POST",
      });

      const response = await postReminder(request, {
        params: Promise.resolve({ id: "inv-01" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });
  });

  describe("GET /api/reports", () => {
    it("returns monthly report data and financial summary", async () => {
      vi.spyOn(invoiceDal, "getMonthlyReportData").mockResolvedValue({
        summary: mockFinancialSummary,
        items: [mockReportItem],
      });

      const request = new NextRequest("http://localhost:3000/api/reports?month=10&year=2026");
      const response = await getReports(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.summary.totalBilled).toBe(1500000);
      expect(data.data.items).toHaveLength(1);
      expect(data.data.items[0].invoiceNumber).toBe("INV-202610-101-1234");
    });
  });

  describe("GET /api/reports/export", () => {
    it("returns downloadable CSV file with correct headers and sanitized cells", async () => {
      const injectionAttemptItem = {
        ...mockReportItem,
        tenantName: "=SUM(A1:A10)", // Potential CSV injection
      };

      vi.spyOn(invoiceDal, "getMonthlyReportData").mockResolvedValue({
        summary: mockFinancialSummary,
        items: [injectionAttemptItem],
      });

      const request = new NextRequest("http://localhost:3000/api/reports/export?month=10&year=2026");
      const response = await getReportsExport(request);
      const csvText = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("text/csv");
      expect(response.headers.get("Content-Disposition")).toContain('attachment; filename="rekap-keuangan-sewalokal-2026-10.csv"');

      // Check header row
      expect(csvText).toContain("No. Tagihan");
      expect(csvText).toContain("Total Tagihan (Rp)");

      // Check row content and formula injection sanitization (prefixed with single quote)
      expect(csvText).toContain("INV-202610-101-1234");
      expect(csvText).toContain("'=SUM(A1:A10)");
    });
  });

  describe("GET /api/dashboard/overview", () => {
    it("returns unified overview metrics including stats, financials, and recent payments", async () => {
      vi.spyOn(propertyDal, "getPropertiesByOwner").mockResolvedValue([
        { id: "prop-01", name: "Kos Melati", city: "Sleman" },
      ] as unknown as never);

      vi.spyOn(roomDal, "getRoomsByOwner").mockResolvedValue([
        { id: "room-01", status: "OCCUPIED" },
        { id: "room-02", status: "VACANT" },
      ] as unknown as never);

      vi.spyOn(invoiceDal, "getOwnerFinancialSummary").mockResolvedValue(mockFinancialSummary);

      vi.spyOn(invoiceDal, "getRecentPayments").mockResolvedValue([
        {
          id: "pay-01",
          amount: 500000,
          paidAt: new Date("2026-10-10"),
          paymentMethod: "BANK_TRANSFER",
          invoice: {
            id: "inv-01",
            invoiceNumber: "INV-202610-101-1234",
            occupancy: {
              tenant: { id: "t-01", name: "Andi" },
              room: {
                roomNumber: "101",
                property: { name: "Kos Melati" },
              },
            },
          },
        },
      ] as unknown as never);

      vi.spyOn(invoiceDal, "getActionableInvoices").mockResolvedValue([
        {
          ...mockReportItem,
          dueDate: new Date("2026-10-25"),
          occupancy: {
            tenant: { id: "t-01", name: "Andi", phone: "081234567890" },
            room: {
              roomNumber: "101",
              property: { id: "prop-01", name: "Kos Melati" },
            },
          },
        },
      ] as unknown as never);

      const request = new NextRequest("http://localhost:3000/api/dashboard/overview?month=10&year=2026");
      const response = await getDashboardOverview(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.propertiesCount).toBe(1);
      expect(data.data.roomsStats.total).toBe(2);
      expect(data.data.roomsStats.occupied).toBe(1);
      expect(data.data.roomsStats.occupancyPercentage).toBe(50);
      expect(data.data.financials.totalBilled).toBe(1500000);
      expect(data.data.recentPayments).toHaveLength(1);
      expect(data.data.actionableInvoices).toHaveLength(1);
    });
  });
});
