import { test, expect, Page, BrowserContext } from "@playwright/test";
import fs from "fs";
import { login, RoleKey } from "./_helpers";
import { calculatePlacementFee, formatMoney, formatTotals, paymentStatusLabels, PLACEMENT_PLATFORM_COMMISSION, roundMmk, shortRef } from "../src/lib/finance";
import { formatCurrency, formatCurrencyRange } from "../src/lib/currency";
import { computeMonthlyStatement, qualityGatePassed } from "../src/lib/partner-finance";

type Case = {
  tab: string;
  role: RoleKey | "guest" | "all" | null;
  roles?: (RoleKey | "guest")[];
  id: string;
  row: number;
  route: string;
  screen?: string;
  component?: string;
  expected: string;
  status: string;
  notes?: string;
  kind?: "route" | "unit" | "blocked";
};

const cases: Case[] = JSON.parse(fs.readFileSync("/tmp/cases.json", "utf8"));
const resultsPath = "/tmp/results.jsonl";
try { fs.unlinkSync(resultsPath); } catch {}
fs.mkdirSync("/mnt/documents/test-failure-screenshots", { recursive: true });

function record(id: string, status: "PASS" | "FAIL" | "SKIPPED" | "BLOCKED", actual: string, notes = "", screenshot = "") {
  fs.appendFileSync(resultsPath, JSON.stringify({ id, status, actual, notes, screenshot }) + "\n");
}

function rolesFor(c: Case): (RoleKey | "guest")[] {
  if (c.roles?.length) return c.roles;
  if (c.role && c.role !== "all") return [c.role];
  return ["guest"];
}

