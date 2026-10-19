import { test, expect } from "@playwright/test";

test.describe("SewaLokal Smoke Test", () => {
  test("halaman beranda dapat diakses dan menampilkan brand SewaLokal", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/SewaLokal/);
    await expect(page.locator("h1")).toContainText("Kelola Properti Kos Anda");
  });

  test("halaman login dan register dapat diakses dengan formulir lengkap", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h2, .text-2xl")).toContainText("Masuk ke Akun Kos");
    await expect(page.locator("input#email")).toBeVisible();
    await expect(page.locator("input#password")).toBeVisible();

    await page.goto("/register");
    await expect(page.locator("h2, .text-2xl")).toContainText("Daftar Akun Pemilik Kos");
    await expect(page.locator("input#name")).toBeVisible();
  });
});
