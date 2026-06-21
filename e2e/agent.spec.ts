import { test, expect } from "@playwright/test";
import { login } from "./_helpers";

test.describe("Agent", () => {
  test.beforeEach(async ({ page }) => { await login(page, "agent"); });

  test("agent dashboard renders", async ({ page }) => {
    await page.goto("/employer/dashboard");
    await expect(page.locator("body")).toBeVisible();
  });

  test("clients page renders", async ({ page }) => {
    await page.goto("/agent/clients");
    await expect(page.locator("body")).toBeVisible();
  });
});
