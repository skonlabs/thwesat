import { test, expect } from "@playwright/test";
import { login } from "./_helpers";

test.describe("Mentor", () => {
  test.beforeEach(async ({ page }) => { await login(page, "mentor"); });

  test("mentor dashboard renders", async ({ page }) => {
    await page.goto("/mentors/dashboard");
    await expect(page.locator("body")).toBeVisible();
  });

  test("bookings page renders", async ({ page }) => {
    await page.goto("/mentors/bookings");
    await expect(page.locator("body")).toBeVisible();
  });

  test("mentees page renders", async ({ page }) => {
    await page.goto("/mentors/mentees");
    await expect(page.locator("body")).toBeVisible();
  });

  test("finance page renders", async ({ page }) => {
    await page.goto("/mentors/finance");
    await expect(page.locator("body")).toBeVisible();
  });
});
