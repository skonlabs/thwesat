## Goal

Execute the automatable subset of `thwesat-test-cases.xlsx` against the live preview, then deliver:
1. `thwesat-test-results.xlsx` — original workbook + `Status`, `Actual Result`, `Notes` columns
2. `failures-only.md` — concise list of failed IDs with expected vs actual

## Credentials used

- Admin: `test@test.com` / `test@123`
- Agent: `another-agent3@test.com` / `Test@123`
- Job Seeker: `test-jobseeker@test.com` / `test@123`
- Mentor: `test-jobseeker@test.com` / `test@123` *(same as Job Seeker — assumes this account holds the mentor role; if it doesn't, Mentor tab marked "NOT RUN — account lacks mentor role")*
- Employer: `test-employer@test.com` / `test@123`
- Partner: `test-partner1@test.com` / `test@123`

## Scope (per "Automate what's feasible only")

**Will run automatically (Playwright against `https://id-preview--...lovable.app`):**
- Auth & Onboarding: login flows, role-based redirects, unverified-employer block, error messages
- Per-role: route reachability, dashboard renders, key UI elements present (buttons/links/labels), navigation between screens, list pages load, detail pages open, form field presence, modal/sheet open-close, filter chips, language toggle
- Money & Finance: read-only — MMK formatting on rendered values, wallet balance display, subscription chip, finance ledger renders, KPI cards, pricing page totals (yearly = monthly × 11)
- Dashboard Drilldowns: each numeric stat is a link, URL search-param deep links resolve, profile completion card
- Notifications & Messaging: pages render, unread counts, polling behavior (observed over 35s window)

**Marked SKIPPED with reason (not failures):**
- Anything requiring file upload (CV, payment proof, avatar, company logo)
- Destructive money actions (top-up approval, payment proof creation, subscription purchase, withdrawal, refund)
- Admin approvals that mutate other users (job approval, employer verification, payment approval) — read-only verification of queues only
- Flows requiring email verification round-trip, OTP, Telegram link
- Pure visual/design assertions ("looks correct", color values) beyond presence checks
- Anything explicitly written as "manual verify"

## Execution

1. Copy workbook → parse all 10 tabs with openpyxl → classify each row as `runnable` / `skipped` with reason
2. Generate Playwright specs per role, one `test()` per runnable case, tagged with test ID
3. Run sequentially (`workers: 1`) to avoid live-data races; auto-screenshot failures
4. Parse JSON reporter output → write back into copied workbook + build failures markdown
5. Inspect each failure screenshot before reporting — distinguish real bug vs selector drift vs missing fixture

## Deliverables (both to `/mnt/documents`)

- `thwesat-test-results.xlsx` — every row has `Status` ∈ {PASS, FAIL, SKIPPED, BLOCKED}, `Actual Result`, `Notes`
- `failures-only.md` — grouped by role, each entry: ID • Screen • Expected • Actual • screenshot path

Final chat reply will summarize: totals (pass/fail/skip), top failure clusters, and any product bugs surfaced (distinguished from automation limitations).

## Technical notes

- Reuses existing `e2e/_helpers.ts` login helper (already supports all 7 role keys)
- Sets `BASE_URL` + 6 role env vars before invoking `bunx playwright test`
- Run budget: ~15–25 min wall time depending on flake retries
- No app code changes, no migrations, no new deps (Playwright + openpyxl already present)
