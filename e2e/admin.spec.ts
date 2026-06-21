import { test, expect } from "@playwright/test";
import { login } from "./_helpers";

test.describe("Admin", () => {
  test.beforeEach(async ({ page }) => { await login(page, "admin"); });

  test("admin dashboard renders", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator("body")).toBeVisible();
  });

  test("finance hub loads all tabs", async ({ page }) => {
    for (const tab of ["overview", "revenue", "queue", "partners", "settings"]) {
      await page.goto(`/admin/finance?tab=${tab}`);
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("users page renders", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page.locator("body")).toBeVisible();
  });

  test("job queue renders", async ({ page }) => {
    await page.goto("/admin/jobs");
    await expect(page.locator("body")).toBeVisible();
  });

  test("partners page renders", async ({ page }) => {
    await page.goto("/admin/partners");
    await expect(page.locator("body")).toBeVisible();
  });

  test("analytics renders", async ({ page }) => {
    await page.goto("/admin/analytics");
    await expect(page.locator("body")).toBeVisible();
  });
});
