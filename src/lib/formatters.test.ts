import { describe, it, expect } from "vitest";
import {
  formatRupiah,
  formatDateIndonesia,
  normalizeIndonesianPhone,
  createWhatsAppReminderUrl,
  calculateDaysOverdue,
} from "./formatters";

describe("formatters helper", () => {
  describe("formatRupiah", () => {
    it("formats standard amounts to Indonesian Rupiah", () => {
      const result = formatRupiah(1500000);
      expect(result).toMatch(/Rp\s?1\.500\.000/);
    });

    it("handles zero gracefully", () => {
      const result = formatRupiah(0);
      expect(result).toMatch(/Rp\s?0/);
    });

    it("handles NaN or invalid inputs safely", () => {
      expect(formatRupiah(NaN)).toBe("Rp 0");
    });
  });

  describe("formatDateIndonesia", () => {
    it("formats dates to Indonesian locale standard", () => {
      const formatted = formatDateIndonesia(new Date(2026, 9, 19));
      expect(formatted).toContain("19");
      expect(formatted).toContain("Oktober");
      expect(formatted).toContain("2026");
    });

    it("returns dash for invalid date input", () => {
      expect(formatDateIndonesia("invalid-date")).toBe("-");
    });
  });

  describe("normalizeIndonesianPhone", () => {
    it("converts 08... format to 628...", () => {
      expect(normalizeIndonesianPhone("081234567890")).toBe("6281234567890");
    });

    it("handles +628... with plus sign", () => {
      expect(normalizeIndonesianPhone("+6281234567890")).toBe("6281234567890");
    });

    it("strips dashes, spaces, and parentheses", () => {
      expect(normalizeIndonesianPhone("0812-3456-7890")).toBe("6281234567890");
      expect(normalizeIndonesianPhone("(0812) 3456 7890")).toBe("6281234567890");
    });
  });

  describe("createWhatsAppReminderUrl", () => {
    it("generates valid wa.me URL with normalized phone and encoded message", () => {
      const url = createWhatsAppReminderUrl("0812-3456-7890", "Halo, tagihan Rp 1.500.000");
      expect(url).toContain("https://wa.me/6281234567890?text=");
      expect(url).toContain(encodeURIComponent("Halo, tagihan Rp 1.500.000"));
    });
  });

  describe("calculateDaysOverdue", () => {
    it("returns 0 for future due dates", () => {
      const future = new Date();
      future.setDate(future.getDate() + 5);
      expect(calculateDaysOverdue(future)).toBe(0);
    });

    it("returns positive days for past due dates", () => {
      const past = new Date();
      past.setDate(past.getDate() - 3);
      expect(calculateDaysOverdue(past)).toBeGreaterThanOrEqual(3);
    });
  });
});
