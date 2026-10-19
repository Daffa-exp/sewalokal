// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as sessionModule from "@/lib/session";
import * as invoiceDal from "@/server/dal/invoices";
import { GET as getInvoices, POST as postInvoice } from "@/app/api/invoices/route";
import { POST as postBulkInvoices } from "@/app/api/invoices/bulk/route";
import { GET as getInvoiceDetail } from "@/app/api/invoices/[id]/route";
import { GET as getPayments, POST as postPayment } from "@/app/api/payments/route";
import { POST as postCancelPayment } from "@/app/api/payments/[id]/cancel/route";
import { GET as getFinancialSummary } from "@/app/api/financials/summary/route";
import { db } from "@/server/db";
import { AuthorizationError } from "@/server/dal/properties";

describe("Invoicing & Payment Records API Integration", () => {
  const mockUserA = {
    userId: "owner-usr-a",
    email: "owner-a@sewalokal.id",
    name: "Pak Budi",
    role: "OWNER" as const,
  };

  const mockUserB = {
    userId: "owner-usr-b",
    email: "owner-b@sewalokal.id",
    name: "Ibu Siti",
    role: "OWNER" as const,
  };

  const mockInvoiceSummary = {
    id: "inv-01",
    invoiceNumber: "INV-202610-101-1234",
    occupancyId: "occ-01",
    tenantName: "Andi Pratama",
    roomNumber: "101",
    amount: 1500000,
    totalPaid: 500000,
    remainingBalance: 1000000,
    dueDate: "2026-10-25T00:00:00.000Z",
    periodMonth: 10,
    periodYear: 2026,
    status: "PARTIAL" as const,
  };

  const mockInvoiceDetail = {
    id: "inv-01",
    invoiceNumber: "INV-202610-101-1234",
    occupancyId: "occ-01",
    amount: 1500000,
    dueDate: new Date("2026-10-25"),
    periodMonth: 10,
    periodYear: 2026,
    status: "PARTIAL" as const,
    totalPaid: 500000,
    remainingBalance: 1000000,
    occupancy: {
      id: "occ-01",
      monthlyRent: 1500000,
      tenant: {
        id: "tenant-01",
        name: "Andi Pratama",
        phone: "081234567890",
      },
      room: {
        id: "room-01",
        roomNumber: "101",
        property: {
          id: "prop-01",
          name: "Kos Melati",
          ownerId: mockUserA.userId,
        },
      },
    },
    payments: [
      {
        id: "pay-01",
        amount: 500000,
        paidAt: new Date("2026-10-05"),
        paymentMethod: "BANK_TRANSFER" as const,
        isCancelled: false,
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(sessionModule, "getCurrentUser").mockResolvedValue(mockUserA);
  });

  describe("GET /api/invoices", () => {
    it("returns list of invoices for authenticated owner", async () => {
      vi.spyOn(invoiceDal, "getInvoicesByOwner").mockResolvedValue([mockInvoiceSummary as unknown as never]);

      const request = new NextRequest("http://localhost:3000/api/invoices?status=PARTIAL");
      const response = await getInvoices(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].invoiceNumber).toBe("INV-202610-101-1234");
    });

    it("returns 401 when unauthenticated", async () => {
      vi.spyOn(sessionModule, "getCurrentUser").mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/invoices");
      const response = await getInvoices(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe("POST /api/invoices", () => {
    it("creates a single invoice with snapshot rate", async () => {
      vi.spyOn(invoiceDal, "createInvoice").mockResolvedValue(mockInvoiceDetail as unknown as never);

      const request = new NextRequest("http://localhost:3000/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          occupancyId: "occ-01",
          amount: 1500000,
          periodMonth: 10,
          periodYear: 2026,
          dueDate: "2026-10-25",
        }),
      });

      const response = await postInvoice(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.invoiceNumber).toBe("INV-202610-101-1234");
    });

    it("returns 409 when duplicate invoice for the same period is created", async () => {
      vi.spyOn(invoiceDal, "createInvoice").mockRejectedValue(
        new invoiceDal.DuplicateInvoiceError()
      );

      const request = new NextRequest("http://localhost:3000/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          occupancyId: "occ-01",
          amount: 1500000,
          periodMonth: 10,
          periodYear: 2026,
          dueDate: "2026-10-25",
        }),
      });

      const response = await postInvoice(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
    });
  });

  describe("POST /api/invoices/bulk", () => {
    it("generates bulk invoices idempotently", async () => {
      vi.spyOn(invoiceDal, "createBulkInvoices").mockResolvedValue({
        totalEligible: 5,
        generatedCount: 3,
        skippedCount: 2,
        invoices: [],
      });

      const request = new NextRequest("http://localhost:3000/api/invoices/bulk", {
        method: "POST",
        body: JSON.stringify({
          periodMonth: 10,
          periodYear: 2026,
        }),
      });

      const response = await postBulkInvoices(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.generatedCount).toBe(3);
      expect(data.data.skippedCount).toBe(2);
    });
  });

  describe("GET /api/invoices/[id]", () => {
    it("returns invoice detail for owner", async () => {
      vi.spyOn(invoiceDal, "getInvoiceById").mockResolvedValue(mockInvoiceDetail as unknown as never);

      const request = new NextRequest("http://localhost:3000/api/invoices/inv-01");
      const response = await getInvoiceDetail(request, {
        params: Promise.resolve({ id: "inv-01" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe("inv-01");
      expect(data.data.totalPaid).toBe(500000);
      expect(data.data.remainingBalance).toBe(1000000);
    });

    it("returns 403 Forbidden for anti-IDOR violation", async () => {
      vi.spyOn(invoiceDal, "getInvoiceById").mockRejectedValue(new AuthorizationError());

      const request = new NextRequest("http://localhost:3000/api/invoices/inv-01");
      const response = await getInvoiceDetail(request, {
        params: Promise.resolve({ id: "inv-01" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });
  });

  describe("GET /api/payments", () => {
    it("returns payment history for authenticated owner", async () => {
      vi.spyOn(db.payment, "findMany").mockResolvedValue([
        {
          id: "pay-hist-1",
          amount: 500000,
          paidAt: new Date("2026-10-05"),
          paymentMethod: "BANK_TRANSFER",
          isCancelled: false,
          invoice: {
            id: "inv-01",
            invoiceNumber: "INV-202610-101-1234",
            periodMonth: 10,
            periodYear: 2026,
            occupancy: {
              tenant: { id: "t-1", name: "Andi Pratama" },
              room: {
                roomNumber: "101",
                property: { name: "Kos Melati" },
              },
            },
          },
        },
      ] as unknown as never);

      const request = new NextRequest("http://localhost:3000/api/payments?limit=10");
      const response = await getPayments(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].amount).toBe(500000);
    });
  });

  describe("POST /api/payments", () => {
    it("records a valid payment and returns 201", async () => {
      vi.spyOn(invoiceDal, "recordPayment").mockResolvedValue({
        payment: {
          id: "pay-02",
          invoiceId: "inv-01",
          amount: 500000,
          paidAt: new Date(),
          paymentMethod: "BANK_TRANSFER",
          isCancelled: false,
        } as unknown as never,
        financials: {
          totalPaid: 1000000,
          remainingBalance: 500000,
          status: "PARTIAL",
        },
      });

      const request = new NextRequest("http://localhost:3000/api/payments", {
        method: "POST",
        body: JSON.stringify({
          invoiceId: "inv-01",
          amount: 500000,
          paymentMethod: "BANK_TRANSFER",
          paidAt: "2026-10-10",
        }),
      });

      const response = await postPayment(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.financials.status).toBe("PARTIAL");
    });

    it("returns 400 when payment amount exceeds remaining balance", async () => {
      vi.spyOn(invoiceDal, "recordPayment").mockRejectedValue(
        new invoiceDal.PaymentExceedsBalanceError("Nominal pembayaran melebihi sisa tagihan")
      );

      const request = new NextRequest("http://localhost:3000/api/payments", {
        method: "POST",
        body: JSON.stringify({
          invoiceId: "inv-01",
          amount: 2000000,
          paymentMethod: "BANK_TRANSFER",
          paidAt: "2026-10-10",
        }),
      });

      const response = await postPayment(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("melebihi sisa tagihan");
    });
  });

  describe("POST /api/payments/[id]/cancel", () => {
    it("cancels payment non-destructively and returns restored financials", async () => {
      vi.spyOn(invoiceDal, "cancelPayment").mockResolvedValue({
        payment: {
          id: "pay-01",
          isCancelled: true,
          cancelReason: "Salah transfer",
        } as unknown as never,
        financials: {
          totalPaid: 0,
          remainingBalance: 1500000,
          status: "UNPAID",
        },
      });

      const request = new NextRequest("http://localhost:3000/api/payments/pay-01/cancel", {
        method: "POST",
        body: JSON.stringify({
          reason: "Salah transfer",
        }),
      });

      const response = await postCancelPayment(request, {
        params: Promise.resolve({ id: "pay-01" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.payment.isCancelled).toBe(true);
      expect(data.data.financials.remainingBalance).toBe(1500000);
    });

    it("returns 403 Forbidden when unauthorized user tries to cancel another owner's payment", async () => {
      vi.spyOn(sessionModule, "getCurrentUser").mockResolvedValue(mockUserB);
      vi.spyOn(invoiceDal, "cancelPayment").mockRejectedValue(new AuthorizationError());

      const request = new NextRequest("http://localhost:3000/api/payments/pay-01/cancel", {
        method: "POST",
        body: JSON.stringify({
          reason: "Percobaan akses tidak sah",
        }),
      });

      const response = await postCancelPayment(request, {
        params: Promise.resolve({ id: "pay-01" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });
  });

  describe("GET /api/financials/summary", () => {
    it("returns financial summary for authenticated owner", async () => {
      vi.spyOn(invoiceDal, "getOwnerFinancialSummary").mockResolvedValue({
        totalBilled: 5000000,
        totalPaid: 3500000,
        remainingReceivable: 1500000,
        overdueAmount: 500000,
        overdueCount: 1,
        unpaidCount: 1,
        paidCount: 2,
      });

      const request = new NextRequest("http://localhost:3000/api/financials/summary");
      const response = await getFinancialSummary(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalBilled).toBe(5000000);
      expect(data.data.totalPaid).toBe(3500000);
      expect(data.data.remainingReceivable).toBe(1500000);
    });
  });
});
