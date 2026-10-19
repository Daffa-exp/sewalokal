// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  isValidIndonesianPhone,
  normalizeIndonesianPhone,
  buildBillingReminderMessage,
  createWhatsAppReminderUrl,
  calculateDaysOverdue,
} from "@/lib/formatters";

describe("Formatters & WhatsApp Reminder Unit Tests", () => {
  describe("isValidIndonesianPhone", () => {
    it("validates valid standard Indonesian mobile phone numbers", () => {
      expect(isValidIndonesianPhone("081234567890")).toBe(true);
      expect(isValidIndonesianPhone("0857-1234-5678")).toBe(true);
      expect(isValidIndonesianPhone("+6281234567890")).toBe(true);
      expect(isValidIndonesianPhone("6281234567890")).toBe(true);
      expect(isValidIndonesianPhone("089999999999")).toBe(true);
    });

    it("rejects invalid or too short phone numbers", () => {
      expect(isValidIndonesianPhone("")).toBe(false);
      expect(isValidIndonesianPhone(null)).toBe(false);
      expect(isValidIndonesianPhone(undefined)).toBe(false);
      expect(isValidIndonesianPhone("12345")).toBe(false);
      expect(isValidIndonesianPhone("0812")).toBe(false); // too short
      expect(isValidIndonesianPhone("021-1234567")).toBe(false); // landline, not 08
      expect(isValidIndonesianPhone("abcdefghijk")).toBe(false);
      expect(isValidIndonesianPhone("0812345678901234567")).toBe(false); // too long
    });
  });

  describe("normalizeIndonesianPhone", () => {
    it("converts local 08 prefix to international 628", () => {
      expect(normalizeIndonesianPhone("081234567890")).toBe("6281234567890");
      expect(normalizeIndonesianPhone("0856-7890-1234")).toBe("6285678901234");
    });

    it("handles leading plus and retains 62 prefix", () => {
      expect(normalizeIndonesianPhone("+6281234567890")).toBe("6281234567890");
      expect(normalizeIndonesianPhone("6281234567890")).toBe("6281234567890");
    });
  });

  describe("buildBillingReminderMessage", () => {
    it("constructs a polite and complete Indonesian billing reminder text", () => {
      const message = buildBillingReminderMessage({
        tenantName: "Budi Pratama",
        propertyName: "Kos Melati Harmoni",
        roomNumber: "101",
        periodMonth: 10,
        periodYear: 2026,
        remainingBalance: 1200000,
        dueDate: "2026-10-25",
      });

      expect(message).toContain("Halo Kak Budi Pratama,");
      expect(message).toContain("Kos Melati Harmoni kamar 101");
      expect(message).toContain("Oktober 2026");
      expect(message).toContain("Rp 1.200.000");
      expect(message).toContain("25 Oktober 2026");
      expect(message).toContain("Mohon konfirmasi apabila pembayaran telah dilakukan");
    });
  });

  describe("createWhatsAppReminderUrl", () => {
    it("encodes URL and generates valid wa.me link", () => {
      const url = createWhatsAppReminderUrl("0812-3456-7890", "Halo Budi! Tagihan kos Anda siap.");

      expect(url).toBe("https://wa.me/6281234567890?text=Halo%20Budi!%20Tagihan%20kos%20Anda%20siap.");
    });
  });

  describe("calculateDaysOverdue", () => {
    it("returns 0 for future or today dates", () => {
      const future = new Date();
      future.setDate(future.getDate() + 5);
      expect(calculateDaysOverdue(future)).toBe(0);

      const today = new Date();
      expect(calculateDaysOverdue(today)).toBe(0);
    });

    it("returns positive days for past due dates", () => {
      const past = new Date();
      past.setDate(past.getDate() - 3);
      expect(calculateDaysOverdue(past)).toBeGreaterThanOrEqual(3);
    });
  });
});
