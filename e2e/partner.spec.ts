import { test, expect } from "@playwright/test";
import { login } from "./_helpers";

test.describe("Partner", () => {
  test.beforeEach(async ({ page }) => { await login(page, "partner"); });

  test("partner dashboard renders", async ({ page }) => {
    await page.goto("/partner");
    await expect(page.locator("body")).toBeVisible();
  });

  test("finance hub renders", async ({ page }) => {
    await page.goto("/partner/finance");
    await expect(page.locator("body")).toBeVisible();
  });

  test("referrals page renders", async ({ page }) => {
    await page.goto("/partner/referrals");
    await expect(page.locator("body")).toBeVisible();
  });

  test("cannot reach admin finance hub", async ({ page }) => {
    await page.goto("/admin/finance");
    await expect(page).not.toHaveURL(/\/admin\/finance/, { timeout: 10_000 });
  });
});
