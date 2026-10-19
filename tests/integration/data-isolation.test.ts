// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { db } from "@/server/db";
import {
  getPropertyById,
  updateProperty,
  deleteProperty,
  AuthorizationError,
} from "@/server/dal/properties";
import { getRoomById } from "@/server/dal/rooms";
import { getTenantById } from "@/server/dal/tenants";
import { getOccupancyById } from "@/server/dal/occupancies";
import { getInvoiceById } from "@/server/dal/invoices";

describe("Data Isolation & IDOR Protection Tests", () => {
  const userA = { id: "user-owner-A", name: "Pemilik A" };
  const userB = { id: "user-owner-B", name: "Pemilik B (Attacker)" };

  const mockPropertyA = {
    id: "prop-A-1",
    name: "Kos Melati A",
    address: "Jl. Melati 1",
    city: "Yogyakarta",
    description: "Kos milik User A",
    rules: "Tertib",
    ownerId: userA.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    rooms: [],
  };

  const mockRoomA = {
    id: "room-A-1",
    propertyId: mockPropertyA.id,
    roomNumber: "101",
    type: "Standard",
    monthlyRate: 1500000,
    status: "VACANT",
    facilities: ["Kasur", "Lemari"],
    createdAt: new Date(),
    updatedAt: new Date(),
    property: mockPropertyA,
  };

  const mockTenantA = {
    id: "tenant-A-1",
    ownerId: userA.id,
    name: "Budi Santoso",
    phone: "081234567890",
    identityNumber: "3401234567890001",
    emergencyContact: "081987654321",
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    occupancies: [],
  };

  const mockOccupancyA = {
    id: "occ-A-1",
    roomId: mockRoomA.id,
    tenantId: mockTenantA.id,
    startDate: new Date("2026-01-01"),
    endDate: null,
    billingDueDay: 1,
    depositAmount: 500000,
    monthlyRent: 1500000,
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
    room: mockRoomA,
    tenant: mockTenantA,
    invoices: [],
  };

  const mockInvoiceA = {
    id: "inv-A-1",
    occupancyId: mockOccupancyA.id,
    invoiceNumber: "INV-202610-101-1234",
    amount: 1500000,
    dueDate: new Date("2026-10-10"),
    periodMonth: 10,
    periodYear: 2026,
    status: "UNPAID",
    reminderSentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    occupancy: mockOccupancyA,
    payments: [],
  };

  describe("Property Isolation", () => {
    it("allows Owner A to read their own property", async () => {
      vi.spyOn(db.property, "findUnique").mockResolvedValue(mockPropertyA as unknown as never);

      const prop = await getPropertyById(mockPropertyA.id, userA.id);
      expect(prop).toBeDefined();
      expect(prop.ownerId).toBe(userA.id);
    });

    it("prevents Owner B from reading Owner A's property (throws AuthorizationError)", async () => {
      vi.spyOn(db.property, "findUnique").mockResolvedValue(mockPropertyA as unknown as never);

      await expect(getPropertyById(mockPropertyA.id, userB.id)).rejects.toThrow(
        AuthorizationError
      );
    });

    it("prevents Owner B from updating Owner A's property", async () => {
      vi.spyOn(db.property, "findUnique").mockResolvedValue(mockPropertyA as unknown as never);

      await expect(
        updateProperty(mockPropertyA.id, { name: "Hacked by B" }, userB.id)
      ).rejects.toThrow(AuthorizationError);
    });

    it("prevents Owner B from deleting Owner A's property", async () => {
      vi.spyOn(db.property, "findUnique").mockResolvedValue(mockPropertyA as unknown as never);

      await expect(deleteProperty(mockPropertyA.id, userB.id)).rejects.toThrow(
        AuthorizationError
      );
    });
  });

  describe("Room Isolation", () => {
    it("prevents Owner B from accessing Owner A's room", async () => {
      vi.spyOn(db.room, "findUnique").mockResolvedValue(mockRoomA as unknown as never);

      await expect(getRoomById(mockRoomA.id, userB.id)).rejects.toThrow(
        AuthorizationError
      );
    });
  });

  describe("Tenant Isolation", () => {
    it("prevents Owner B from accessing Owner A's tenant data", async () => {
      vi.spyOn(db.tenant, "findUnique").mockResolvedValue(mockTenantA as unknown as never);

      await expect(getTenantById(mockTenantA.id, userB.id)).rejects.toThrow(
        AuthorizationError
      );
    });
  });

  describe("Occupancy & Invoice Isolation", () => {
    it("prevents Owner B from accessing Owner A's occupancy contract", async () => {
      vi.spyOn(db.occupancy, "findUnique").mockResolvedValue(mockOccupancyA as unknown as never);

      await expect(getOccupancyById(mockOccupancyA.id, userB.id)).rejects.toThrow(
        AuthorizationError
      );
    });

    it("prevents Owner B from accessing Owner A's invoice and payment records", async () => {
      vi.spyOn(db.invoice, "findUnique").mockResolvedValue(mockInvoiceA as unknown as never);

      await expect(getInvoiceById(mockInvoiceA.id, userB.id)).rejects.toThrow(
        AuthorizationError
      );
    });
  });
});
