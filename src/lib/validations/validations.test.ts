import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema } from "./auth";
import { propertySchema, roomSchema } from "./property";
import { tenantSchema, occupancySchema, leaseSchema } from "./tenant";
import { invoiceSchema, recordPaymentSchema } from "./invoice";

describe("Zod validation schemas", () => {
  describe("auth schemas", () => {
    it("validates correct login credentials", () => {
      const valid = loginSchema.safeParse({
        email: "owner@kos.id",
        password: "secretpassword",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects invalid email for login", () => {
      const invalid = loginSchema.safeParse({
        email: "not-an-email",
        password: "secretpassword",
      });
      expect(invalid.success).toBe(false);
    });

    it("requires strong password for registration", () => {
      const weakPassword = registerSchema.safeParse({
        name: "Pemilik Kos",
        email: "owner@kos.id",
        password: "weak",
      });
      expect(weakPassword.success).toBe(false);

      const strongPassword = registerSchema.safeParse({
        name: "Pemilik Kos",
        email: "owner@kos.id",
        password: "StrongPassword123",
      });
      expect(strongPassword.success).toBe(true);
    });
  });

  describe("property & room schemas", () => {
    it("validates property input", () => {
      const valid = propertySchema.safeParse({
        name: "Kos Melati Harmoni",
        address: "Jl. Kaliurang Km 5 No. 12",
        city: "Sleman",
      });
      expect(valid.success).toBe(true);
    });

    it("validates room rate must be positive", () => {
      const invalid = roomSchema.safeParse({
        propertyId: "prop-1",
        roomNumber: "101",
        monthlyRate: -500000,
      });
      expect(invalid.success).toBe(false);

      const valid = roomSchema.safeParse({
        propertyId: "prop-1",
        roomNumber: "101",
        monthlyRate: 850000,
      });
      expect(valid.success).toBe(true);
    });
  });

  describe("tenant & lease schemas", () => {
    it("validates tenant phone number", () => {
      const valid = tenantSchema.safeParse({
        name: "Rian Pratama",
        phone: "081234567890",
      });
      expect(valid.success).toBe(true);

      const invalid = tenantSchema.safeParse({
        name: "Rian Pratama",
        phone: "abc123",
      });
      expect(invalid.success).toBe(false);
    });

    it("trims and accepts tenant email with whitespace or empty value", () => {
      const withSpaces = tenantSchema.safeParse({
        name: "Rian Pratama",
        email: "   rian@example.com   ",
        phone: "",
      });
      expect(withSpaces.success).toBe(true);
      if (withSpaces.success) {
        expect(withSpaces.data.email).toBe("rian@example.com");
      }

      const emptyEmail = tenantSchema.safeParse({
        name: "Rian Pratama",
        email: "",
      });
      expect(emptyEmail.success).toBe(true);
    });

    it("validates occupancy and lease terms", () => {
      const valid = occupancySchema.safeParse({
        roomId: "room-1",
        tenantId: "tenant-1",
        startDate: "2026-10-01",
        monthlyRent: 1200000,
      });
      expect(valid.success).toBe(true);

      const validLease = leaseSchema.safeParse({
        roomId: "room-1",
        tenantId: "tenant-1",
        startDate: "2026-10-01",
        monthlyRent: 1200000,
      });
      expect(validLease.success).toBe(true);
    });
  });

  describe("invoice & payment schemas", () => {
    it("validates invoice creation with occupancyId or leaseId", () => {
      const validOccupancy = invoiceSchema.safeParse({
        occupancyId: "occ-1",
        amount: 1500000,
        dueDate: "2026-11-01",
        periodMonth: 11,
        periodYear: 2026,
      });
      expect(validOccupancy.success).toBe(true);

      const validLease = invoiceSchema.safeParse({
        leaseId: "lease-1",
        amount: 1500000,
        dueDate: "2026-11-01",
        periodMonth: 11,
        periodYear: 2026,
      });
      expect(validLease.success).toBe(true);
    });

    it("validates payment recording", () => {
      const valid = recordPaymentSchema.safeParse({
        invoiceId: "inv-1",
        amount: 1200000,
        paymentMethod: "BANK_TRANSFER",
      });
      expect(valid.success).toBe(true);

      const invalidMethod = recordPaymentSchema.safeParse({
        invoiceId: "inv-1",
        amount: 1200000,
        paymentMethod: "CREDIT_CARD",
      });
      expect(invalidMethod.success).toBe(false);
    });
  });
});
