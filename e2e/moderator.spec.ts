import { test, expect } from "@playwright/test";
import { login } from "./_helpers";

test.describe("Moderator", () => {
  test.beforeEach(async ({ page }) => { await login(page, "moderator"); });

  test("moderator dashboard renders", async ({ page }) => {
    await page.goto("/moderator");
    await expect(page.locator("body")).toBeVisible();
  });

  test("cannot reach admin-only finance hub", async ({ page }) => {
    await page.goto("/admin/finance");
    // Should be redirected to /dashboard by SystemRoleGuard
    await expect(page).not.toHaveURL(/\/admin\/finance/, { timeout: 10_000 });
  });
});