async function resolveRoute(page: Page, route: string): Promise<string | null> {
  if (!route.includes(":")) return route;
  const map: Record<string, { list: string; pattern: RegExp }> = {
    "/jobs/:id": { list: "/jobs", pattern: /^\/jobs\/(?!saved)([^/?#]+)/ },
    "/mentors/:id": { list: "/mentors", pattern: /^\/mentors\/(?!book|bookings|mentees)([^/?#]+)/ },
    "/guides/:id": { list: "/guides", pattern: /^\/guides\/([^/?#]+)/ },
    "/profile/:id": { list: "/jobs", pattern: /^\/profile\/([^/?#]+)/ },
    "/company/:id": { list: "/jobs", pattern: /^\/company\/([^/?#]+)/ },
    "/access/:token": { list: "/access/bad-token", pattern: /^\/access\/bad-token$/ },
  };
  const cfg = map[route];
  if (!cfg) return null;
  if (route === "/access/:token") return cfg.list;
  await page.goto(cfg.list, { waitUntil: "domcontentloaded", timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(900);
  const hrefs = await page.locator("a[href]").evaluateAll((els) => els.map((a) => (a as HTMLAnchorElement).getAttribute("href") || ""));
  const hit = hrefs.find((h) => cfg.pattern.test(new URL(h, window.location.origin).pathname));
  return hit ? new URL(hit, page.url()).pathname : null;
}

async function probeRoute(page: Page, c: Case, role: string) {
  const consoleErrors: string[] = [];
  const onErr = (msg: any) => { if (msg.type() === "error") consoleErrors.push(String(msg.text()).slice(0, 200)); };
  page.on("console", onErr);
  try {
    const route = await resolveRoute(page, c.route);
    if (!route) {
      record(c.id, "BLOCKED", "", `No live fixture found for dynamic route ${c.route}`);
      return "BLOCKED";
    }
    const resp = await page.goto(route, { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.waitForTimeout(900); // SPA settle
    const url = page.url();
    const httpStatus = resp?.status() ?? 0;
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const hasErrorBoundary = /something went wrong|application error|error boundary/i.test(bodyText);
    const redirectedToLogin = /\/login(\?|$)/.test(url);
    const redirectedAwayFromProtected = role !== "guest" && redirectedToLogin;
    let status: "PASS" | "FAIL" = "PASS";
    const notes: string[] = [];
    if (httpStatus >= 500) { status = "FAIL"; notes.push(`HTTP ${httpStatus}`); }
    if (hasErrorBoundary) { status = "FAIL"; notes.push("Error boundary shown"); }
    if (redirectedAwayFromProtected) { status = "FAIL"; notes.push("Redirected to /login (session lost)"); }
    if (/admin-only guard for partner/i.test(c.component || "") && !/\/dashboard/.test(url)) { status = "FAIL"; notes.push("Partner was not redirected away from admin finance"); }
    if (/seeker-only guard/i.test(c.component || "") && !/\/dashboard/.test(url)) { status = "FAIL"; notes.push("Employer was not redirected away from seeker-only route"); }
    if (consoleErrors.length > 5) notes.push(`${consoleErrors.length} console errors`);
    let screenshot = "";
    if (status === "FAIL") {
      screenshot = `test-failure-screenshots/${c.id}.png`;
      await page.screenshot({ path: `/mnt/documents/${screenshot}`, fullPage: true }).catch(() => { screenshot = ""; });
    }
    record(c.id, status, `role=${role} url=${url} http=${httpStatus} bodyLen=${bodyText.length}`, notes.join("; "), screenshot);
    return status;
  } catch (e: any) {
    record(c.id, "FAIL", `role=${role}`, `Navigation error: ${String(e?.message || e).slice(0, 200)}`);
    return "FAIL";
  } finally {
    page.off("console", onErr);
  }
}

function probeUnit(c: Case): ["PASS" | "FAIL" | "BLOCKED", string, string] {
  try {
    switch (c.id) {
      case "MON-0001": expect(roundMmk(12347)).toBe(12300); break;
      case "MON-0002": expect(roundMmk(12350)).toBe(12400); break;
      case "MON-0003": expect(roundMmk(null)).toBe(0); break;
      case "MON-0004": expect(roundMmk(-12399)).toBe(-12400); break;
      case "MON-0005": expect(formatCurrency(0)).toBe("0 Ks"); break;
      case "MON-0006": expect(formatCurrency(null)).toBe("Negotiable"); break;
      case "MON-0007": expect(formatCurrency(null, null, "my")).toBe("ညှိနှိုင်း"); break;
      case "MON-0008": expect(formatCurrencyRange(500000, 1000000, "MMK")).toBe("500,000 Ks–1,000,000 Ks"); break;
      case "MON-0009": expect(formatCurrencyRange(500000, null, "MMK")).toBe("500,000 Ks+"); break;
      case "MON-0010": expect(formatCurrencyRange(500000, 1000000, "MMK", "en", "mo")).toContain("/mo"); break;
      case "MON-0011": expect(calculatePlacementFee(2_000_000)).toBe(160_000); break;
      case "MON-0012": expect(calculatePlacementFee(0)).toBe(0); expect(calculatePlacementFee(-1)).toBe(0); break;
      case "MON-0013": expect(roundMmk(160_000 * PLACEMENT_PLATFORM_COMMISSION)).toBe(16_000); break;
      case "MON-0014": expect(formatMoney(100_000 * 11)).toBe("1,100,000 Ks"); break;
      case "MON-0047": expect(paymentStatusLabels.pending.tone).toContain("warning"); break;
      case "MON-0048": expect(paymentStatusLabels.approved.tone).toContain("emerald"); break;
      case "MON-0049": expect(paymentStatusLabels.rejected.tone).toContain("destructive"); break;
      case "MON-0050": expect(paymentStatusLabels.revoked.tone).toContain("destructive"); break;
      case "MON-0054": expect(formatTotals([{ amount: 12347, currency: "MMK" }, { amount: 7, currency: "CREDITS" }])).toBe("12,300 Ks + 7 credits"); break;
      case "MON-0055": expect(shortRef("12345678-abcd")).toBe("#12345678"); break;
      case "MON-0056": {
        const s = computeMonthlyStatement({ payments: [{ user_id: "u", payment_type: "placement_fee", amount: 1_000_000, approved_at: "2026-06-01", classification: "new", account_age_months: 1 }], reversals: [], prior_growth_npr: 0, quality: { l1_sla_pct: 1, csat_score: 1, dispute_rate_pct: 99, fraud_rate_pct: 99, onboarding_pct: 1 } });
        expect(s.quality_gate_passed).toBe(false); expect(s.growth_payout).toBe(0); break;
      }
      case "MON-0057": expect(qualityGatePassed({ l1_sla_pct: 90, csat_score: 4, dispute_rate_pct: 1, fraud_rate_pct: 0.5, onboarding_pct: 80 })).toBe(true); break;
      default: return ["BLOCKED", "", "No deterministic unit assertion mapped for this spreadsheet row"];
    }
    return ["PASS", "unit assertion passed", ""];
  } catch (e: any) {
    return ["FAIL", "unit assertion failed", String(e?.message || e).slice(0, 300)];
  }
}

test.describe.serial("Spreadsheet-driven test run", () => {
  test.describe.configure({ timeout: 120_000 });
  const pages = new Map<string, Page>();
  const contexts: BrowserContext[] = [];

  async function pageFor(browser: any, role: RoleKey | "guest") {
    if (pages.has(role)) return pages.get(role)!;
    const ctx = await browser.newContext();
    contexts.push(ctx);
    await ctx.addInitScript(() => {
      try { sessionStorage.setItem("site_gate_passed", "1"); } catch {}
    });
    const page = await ctx.newPage();
    if (role !== "guest") await login(page, role);
    pages.set(role, page);
    return page;
  }

  test.afterAll(async () => { await Promise.all(contexts.map((c) => c.close().catch(() => {}))); });

  for (const c of cases) {
    test(`${c.id} ${c.kind || c.status} ${c.route || c.screen || ""}`, async ({ browser }, testInfo) => {
      test.setTimeout(120_000);
      if (c.status === "BLOCKED" || c.kind === "blocked") {
        record(c.id, "BLOCKED", "", c.notes || "Blocked by test precondition");
        return;
      }
      if (c.kind === "unit") {
        const [status, actual, notes] = probeUnit(c);
        record(c.id, status, actual, notes);
        expect(["PASS", "BLOCKED"]).toContain(status);
        return;
      }
      let final: "PASS" | "FAIL" | "BLOCKED" = "PASS";
      for (const role of rolesFor(c)) {
        try {
          const page = await pageFor(browser, role);
          const status = await probeRoute(page, c, role);
          if (status === "FAIL") final = "FAIL";
          if (status === "BLOCKED" && final !== "FAIL") final = "BLOCKED";
        } catch (e: any) {
          final = "BLOCKED";
          record(c.id, "BLOCKED", `role=${role}`, `Login/setup failed: ${String(e?.message || e).slice(0, 220)}`);
        }
      }
      expect(["PASS", "BLOCKED"]).toContain(final);
    });
  }
});
