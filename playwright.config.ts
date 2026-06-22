import { defineConfig, devices } from "@playwright/test";

/**
 * Standalone Playwright config. Live E2E against the published preview.
 * Override BASE_URL via env to hit a different environment.
 *
 * Credentials per role come from env vars:
 *   E2E_SEEKER_EMAIL / E2E_SEEKER_PASSWORD
 *   E2E_EMPLOYER_EMAIL / E2E_EMPLOYER_PASSWORD
 *   E2E_AGENT_EMAIL / E2E_AGENT_PASSWORD
 *   E2E_MENTOR_EMAIL / E2E_MENTOR_PASSWORD
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
 *   E2E_PARTNER_EMAIL / E2E_PARTNER_PASSWORD
 *
 * Tests that lack credentials are skipped (not failed) so partial runs work.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // sequential — same Supabase project, shared rows
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.BASE_URL || "https://id-preview--e19b133a-69c9-4f83-8a15-d2ef72a356a4.lovable.app",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
