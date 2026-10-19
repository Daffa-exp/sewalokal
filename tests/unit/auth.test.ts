// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSessionToken, verifySessionToken } from "@/lib/session";
import { loginSchema, registerSchema } from "@/lib/validations/auth";

describe("Auth Unit Tests", () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = "test-secret-key-auth-unit-testing-min-32-chars";
  });

  describe("Password Hashing & Verification", () => {
    it("hashes password with bcrypt and verifies correctly", async () => {
      const password = "RahasiaPassword2026!";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith("$2")).toBe(true);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword("SalahPassword123!", hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe("Session JWT Token", () => {
    it("generates and verifies valid session token payload", async () => {
      const payload = {
        userId: "cuid-user-1",
        email: "pemilik@kos.id",
        name: "Bapak Ahmad",
        role: "OWNER",
      };

      const token = await createSessionToken(payload);
      expect(typeof token).toBe("string");

      const decoded = await verifySessionToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(payload.userId);
      expect(decoded?.email).toBe(payload.email);
      expect(decoded?.role).toBe(payload.role);
    });

    it("rejects invalid or tampered JWT token", async () => {
      const tampered = "invalid.token.payload";
      const decoded = await verifySessionToken(tampered);
      expect(decoded).toBeNull();
    });
  });

  describe("Validation Schemas (Input Validation)", () => {
    it("validates legitimate registration input", () => {
      const valid = registerSchema.safeParse({
        name: "Hj. Siti Rahma",
        email: "siti.rahma@kos.id",
        phone: "081234567890",
        password: "StrongPassword123",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects weak password without uppercase or numbers", () => {
      const noUpper = registerSchema.safeParse({
        name: "Budi",
        email: "budi@kos.id",
        password: "password123",
      });
      expect(noUpper.success).toBe(false);

      const noNumber = registerSchema.safeParse({
        name: "Budi",
        email: "budi@kos.id",
        password: "PasswordTanpaAngka",
      });
      expect(noNumber.success).toBe(false);
    });

    it("rejects malformed email format", () => {
      const invalidEmail = loginSchema.safeParse({
        email: "bukan-email-valid",
        password: "password123",
      });
      expect(invalidEmail.success).toBe(false);
    });

    it("trims and normalizes email with leading/trailing whitespace and mixed case", () => {
      const parsedLogin = loginSchema.safeParse({
        email: "   User.Pemilik@Kos.ID   ",
        password: "password123",
      });
      expect(parsedLogin.success).toBe(true);
      if (parsedLogin.success) {
        expect(parsedLogin.data.email).toBe("user.pemilik@kos.id");
      }

      const parsedRegister = registerSchema.safeParse({
        name: "Pemilik Baru",
        email: "   Baru@Kos.ID   ",
        phone: "",
        password: "Password123!",
      });
      expect(parsedRegister.success).toBe(true);
      if (parsedRegister.success) {
        expect(parsedRegister.data.email).toBe("baru@kos.id");
      }
    });
  });
});
