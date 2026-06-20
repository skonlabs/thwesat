# Plan

## Scope reality check

A "full purge" of `wallets`, `wallet_transactions`, `topup_requests`, `credit_packages`, `action_prices` cannot be a single migration — those tables back the entire credit-spending UX, not just admin screens. They are referenced by:

- `/wallet` page (`Wallet.tsx`)
- `WalletChip` in headers everywhere
- `TopupSheet` (top-up flow)
- `SpendConfirmSheet` — used by **MentorBooking, CoverLetterGenerator, SkillGapAnalysis, CareerTracks, JobDetail, EmployerJobs, EmployerApplications, ProfileBuilder, AgentDashboard, EmployerDashboard**
- Hooks: `use-wallet.ts`, `use-jobs.ts` (priority-apply spend), `use-user-finance.ts`

If we drop the tables outright, every "spend N credits" button in the app throws. Subscription quotas (`subscription_quotas`) already exist but don't yet cover every spend point.

So I will do this in three phases — phase 1 ships now, phases 2 and 3 wait for your go-ahead.

## Task 1 — Wallet admin: name + email + click-through (ships now)

File: `src/pages/AdminWallet.tsx`

- For both Subscriptions and Top-ups tabs, fetch `profiles.display_name` + `get_user_contacts_admin` email for every `user_id` in the visible rows.
- Replace `user: {id.slice(0,8)}…` with `{display_name} · {email}`.
- Wrap each row's user block in a `Link` to `/admin/users/{id}` (existing admin user route — verified).
- Adjust mark-paid email path to keep using `user_id` (unchanged).

## Task 3 — Finance Hub data audit (ships now)

I'll review each tab against live DB rows and fix anything wrong. Known/likely findings to confirm and fix:

1. **Overview (`FinanceOverview.tsx`)** — re-verify all KPIs vs `subscription_payment_requests`, `payment_requests`, `mentor_earnings`, `partner_monthly_statements`. Current period filter is 30d; confirm queries respect it.
2. **Revenue & Payouts (`AdminFinance.tsx`)** —
   - `in.placement` row will be 0 (no placement payments in DB) — keep but label "(none yet)" if empty.
   - `in.session` reads `payment_requests.payment_type='mentor_session'` ✓ matches DB (10 approved).
   - Pending count merges `payment_requests.pending` + `subscription_payment_requests.pending` ✓.
   - Title of subscription/addon details uses `<Tier> Package` — verify lookup with `planLookup`.
3. **Payment Queue (`AdminPayments.tsx`)** — only shows `payment_requests`; `subscription_payment_requests` queue lives in `/admin/wallet`. Will merge subscription pending into the queue so admins have one place (or surface a tab — confirm preference if you want).
4. **Partner Rev-Share / Monthly Statement / Attributions / Payments & Overrides / Quality Gate / Reversals / Statement History** (`AdminPartnerFinance.tsx`) — DB has 1 attribution, 0 statements, 0 reversals, 0 quality metrics. Will:
   - Confirm preview computation (`usePartnerStatementPreview`) runs for current period even with 0 statements.
   - Verify Attributions tab lists the 1 row with user name/email instead of raw UUID.
   - Verify Quality Gate shows "no metrics yet" empty state instead of NaN.
   - Verify Statement History empty state.
   - Verify Reversals tab.
5. **Per-screen empty states** — replace blank tables with clear "no data yet" copy.

I will report exact deltas inline as I touch each tab; no business-logic change without surfacing it first.

## Task 2 — Legacy purge (PHASED, needs your go-ahead per phase)

### Phase 2A — UI removal + stop writing legacy data (safe, ready now)

- Delete top-up flow: remove `TopupSheet`, `Wallet` top-up section, "Top up wallet" CTAs in `SpendConfirmSheet`, `InviteFriendsCard` credit references.
- Remove legacy tabs from `AdminWallet` (`topups` tab) and `AdminFinance` (`in.topups` row, `topupsTotal`, the deferred-revenue paragraph).
- Remove `topup_requests` counts from `AdminDashboard` / `PartnerDashboard`.
- Make `SpendConfirmSheet` show a hard "subscription required" gate when the user has no quota — no credit fallback — and route to `/subscriptions` instead of `/wallet`.
- Hide `WalletChip` everywhere; replace with a subscription/quota chip.
- Hide `/wallet` route (redirect to `/subscriptions`).
- Database: **no destructive SQL yet**. Just stop writing.

### Phase 2B — DB purge (destructive, separate migration after 2A is green)

Migration (only after you confirm 2A is shipped and quotas cover every action):

```sql
DROP FUNCTION IF EXISTS public.wallet_topup_approve, public.wallet_topup_reject,
                        public.wallet_adjust, public.wallet_spend_credits CASCADE;
DROP TABLE IF EXISTS public.wallet_transactions, public.topup_requests,
                     public.action_prices, public.credit_packages, public.wallets CASCADE;
```

Plus removing every remaining code path that references those names (hooks, types, tests).

### Phase 2C — Cleanup

- Delete `use-wallet.ts`, `src/components/wallet/`, `src/pages/Wallet.tsx`, `src/pages/AdminWallet.tsx` (or repurpose AdminWallet to just be the subscription queue).
- Update tests: `src/test/wallet.test.ts`, `src/test/roles/job-seeker.test.ts`.

## What ships in this turn

Tasks **1** and **3** only. I will NOT touch the database or remove credit spending until you confirm: "go phase 2A" — that protects the 62 users currently holding ~7.6M Ks of credits while we wire up subscription quotas to cover the missing spend points.

## Technical details

- Admin user lookup: reuse `get_user_contacts_admin` RPC already used in `AdminPayments.tsx`.
- AdminWallet rows: keep current card layout; add `<Link to={\`/admin/users/${id}\`}>` on the user line.
- Empty-state component: reuse existing `FinanceLedger` `emptyText` prop where applicable.
