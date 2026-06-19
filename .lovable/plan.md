
# Plan: Replace pricing model with Subscription Packages + Add-ons

## 1. What exists today

**Database**
- `action_prices` — per-action credit cost (e.g. `job_post`=50,000, `unlock_contact`=25,000, `featured_job`=10,000, `priority_application`, `profile_boost`, etc.)
- `credit_packages` — MMK → generic credits top-up packs (Starter/Popular/Value/Power) with bonus credits
- `wallets` — single `balance_credits` per user, plus lifetime stats
- `wallet_transactions` — credit ledger (topup, spend, refund…)
- `topup_requests` — manual MMK proof-upload flow → admin approves → credits added
- `feature_unlocks` — time-bound unlocks (featured jobs, profile boosts, etc.)
- `payment_requests` — generic payment proof (used for placement fee, mentor sessions)

**Pages / code**
- `src/pages/Wallet.tsx` — shows credit balance, top-up packages, transaction history
- `src/pages/AdminWallet.tsx` — admin review of `topup_requests`
- `src/pages/AdminDashboard.tsx` — manage `action_prices` and `credit_packages`
- `src/pages/EmployerPostJob.tsx` — spends credits via `SpendConfirmSheet` for job_post / featured_job
- `src/pages/MentorBooking.tsx`, `src/pages/CareerTracks.tsx` — spend credits
- `src/components/wallet/SpendConfirmSheet.tsx`, `src/components/profile/ProfileDashboardHero.tsx`, `DesktopNav.tsx`, `PageHeader.tsx` — show credit balance
- `src/hooks/use-wallet.ts` — wallet hook

**Memory rule (will change)**
- "No subscription/premium/Pro tier… Monetization = credits + placement_fee + mentor_session only" — will be replaced with a subscription rule.

---

## 2. What's new (target model)

### Subscription packages (per role)

**Recruiting Agents** (monthly MMK / launch first-3-months MMK / active jobs / candidate unlocks)
- Starter — 30,000 / Free / 10 / 300
- Growth — 100,000 / 50,000 / 50 / 1,500
- Business — 300,000 / 150,000 / 200 / 5,000
- Enterprise — 750,000 / 500,000 / Unlimited / 20,000

**Employers**
- Starter — 15,000 / Free / 5 / 100
- Growth — 50,000 / 25,000 / 20 / 500
- Business — 150,000 / 75,000 / 100 / 2,500
- Enterprise — 500,000 / 250,000 / Unlimited / 10,000

**Billing options on every package**
- Monthly
- Yearly = monthly × 11 (one month free)
- Launch promo: time-bound global window — anyone subscribing inside the window pays Launch price for first 3 months, then auto-rolls to standard. Window dates configurable in admin.

### Add-ons (same MMK for both roles, with role-specific extras)
- 100 Candidate Unlocks — 10,000
- 500 Candidate Unlocks — 40,000
- 1,000 Candidate Unlocks — 75,000
- Featured Job (30 days) — 15,000
- Candidate Matching Pack — 25,000 / month (recurring add-on, expires after 30 days)
- Employer Branding Page — 25,000 / month (employer-only, recurring add-on)

### Wallet (new shape)
Replace the "credit balance" with **quota counters per user**:
- Active subscription: package name, billing cycle (monthly/yearly), price paid, started_at, current period end, auto-renew status, on-launch-promo flag, promo ends_at
- Active Jobs: quota / used / remaining (Unlimited shown as ∞)
- Candidate Unlocks: total (subscription + add-on packs) / used / remaining
- Featured Jobs (30-day slots): total / used / remaining
- Candidate Matching Pack: Active until {date} | Expired
- Employer Branding Page (employer only): Active until {date} | Expired
- Purchase history (subscriptions + add-ons)

---

## 3. Pages affected

| Page | Change |
|---|---|
| `src/pages/Wallet.tsx` | Full rewrite: show current package, quotas, add-ons status, upgrade/downgrade buttons, add-on purchase, billing history. Remove credit balance & generic top-up packages. |
| `src/pages/AdminWallet.tsx` | Review subscription & add-on payment proofs (instead of credit top-ups). New columns: package, cycle, launch-price applied. |
| `src/pages/AdminDashboard.tsx` | New "Packages & Add-ons" config screen (edit prices, launch window, active flags). Remove `action_prices` / `credit_packages` editors. |
| `src/pages/EmployerPostJob.tsx` | Replace credit spend with **quota check**: blocks post if Active Jobs quota reached or no active subscription; "Make featured" consumes 1 Featured Job slot (or prompts buy add-on). |
| Job-post flow for Agents | Same quota logic on agent-side posting screens. |
| `src/pages/MentorBooking.tsx` | Decoupled from credits — mentor sessions become direct MMK payment via existing `payment_requests` (placement-fee-style). |
| `src/pages/CareerTracks.tsx` | Same: direct MMK payment, not credits. |
| Candidate unlock points (search results, applications, etc.) | Replace credit spend with **Candidate Unlock counter** decrement; block when 0 with "Buy unlocks" CTA. |
| `src/components/wallet/SpendConfirmSheet.tsx` | Replaced by `UseQuotaSheet` / `BuyAddOnSheet`. |
| `src/components/profile/ProfileDashboardHero.tsx`, `DesktopNav.tsx`, `PageHeader.tsx` | Replace "credits: N" chip with package name + unlocks-remaining badge. |
| `src/hooks/use-wallet.ts` | Rewrite to return `{ subscription, quotas, addOns }`. |
| New: `src/pages/Pricing.tsx` (public) | Role tabs (Agent / Employer), 4 package cards each, monthly/yearly toggle, launch-promo strip, add-ons section, CTA to subscribe. |
| Employer Branding Page (new) | Public page rendered when an employer has the active add-on; gated link from their profile. |
| Onboarding (Agent / Employer) | After signup, prompt "Pick a plan" → Pricing page. Starter (Free during launch) selectable instantly. |

