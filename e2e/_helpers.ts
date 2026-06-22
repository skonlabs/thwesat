import { Page, expect, test as base } from "@playwright/test";

export type RoleKey = "seeker" | "employer" | "agent" | "mentor" | "admin" | "partner";

export function creds(role: RoleKey): { email: string; password: string } | null {
  const map: Record<RoleKey, [string, string]> = {
    seeker: ["E2E_SEEKER_EMAIL", "E2E_SEEKER_PASSWORD"],
    employer: ["E2E_EMPLOYER_EMAIL", "E2E_EMPLOYER_PASSWORD"],
    agent: ["E2E_AGENT_EMAIL", "E2E_AGENT_PASSWORD"],
    mentor: ["E2E_MENTOR_EMAIL", "E2E_MENTOR_PASSWORD"],
    admin: ["E2E_ADMIN_EMAIL", "E2E_ADMIN_PASSWORD"],
    partner: ["E2E_PARTNER_EMAIL", "E2E_PARTNER_PASSWORD"],
  };
  const [eKey, pKey] = map[role];
  const email = process.env[eKey];
  const password = process.env[pKey];
  if (!email || !password) return null;
  return { email, password };
}

export function requireCreds(role: RoleKey) {
  const c = creds(role);
  if (!c) base.skip(true, `Missing ${role} credentials (set E2E_${role.toUpperCase()}_EMAIL / _PASSWORD)`);
  return c!;
}

export async function login(page: Page, role: RoleKey) {
  const c = requireCreds(role);
  await page.goto("/login");
  await page.locator('input[type="email"], input[placeholder*="@"]').first().fill(c.email);
  await page.locator('input[type="password"]').first().fill(c.password);
  await page.getByRole("button", { name: /sign in|log in/i }).first().click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
}

export async function logout(page: Page) {
  // Best-effort. App clears storage and hard-reloads to /login.
  await page.goto("/settings").catch(() => {});
  const signOut = page.getByRole("button", { name: /sign out|log out/i });
  if (await signOut.count()) {
    await signOut.first().click();
    await page.waitForURL(/\/login/, { timeout: 15_000 }).catch(() => {});
  }
}

export async function expectVisibleSoon(page: Page, locator: string | RegExp, timeout = 10_000) {
  const target = typeof locator === "string" ? page.locator(locator) : page.getByText(locator);
  await expect(target.first()).toBeVisible({ timeout });
}
