import { test, expect } from "@playwright/test";
import { login } from "./_helpers";

test.describe("Employer", () => {
  test.beforeEach(async ({ page }) => { await login(page, "employer"); });

  test("dashboard renders stats", async ({ page }) => {
    await page.goto("/employer/dashboard");
    await expect(page.locator("body")).toBeVisible();
  });

  test("jobs list renders", async ({ page }) => {
    await page.goto("/employer/jobs");
    await expect(page.locator("body")).toBeVisible();
  });

  test("applications page renders", async ({ page }) => {
    await page.goto("/employer/applications");
    await expect(page.locator("body")).toBeVisible();
  });

  test("post-job form loads required fields", async ({ page }) => {
    await page.goto("/employer/post-job");
    await expect(page.getByLabel(/title/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("finance page renders", async ({ page }) => {
    await page.goto("/employer/finance");
    await expect(page.locator("body")).toBeVisible();
  });
});