---

## 4. Database changes (new schema)

**New tables**
- `subscription_plans(id, role, tier, monthly_mmk, launch_mmk, active_jobs_quota, unlock_quota, is_unlimited_jobs, sort_order, is_active)` — seeded with the 8 rows above.
- `addon_products(id, key, label, role_scope, mmk, kind ('unlock_pack'|'featured_job'|'matching'|'branding'), unlock_amount, duration_days, is_recurring, is_active)` — seeded with the 6 add-ons.
- `subscriptions(id, user_id, plan_id, cycle ('monthly'|'yearly'), started_at, current_period_end, status, launch_price_applied, launch_ends_at, auto_renew, cancelled_at)`
- `subscription_quotas(user_id PK, active_jobs_quota, active_jobs_used, unlocks_total, unlocks_used, featured_jobs_total, featured_jobs_used)` — denormalized counters (kept in sync by triggers / RPCs).
- `addon_purchases(id, user_id, addon_id, mmk_paid, starts_at, expires_at, units_total, units_used, status)`
- `subscription_payment_requests(id, user_id, plan_id, cycle, addon_id, mmk_amount, payment_method, proof_url, sender_reference, status, admin_note, reviewed_by, reviewed_at, …)` — same shape as `topup_requests`, replaces it for subscription flow.
- `launch_promo_config(id PK=1, starts_at, ends_at, is_active)` — single row, admin-edited.

**Deprecate (mark inactive, keep for history)**
- `credit_packages`, `action_prices`, `topup_requests`, `feature_unlocks`, `wallets.balance_credits`. Existing rows preserved; no new writes from the app.

All new tables get GRANTs + RLS (user reads own; service_role full; admins via `has_role`).

Triggers:
- On `subscriptions` insert (paid) → upsert `subscription_quotas` to plan values (additive for upgrades / reset on new period).
- On `jobs` insert/delete → bump `active_jobs_used` (skip when plan is_unlimited_jobs).
- On candidate unlock action → bump `unlocks_used` (fail if remaining ≤ 0).
- On featured_job add-on purchase → bump `featured_jobs_total`.

---

## 5. Flows

**Subscribe**
1. User picks package + cycle on Pricing page.
2. App computes price: launch window active → launch_mmk for first 3 months (then standard); yearly → monthly × 11.
3. Insert `subscription_payment_requests` (pending) + upload proof → existing manual review UX.
4. Admin approves in `AdminWallet` → creates `subscriptions`, sets `current_period_end` (+30 / +365 days), seeds `subscription_quotas`.

**Add-on purchase**
- Same proof-upload → admin-approve → applies (adds unlocks, or sets expiry for matching/branding/featured).

**Renewal**
- Manual: 7 days before `current_period_end`, notification + Wallet banner "Renew now". On approval of next payment, `current_period_end` extends and quotas reset (unlock add-on packs roll over their remaining balance separately).
- No automatic recurring charge (matches current manual payment infrastructure).

**Cancellation / downgrade**
- Stays active until `current_period_end`, then `status='expired'`; user falls back to no plan (jobs above new quota become hidden/closed — to confirm policy).

---

## 6. Memory updates
- Replace the "No subscription" core rule with: "Monetization = role-based subscription packages (Agent/Employer) with monthly/yearly billing + add-ons (unlock packs, featured job, candidate matching, employer branding). Mentor sessions and placement fees remain separate direct payments."
- Add `mem://features/subscription-pricing` with the full price table, launch logic, yearly = ×11, quota rules.

---

## 7. Out of scope (call out)
- Automatic recurring card billing (no gateway integration). All subscription payments use the existing manual proof-upload flow.
- Pro-rated upgrades mid-cycle: v1 will simply start the new plan immediately and extend `current_period_end` by one cycle from approval date — confirm if pro-rate is desired.
- Migration of existing credit balances → no automatic conversion. Existing users keep their `wallets.balance_credits` as historical record; UI hides it. Confirm if you want a one-time conversion (e.g. honour balance against future add-on purchases).

---

## 8. Implementation order
1. Migration: new tables, GRANTs, RLS, triggers, seed `subscription_plans` + `addon_products` + `launch_promo_config`.
2. `use-subscription` hook + replace `use-wallet`.
3. New `Pricing.tsx` page + route + nav entry.
4. Rewrite `Wallet.tsx` (quotas dashboard + purchase add-ons + history).
5. Update job posting / featured / unlock-contact flows to quota checks.
6. Switch mentor & career-track payments to direct MMK `payment_requests`.
7. Admin: package/add-on/launch-promo editor + new approval queue in `AdminWallet`.
8. Update header/profile chips. Update onboarding "pick a plan" step.
9. Update memory files.

Please confirm: (a) handling of existing `balance_credits` (drop vs convert), (b) downgrade behavior when active jobs exceed new quota, (c) whether mid-cycle upgrades should pro-rate.
