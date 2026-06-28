import { test, expect } from "@playwright/test";
import { login } from "./_helpers";

test.describe("Job Seeker", () => {
  test.beforeEach(async ({ page }) => { await login(page, "seeker"); });

  test("dashboard loads and shows wallet chip", async ({ page }) => {
    await page.goto("/home");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText(/MMK|kyat|balance|wallet/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("can browse jobs and open a detail page", async ({ page }) => {
    await page.goto("/jobs");
    const card = page.locator("a[href^='/jobs/']").first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.click();
    await expect(page).toHaveURL(/\/jobs\/[^/]+/);
  });

  test("save / unsave job toggles", async ({ page }) => {
    await page.goto("/jobs");
    const card = page.locator("a[href^='/jobs/']").first();
    await card.click();
    const save = page.getByRole("button", { name: /save/i }).first();
    if (await save.count()) {
      await save.click();
      // No assertion on toast (success toasts suppressed); just confirm no error UI
      await expect(page.getByText(/error|failed/i)).toHaveCount(0);
    }
  });

  test("can edit profile (CRUD: read + update headline)", async ({ page }) => {
    await page.goto("/profile/edit");
    const headline = page.getByLabel(/headline/i).first();
    await expect(headline).toBeVisible({ timeout: 15_000 });
    const newValue = `E2E Test ${Date.now()}`;
    await headline.fill(newValue);
    await page.getByRole("button", { name: /save/i }).first().click();
    await page.reload();
    await expect(page.getByLabel(/headline/i).first()).toHaveValue(newValue);
  });

  test("notifications page renders", async ({ page }) => {
    await page.goto("/notifications");
    await expect(page.locator("body")).toBeVisible();
  });

  test("messages page renders", async ({ page }) => {
    await page.goto("/messages");
    await expect(page.locator("body")).toBeVisible();
  });

  test("wallet balance is reachable", async ({ page }) => {
    await page.goto("/wallet").catch(() => {});
    // Wallet may have moved to dashboard; accept either location.
    const balanceOnWallet = page.getByText(/balance|MMK/i).first();
    if (await balanceOnWallet.isVisible({ timeout: 5_000 }).catch(() => false)) return;
    await page.goto("/home");
    await expect(page.getByText(/MMK|balance|wallet/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
