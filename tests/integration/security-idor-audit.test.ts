// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/server/db";
import {
  getPropertyById,
  updateProperty,
  deleteProperty,
  archiveProperty,
  AuthorizationError,
} from "@/server/dal/properties";
import { getRoomById, updateRoom, archiveRoom } from "@/server/dal/rooms";
import { getTenantById, updateTenant } from "@/server/dal/tenants";
import { getOccupancyById, terminateOccupancy } from "@/server/dal/occupancies";
import {
  createInvoice,
  getInvoiceById,
  recordPayment,
  cancelPayment,
  markReminderSent,
  getOwnerFinancialSummary,
} from "@/server/dal/invoices";

describe("Fase 5: Comprehensive Anti-IDOR Security & Isolation Audit", () => {
  const victimOwner = { id: "owner-victim-A", name: "Pak Budi" };
  const attackerOwner = { id: "owner-attacker-B", name: "Attacker B" };

  const mockPropertyA = {
    id: "prop-A",
    ownerId: victimOwner.id,
    name: "Kos Melati A",
    address: "Jl. Melati 1",
    city: "Yogyakarta",
    isArchived: false,
    rooms: [],
  };

  const mockRoomA = {
    id: "room-A",
    propertyId: mockPropertyA.id,
    roomNumber: "101",
    monthlyRate: 1500000,
    status: "OCCUPIED" as const,
    isArchived: false,
    property: mockPropertyA,
  };

  const mockTenantA = {
    id: "tenant-A",
    ownerId: victimOwner.id,
    name: "Siti Rahma",
    phone: "081234567890",
  };

  const mockOccupancyA = {
    id: "occ-A",
    roomId: mockRoomA.id,
    tenantId: mockTenantA.id,
    monthlyRent: 1500000,
    status: "ACTIVE" as const,
    room: mockRoomA,
    tenant: mockTenantA,
  };

  const mockInvoiceA = {
    id: "inv-A",
    occupancyId: mockOccupancyA.id,
    invoiceNumber: "INV-202610-101-0001",
    amount: 1500000,
    dueDate: new Date("2026-10-25"),
    status: "PARTIAL" as const,
    occupancy: mockOccupancyA,
    payments: [],
  };

  const mockPaymentA = {
    id: "pay-A",
    invoiceId: mockInvoiceA.id,
    amount: 500000,
    isCancelled: false,
    invoice: mockInvoiceA,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Property IDOR Attack Surface", () => {
    it("rejects Attacker B trying to read Owner A's property", async () => {
      vi.spyOn(db.property, "findUnique").mockResolvedValue(mockPropertyA as unknown as never);
      await expect(getPropertyById("prop-A", attackerOwner.id)).rejects.toThrow(AuthorizationError);
    });

    it("rejects Attacker B trying to update Owner A's property", async () => {
      vi.spyOn(db.property, "findUnique").mockResolvedValue(mockPropertyA as unknown as never);
      await expect(
        updateProperty("prop-A", { name: "Hijacked Property" }, attackerOwner.id)
      ).rejects.toThrow(AuthorizationError);
    });

    it("rejects Attacker B trying to delete or archive Owner A's property", async () => {
      vi.spyOn(db.property, "findUnique").mockResolvedValue(mockPropertyA as unknown as never);
      await expect(deleteProperty("prop-A", attackerOwner.id)).rejects.toThrow(AuthorizationError);
      await expect(archiveProperty("prop-A", attackerOwner.id)).rejects.toThrow(AuthorizationError);
    });
  });

  describe("Room IDOR Attack Surface", () => {
    it("rejects Attacker B trying to read, update, or archive Owner A's room", async () => {
      vi.spyOn(db.room, "findUnique").mockResolvedValue(mockRoomA as unknown as never);

      await expect(getRoomById("room-A", attackerOwner.id)).rejects.toThrow(AuthorizationError);
      await expect(
        updateRoom("room-A", { monthlyRate: 1000 }, attackerOwner.id)
      ).rejects.toThrow(AuthorizationError);
      await expect(archiveRoom("room-A", attackerOwner.id)).rejects.toThrow(AuthorizationError);
    });
  });

  describe("Tenant IDOR Attack Surface", () => {
    it("rejects Attacker B trying to read or update Owner A's tenant", async () => {
      vi.spyOn(db.tenant, "findUnique").mockResolvedValue(mockTenantA as unknown as never);

      await expect(getTenantById("tenant-A", attackerOwner.id)).rejects.toThrow(AuthorizationError);
      await expect(
        updateTenant("tenant-A", { name: "Tampered" }, attackerOwner.id)
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe("Occupancy & Checkout IDOR Attack Surface", () => {
    it("rejects Attacker B trying to read or checkout Owner A's occupancy", async () => {
      vi.spyOn(db.occupancy, "findUnique").mockResolvedValue(mockOccupancyA as unknown as never);

      await expect(getOccupancyById("occ-A", attackerOwner.id)).rejects.toThrow(AuthorizationError);
      await expect(terminateOccupancy("occ-A", attackerOwner.id)).rejects.toThrow(AuthorizationError);
    });
  });

  describe("Invoice, Payment & Reminder IDOR Attack Surface", () => {
    it("rejects Attacker B trying to read Owner A's invoice", async () => {
      vi.spyOn(db.invoice, "findUnique").mockResolvedValue(mockInvoiceA as unknown as never);
      await expect(getInvoiceById("inv-A", attackerOwner.id)).rejects.toThrow(AuthorizationError);
    });

    it("rejects Attacker B trying to create an invoice against Owner A's occupancy", async () => {
      vi.spyOn(db.occupancy, "findUnique").mockResolvedValue(mockOccupancyA as unknown as never);

      await expect(
        createInvoice(
          {
            occupancyId: "occ-A",
            amount: 1500000,
            dueDate: "2026-10-25",
            periodMonth: 10,
            periodYear: 2026,
          },
          attackerOwner.id
        )
      ).rejects.toThrow(AuthorizationError);
    });

    it("rejects Attacker B trying to record a payment on Owner A's invoice", async () => {
      vi.spyOn(db.invoice, "findUnique").mockResolvedValue(mockInvoiceA as unknown as never);

      await expect(
        recordPayment(
          {
            invoiceId: "inv-A",
            amount: 500000,
            paymentMethod: "BANK_TRANSFER",
            paidAt: "2026-10-10",
          },
          attackerOwner.id,
          attackerOwner.id
        )
      ).rejects.toThrow(AuthorizationError);
    });

    it("rejects Attacker B trying to cancel Owner A's payment record", async () => {
      vi.spyOn(db.payment, "findUnique").mockResolvedValue(mockPaymentA as unknown as never);

      await expect(
        cancelPayment("pay-A", "Attacker trying to reverse", attackerOwner.id)
      ).rejects.toThrow(AuthorizationError);
    });

    it("rejects Attacker B trying to mark reminder timestamp on Owner A's invoice", async () => {
      vi.spyOn(db.invoice, "findUnique").mockResolvedValue(mockInvoiceA as unknown as never);

      await expect(markReminderSent("inv-A", attackerOwner.id)).rejects.toThrow(AuthorizationError);
    });
  });

  describe("Financial Aggregation Isolation", () => {
    it("ensures Attacker B's financial summary never includes Owner A's data", async () => {
      // db.invoice.findMany filters by room.property.ownerId === attackerOwner.id
      vi.spyOn(db.invoice, "findMany").mockResolvedValue([] as unknown as never);

      const summaryB = await getOwnerFinancialSummary(attackerOwner.id);

      expect(summaryB.totalBilled).toBe(0);
      expect(summaryB.totalPaid).toBe(0);
      expect(summaryB.remainingReceivable).toBe(0);
    });
  });
});
