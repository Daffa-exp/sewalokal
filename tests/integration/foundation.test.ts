// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSessionToken, verifySessionToken } from "@/lib/session";
import { formatRupiah, createWhatsAppReminderUrl } from "@/lib/formatters";

describe("Foundation Integration Smoke Test", () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = "test-secret-key-sewalokal-integration-testing-123456";
  });
  it("executes password hashing and verification cycle correctly", async () => {
    const rawPassword = "OwnerSecretPassword2026!";
    const hashed = await hashPassword(rawPassword);

    expect(hashed).toBeDefined();
    expect(hashed).not.toBe(rawPassword);

    const isMatch = await verifyPassword(rawPassword, hashed);
    expect(isMatch).toBe(true);

    const isMismatch = await verifyPassword("WrongPassword123", hashed);
    expect(isMismatch).toBe(false);
  });

  it("creates and verifies server JWT session token cycle", async () => {
    const payload = {
      userId: "user-cuid-12345",
      email: "pemilik@kos.id",
      name: "Ibu Hartono",
      role: "OWNER",
    };

    const token = await createSessionToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = await verifySessionToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(payload.userId);
    expect(decoded?.email).toBe(payload.email);
    expect(decoded?.name).toBe(payload.name);
  });

  it("formats Indonesian Rupiah and WhatsApp links seamlessly", () => {
    const amount = 2250000;
    const formattedRupiah = formatRupiah(amount);
    expect(formattedRupiah).toMatch(/Rp\s?2\.250\.000/);

    const waLink = createWhatsAppReminderUrl(
      "0812-9876-5432",
      `Tagihan sewa sebesar ${formattedRupiah}`
    );
    expect(waLink).toContain("https://wa.me/6281298765432?text=");
    expect(waLink).toContain(encodeURIComponent(`Tagihan sewa sebesar ${formattedRupiah}`));
  });
});
