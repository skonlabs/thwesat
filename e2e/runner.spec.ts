import { test, expect, Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import { login, RoleKey } from "./_helpers";

type Case = {
  tab: string;
  role: RoleKey | "guest" | null;
  id: string;
  row: number;
  route: string;
  expected: string;
  status: string;
  notes?: string;
};

const cases: Case[] = JSON.parse(fs.readFileSync("/tmp/cases.json", "utf8"));
const runnable = cases.filter((c) => c.status === "PENDING" && c.route);

// Group by role
const byRole = new Map<string, Case[]>();
for (const c of runnable) {
  const k = (c.role as string) || "guest";
  if (!byRole.has(k)) byRole.set(k, []);
  byRole.get(k)!.push(c);
}

const resultsPath = "/tmp/results.jsonl";
try { fs.unlinkSync(resultsPath); } catch {}

function record(id: string, status: "PASS" | "FAIL" | "SKIPPED" | "BLOCKED", actual: string, notes = "") {
  fs.appendFileSync(resultsPath, JSON.stringify({ id, status, actual, notes }) + "\n");
}

async function probe(page: Page, c: Case, role: string) {
  // Listen for console errors during navigation
  const consoleErrors: string[] = [];
  const onErr = (msg: any) => { if (msg.type() === "error") consoleErrors.push(String(msg.text()).slice(0, 200)); };
  page.on("console", onErr);
  try {
    const resp = await page.goto(c.route, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(900); // SPA settle
    const url = page.url();
    const httpStatus = resp?.status() ?? 0;
    // Error boundary detection
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const hasErrorBoundary = /something went wrong|application error|error boundary/i.test(bodyText);
    // Guard redirect — if guest case expected public, accept; if role case redirected to /login, fail
    const redirectedToLogin = /\/login(\?|$)/.test(url);
    const redirectedToHome = /\/home$|\/dashboard$|\/employer\/dashboard$|\/mentors\/dashboard$|\/partner$/.test(url);
    let status: "PASS" | "FAIL" = "PASS";
    const notes: string[] = [];
    if (httpStatus >= 500) { status = "FAIL"; notes.push(`HTTP ${httpStatus}`); }
    if (hasErrorBoundary) { status = "FAIL"; notes.push("Error boundary shown"); }
    if (role !== "guest" && redirectedToLogin) { status = "FAIL"; notes.push("Redirected to /login (session lost)"); }
    // For guest visiting protected, expect /login redirect — accept either
    if (role === "guest" && c.route !== "/" && redirectedToHome) {
      // unusual but ok
    }
    if (consoleErrors.length > 5) notes.push(`${consoleErrors.length} console errors`);
    record(c.id, status, `url=${url} http=${httpStatus} bodyLen=${bodyText.length}`, notes.join("; "));
    return status;
  } catch (e: any) {
    record(c.id, "FAIL", "", `Navigation error: ${String(e?.message || e).slice(0, 200)}`);
    return "FAIL";
  } finally {
    page.off("console", onErr);
  }
}

for (const [role, list] of byRole.entries()) {
  test.describe.serial(`Role: ${role} (${list.length} cases)`, () => {
    let page: Page;
    test.beforeAll(async ({ browser }) => {
      const ctx = await browser.newContext();
      page = await ctx.newPage();
      if (role !== "guest") {
        try {
          await login(page, role as RoleKey);
        } catch (e: any) {
          for (const c of list) record(c.id, "BLOCKED", "", `Login failed: ${String(e?.message || e).slice(0, 200)}`);
          throw e;
        }
      }
    });
    test.afterAll(async () => { await page?.context().close(); });

    for (const c of list) {
      test(`${c.id} ${c.route}`, async () => {
        const status = await probe(page, c, role);
        expect(["PASS"]).toContain(status);
      });
    }
  });
}
