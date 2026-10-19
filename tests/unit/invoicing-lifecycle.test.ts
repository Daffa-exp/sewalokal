// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/server/db";
import {
  createInvoice,
  createBulkInvoices,
  recordPayment,
  cancelPayment,
  getOwnerFinancialSummary,
  DuplicateInvoiceError,
  PaymentExceedsBalanceError,
} from "@/server/dal/invoices";

describe("Invoicing & Payment Lifecycle Unit Tests", () => {
  const ownerId = "owner-1";

  const mockOccupancy = {
    id: "occ-1",
    roomId: "room-1",
    tenantId: "tenant-1",
    startDate: new Date("2026-01-01"),
    endDate: null,
    status: "ACTIVE" as const,
    billingDueDay: 10,
    monthlyRent: 1500000,
    depositAmount: 500000,
    room: {
      id: "room-1",
      propertyId: "prop-1",
      roomNumber: "101",
      monthlyRate: 1500000,
      property: {
        id: "prop-1",
        ownerId,
        name: "Kos Melati",
      },
    },
    tenant: {
      id: "tenant-1",
      name: "Budi Santoso",
      phone: "08123456789",
    },
    invoices: [],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Invoice Creation & Duplication Prevention", () => {
    it("throws DuplicateInvoiceError when invoice for the same period already exists", async () => {
      vi.spyOn(db.occupancy, "findUnique").mockResolvedValue(mockOccupancy as unknown as never);
      vi.spyOn(db.invoice, "findUnique").mockResolvedValue({
        id: "inv-existing",
        occupancyId: "occ-1",
        periodMonth: 10,
        periodYear: 2026,
      } as unknown as never);

      await expect(
        createInvoice(
          {
            occupancyId: "occ-1",
            amount: 1500000,
            periodMonth: 10,
            periodYear: 2026,
            dueDate: "2026-10-10",
          },
          ownerId
        )
      ).rejects.toThrow(DuplicateInvoiceError);
    });

    it("creates invoice with snapshot pricing from room rate", async () => {
      vi.spyOn(db.occupancy, "findUnique").mockResolvedValue(mockOccupancy as unknown as never);
      vi.spyOn(db.invoice, "findUnique").mockResolvedValue(null);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);
      const futureDateStr = futureDate.toISOString().split("T")[0];

      const createdInvoiceMock = {
        id: "inv-new",
        invoiceNumber: "INV-202610-101-1234",
        occupancyId: "occ-1",
        amount: 1500000, // Snapshot from room rate
        periodMonth: 10,
        periodYear: 2026,
        dueDate: futureDate,
        status: "UNPAID",
        notes: null,
        occupancy: mockOccupancy,
        payments: [],
      };

      vi.spyOn(db.invoice, "create").mockResolvedValue(createdInvoiceMock as unknown as never);

      const result = await createInvoice(
        {
          occupancyId: "occ-1",
          amount: 1500000,
          periodMonth: 10,
          periodYear: 2026,
          dueDate: futureDateStr,
        },
        ownerId
      );

      expect(result.invoiceNumber).toBe("INV-202610-101-1234");
      expect(result.amount).toBe(1500000);
      expect(result.remainingBalance).toBe(1500000);
      expect(result.totalPaid).toBe(0);
      expect(result.status).toBe("UNPAID");
    });
  });

  describe("Idempotent Bulk Invoice Generation", () => {
    it("skips occupancies that already have an invoice for the target period", async () => {
      const activeOccupancies = [
        {
          ...mockOccupancy,
          id: "occ-1",
          invoices: [{ id: "inv-existing-1" }], // already has invoice for this period
        },
        {
          ...mockOccupancy,
          id: "occ-2",
          room: {
            ...mockOccupancy.room,
            id: "room-2",
            roomNumber: "102",
          },
          invoices: [], // no invoice yet
        },
      ];

      vi.spyOn(db.occupancy, "findMany").mockResolvedValue(activeOccupancies as unknown as never);

      vi.spyOn(db.invoice, "create").mockResolvedValue({
        id: "inv-bulk-2",
        invoiceNumber: "INV-202610-102-5678",
        occupancyId: "occ-2",
        amount: 1500000,
        periodMonth: 10,
        periodYear: 2026,
        dueDate: new Date("2026-10-10"),
        status: "UNPAID",
      } as unknown as never);

      const summary = await createBulkInvoices(
        {
          propertyId: "prop-1",
          periodMonth: 10,
          periodYear: 2026,
        },
        ownerId
      );

      expect(summary.totalEligible).toBe(2);
      expect(summary.generatedCount).toBe(1);
      expect(summary.skippedCount).toBe(1);
      expect(summary.invoices).toHaveLength(1);
    });

    it("returns 0 created and all skipped when executed repeatedly on the same period", async () => {
      const activeOccupancies = [
        {
          ...mockOccupancy,
          invoices: [{ id: "inv-already-generated" }],
        },
      ];

      vi.spyOn(db.occupancy, "findMany").mockResolvedValue(activeOccupancies as unknown as never);

      const summary = await createBulkInvoices(
        {
          periodMonth: 10,
          periodYear: 2026,
        },
        ownerId
      );

      expect(summary.totalEligible).toBe(1);
      expect(summary.generatedCount).toBe(0);
      expect(summary.skippedCount).toBe(1);
      expect(summary.invoices).toHaveLength(0);
    });
  });

  describe("Payment Recording & Balance Checks", () => {
    const mockInvoiceWithPayments = (amount: number, payments: { id: string; amount: number; isCancelled: boolean }[]) => ({
      id: "inv-1",
      invoiceNumber: "INV-202610-101-1234",
      occupancyId: "occ-1",
      amount,
      dueDate: new Date("2026-10-15"),
      status: "UNPAID" as const,
      occupancy: mockOccupancy,
      payments,
    });

    it("throws PaymentExceedsBalanceError when payment amount exceeds remaining balance", async () => {
      const invoiceData = mockInvoiceWithPayments(1500000, [
        { id: "pay-1", amount: 1000000, isCancelled: false },
      ]);
      // Sisa tagihan = 500.000. Trying to record 600.000 should fail.

      vi.spyOn(db.invoice, "findUnique").mockResolvedValue(invoiceData as unknown as never);

      vi.spyOn(db, "$transaction").mockImplementation(async (callback) => {
        const tx = {
          payment: {
            findMany: vi.fn().mockResolvedValue([
              { id: "pay-1", amount: 1000000, isCancelled: false },
            ]),
          },
        };
        return callback(tx as unknown as never);
      });

      await expect(
        recordPayment(
          {
            invoiceId: "inv-1",
            amount: 600000,
            paidAt: "2026-10-05",
            paymentMethod: "BANK_TRANSFER",
          },
          ownerId,
          ownerId
        )
      ).rejects.toThrow(PaymentExceedsBalanceError);
    });

    it("records partial payment and transitions invoice status to PARTIAL in a transaction", async () => {
      const invoiceData = mockInvoiceWithPayments(1500000, []);

      vi.spyOn(db.invoice, "findUnique").mockResolvedValue(invoiceData as unknown as never);

      const createdPayment = {
        id: "pay-new",
        invoiceId: "inv-1",
        amount: 750000,
        paidAt: new Date("2026-10-05"),
        paymentMethod: "BANK_TRANSFER",
        notes: "Cicilan 1",
        isCancelled: false,
        cancelledAt: null,
        cancelReason: null,
      };

      vi.spyOn(db, "$transaction").mockImplementation(async (callback) => {
        const tx = {
          payment: {
            findMany: vi.fn().mockResolvedValue([]),
            create: vi.fn().mockResolvedValue(createdPayment),
          },
          invoice: {
            update: vi.fn().mockResolvedValue({
              ...invoiceData,
              status: "PARTIAL",
            }),
          },
        };
        return callback(tx as unknown as never);
      });

      const result = await recordPayment(
        {
          invoiceId: "inv-1",
          amount: 750000,
          paidAt: "2026-10-05",
          paymentMethod: "BANK_TRANSFER",
          notes: "Cicilan 1",
        },
        ownerId,
        ownerId
      );

      expect(result.payment.amount).toBe(750000);
      expect(result.financials.status).toBe("PARTIAL");
      expect(result.financials.remainingBalance).toBe(750000);
      expect(result.financials.totalPaid).toBe(750000);
    });

    it("records full payment settling the balance and transitions invoice status to PAID", async () => {
      const invoiceData = mockInvoiceWithPayments(1500000, []);

      vi.spyOn(db.invoice, "findUnique").mockResolvedValue(invoiceData as unknown as never);

      const createdPayment = {
        id: "pay-full",
        invoiceId: "inv-1",
        amount: 1500000,
        paidAt: new Date("2026-10-05"),
        paymentMethod: "CASH",
        isCancelled: false,
        cancelledAt: null,
        cancelReason: null,
      };

      vi.spyOn(db, "$transaction").mockImplementation(async (callback) => {
        const tx = {
          payment: {
            findMany: vi.fn().mockResolvedValue([]),
            create: vi.fn().mockResolvedValue(createdPayment),
          },
          invoice: {
            update: vi.fn().mockResolvedValue({
              ...invoiceData,
              status: "PAID",
            }),
          },
        };
        return callback(tx as unknown as never);
      });

      const result = await recordPayment(
        {
          invoiceId: "inv-1",
          amount: 1500000,
          paidAt: "2026-10-05",
          paymentMethod: "CASH",
        },
        ownerId,
        ownerId
      );

      expect(result.financials.status).toBe("PAID");
      expect(result.financials.remainingBalance).toBe(0);
      expect(result.financials.totalPaid).toBe(1500000);
    });
  });

  describe("Non-Destructive Payment Cancellation / Reversal", () => {
    it("reverses payment, marks isCancelled with reason, and restores remaining balance", async () => {
      const targetPayment = {
        id: "pay-to-cancel",
        invoiceId: "inv-1",
        amount: 1500000,
        paidAt: new Date("2026-10-05"),
        paymentMethod: "BANK_TRANSFER",
        isCancelled: false,
        cancelledAt: null,
        cancelReason: null,
        invoice: {
          id: "inv-1",
          amount: 1500000,
          dueDate: new Date(Date.now() + 864000000), // future date
          status: "PAID",
          occupancy: mockOccupancy,
          payments: [
            { id: "pay-to-cancel", amount: 1500000, isCancelled: false },
          ],
        },
      };

      vi.spyOn(db.payment, "findUnique").mockResolvedValue(targetPayment as unknown as never);

      const updatedPayment = {
        ...targetPayment,
        isCancelled: true,
        cancelledAt: new Date(),
        cancelReason: "Salah input rekening tujuan",
      };

      vi.spyOn(db, "$transaction").mockImplementation(async (callback) => {
        const tx = {
          payment: {
            update: vi.fn().mockResolvedValue(updatedPayment),
            findMany: vi.fn().mockResolvedValue([]), // no more active payments
          },
          invoice: {
            update: vi.fn().mockResolvedValue({
              ...targetPayment.invoice,
              status: "UNPAID",
            }),
          },
        };
        return callback(tx as unknown as never);
      });

      const result = await cancelPayment(
        "pay-to-cancel",
        "Salah input rekening tujuan",
        ownerId
      );

      expect(result.payment.isCancelled).toBe(true);
      expect(result.payment.cancelReason).toBe("Salah input rekening tujuan");
      // Since payment of 1,500,000 was cancelled and future due date, status must revert to UNPAID
      expect(result.financials.status).toBe("UNPAID");
      expect(result.financials.remainingBalance).toBe(1500000);
      expect(result.financials.totalPaid).toBe(0);
    });
  });

  describe("Financial Summary & Revenue Isolation", () => {
    it("computes actual revenue strictly from non-cancelled payments and counts overdue/unpaid correctly", async () => {
      const mockInvoicesForSummary = [
        // Invoice 1: 1.000.000, paid 1.000.000 (PAID)
        {
          id: "inv-1",
          amount: 1000000,
          dueDate: new Date("2026-10-10"),
          payments: [
            { id: "p1", amount: 1000000, isCancelled: false, paidAt: new Date() },
          ],
        },
        // Invoice 2: 2.000.000, paid 500.000 (PARTIAL) (note: DAL filters out isCancelled: true at DB query level)
        {
          id: "inv-2",
          amount: 2000000,
          dueDate: new Date("2026-10-10"),
          payments: [
            { id: "p2", amount: 500000, isCancelled: false, paidAt: new Date() },
          ],
        },
        // Invoice 3: 1.500.000, no payments, past due (OVERDUE)
        {
          id: "inv-3",
          amount: 1500000,
          dueDate: new Date("2020-01-01"), // definitely in the past
          payments: [],
        },
      ];

      vi.spyOn(db.invoice, "findMany").mockResolvedValue(mockInvoicesForSummary as unknown as never);

      const summary = await getOwnerFinancialSummary(ownerId);

      // Total billed: 1.000.000 + 2.000.000 + 1.500.000 = 4.500.000
      expect(summary.totalBilled).toBe(4500000);

      // Actual revenue: 1.000.000 + 500.000 = 1.500.000
      expect(summary.totalPaid).toBe(1500000);

      // Total receivable:
      // inv-1: 0
      // inv-2: 2.000.000 - 500.000 = 1.500.000
      // inv-3: 1.500.000 - 0 = 1.500.000
      // Total = 3.000.000
      expect(summary.remainingReceivable).toBe(3000000);

      // Overdue: inv-3 (1.500.000)
      expect(summary.overdueAmount).toBe(1500000);
      expect(summary.overdueCount).toBe(1);

      expect(summary.paidCount).toBe(1);
      expect(summary.unpaidCount).toBe(1); // inv-2 is partial, categorized in unpaidCount
    });
  });
});
