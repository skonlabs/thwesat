# Test Case Workbook Generation Plan

Produce a single Excel file `test-cases.xlsx` containing one tab per role plus cross-cutting tabs, with one row per atomic test case covering every screen, button, icon, and money-related action discovered in the codebase.

## Deliverable

`/mnt/documents/thwesat-test-cases.xlsx` — downloadable from chat.

## Workbook structure (tabs)

1. **README** — legend, columns, how to use, scope statement (excludes performance & security per request).
2. **Auth & Onboarding** — shared signup/login/forgot/reset/email-confirm/role-gate/site-gate/delegate-access flows (apply to all roles).
3. **Job Seeker** — Dashboard, Jobs, JobDetail, SavedJobs, Applications, Mentors browse, MentorDetail, MentorBooking, Guides, GuideDetail, Community, Messages, ChatView, Notifications, Profile, EditProfile, AI Tools (Profile Builder, Cover Letter, Skill Gap), Wallet, SeekerFinance, PaymentHistory, BecomeMentor, Settings.
4. **Employer** — EmployerDashboard, EmployerOnboarding, PostJob, EditJob, EmployerJobs (list + actions), EmployerApplications (incl. placement modal), SearchTalent, EditCompany, CompanyProfile, EmployerFinance, Pricing/SubscribeSheet, PaymentMethod sheets, Notifications, Messages.
5. **Recruiting Agent** — AgentDashboard, AgentClients (CRUD), PostJob (as agent), Jobs, Candidates, SearchTalent, Agent Profile, AgentFinance, Pricing/Subscribe, vocabulary swap (Client/Candidate/Listing), Messages, Notifications.
6. **Mentor** — MentorDashboard, MentorBookings, MentorMentees, AvailabilityManager, MentorPreferences, MentorFinance, Wallet, Public mentor profile, booking accept/reject flows, Messages.
7. **Admin** — AdminDashboard, AdminUsers (incl. role toggles, status), AdminEmployers (approve/reject + auto-email-confirm), AdminJobQueue, AdminPayments (legacy redirect → finance queue), AdminFinanceHub (Overview/Queue/Subscriptions/Partners/Legacy tabs), AdminPartnerFinance, AdminPartners, AdminAnalytics, AdminWallet, ModeratorDashboard view, AdminEditGuide, Edit Job as admin, Moderation queue actions.
8. **Moderator** — ModeratorDashboard, job/post approvals, blocked-from-admin-finance enforcement.
9. **Partner** — PartnerDashboard, PartnerReferrals (P-XXXXXXXX generation, usage marking, one-time enforcement), PartnerFinanceHub (Attributions/Referrals tabs), partner-scoped Users/Jobs/Employers/Analytics mirrors, partner wallet, blocked-from-admin-only routes.
10. **Money & Finance (cross-role)** — every monetary path end-to-end: MMK rounding (100 Ks), formatCurrency, placement fee 8% + 10% platform commission, mentor session payments, wallet top-ups, subscription monthly/yearly (yearly = monthly × 11), add-on packs, manual payment proof upload → admin approve/reject → user notification, payment status badges, partner revenue share, finance ledger totals per currency, KPI counts on each role's dashboard, agent placement modal math, MMK display formatting in every list/card, refund/revoke flows.
11. **Dashboard Drilldowns (cross-role)** — every numeric stat on every dashboard, URL search-param deep links, role-aware vocabulary, profile completion logic, scam-alert dismissal, subscription chip, wallet chip visibility rules.
12. **Notifications & Messaging (cross-role)** — 30s polling, unread counts, deep links, client-side UUIDs, RLS bypass paths.

## Row schema (columns) for every test tab

`ID | Area | Screen / Route | Component / Element | Precondition | Steps | Test Data | Expected Result | Type (UI/Functional/Money/Negative) | Priority (P0/P1/P2) | Automation Hint (selector / RPC / table)`

IDs are role-prefixed and zero-padded (e.g. `JS-0042`, `EMP-0117`, `MON-0058`) so failures route to owners instantly.

## Coverage methodology (to guarantee nothing is missed)

For each role tab, generation walks three sources in order:
1. **Routes** from `src/App.tsx` filtered by `AppRoleGuard` / `SystemRoleGuard` for that role.
2. **Page file** for each route: enumerate every `<Button>`, icon button, link, form field, modal, bottom sheet, tab, filter, and toast trigger → one UI test + one functional test minimum per interactive element.
3. **Hooks/RPCs** the page calls (`use-*.ts`) → one happy-path + one negative test per mutation; one empty-state + one populated-state test per query.

Money tab additionally walks `src/lib/finance.ts`, `src/lib/currency.ts`, `use-user-finance.ts`, `use-wallet.ts`, `use-subscription.ts`, `use-payment.ts`, `use-partner-finance.ts`, all `payment_requests` / `subscription_payment_requests` / `topup_requests` flows, and every admin approval RPC.

Expected volume: ~700–1000 rows total (Auth ~60, Seeker ~180, Employer ~150, Agent ~110, Mentor ~110, Admin ~180, Moderator ~30, Partner ~70, Money ~120, Dashboards ~60, Notif/Msg ~40).

## Formatting

- Frozen header row, bold navy header (`#1B1740`) with gold (`#FFBE5C`) underline matching brand.
- Column widths tuned (Steps 60, Expected 50, others auto).
- Wrap text on Steps/Expected.
- Priority cells color-coded (P0 red, P1 amber, P2 grey).
- Type cells color-coded (Money gold, Negative light-red).
- Autofilter on header row of every test tab.

## Out of scope (per request)

- No performance/load tests.
- No security/penetration tests (RLS, XSS, CSRF, auth-bypass, rate-limiting).
- No infra, deploy, or migration tests.

## Technical implementation

Single Python script using `openpyxl`:
1. Define role → list-of-test-case-dicts in code, generated from the route+component walk above.
2. Build workbook, apply styles, autofilter, freeze panes.
3. Save to `/mnt/documents/thwesat-test-cases.xlsx`.
4. Print row counts per tab as verification.

No app code changes. No migrations. No new dependencies beyond `openpyxl` (already used by xlsx skill).
