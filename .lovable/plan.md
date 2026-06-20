## Goal

Replace the monthly/yearly subscription model with a one-time **package purchase** model. Packages stack quotas permanently; two add-ons have a 1-year expiry; Featured Jobs and Candidate Unlocks become per-unit purchases with quantity selection. Same prices for Agents and Employers. Free Trial becomes a regular (free) requestable package.

## New pricing (MMK)

**Packages (one-time, never expire, stackable):**
| Package | Price | Active Jobs | Candidate Unlocks |
|---|---|---|---|
| Free Trial | 0 | 10 | 500 |
| Starter | 350,000 | 5 | 500 |
| Growth | 1,750,000 | 25 | 1,500 |
| Business | 5,000,000 | 100 | 10,000 |
| Enterprise | 10,000,000 | Unlimited | Unlimited |

Free Trial: one per user lifetime. Enterprise: marks quotas as unlimited (any active unlimited grant => unlimited for that user).

**Add-ons:**
- Candidate Unlocks — 1,000 MMK / unlock, user picks quantity (min 1)
- Featured Jobs — 10,000 MMK / job, user picks quantity (min 1)
- Agent Branding Page — 250,000 MMK, 1 year, Agents only
- Employer Branding Page — 250,000 MMK, 1 year, Employers only
- Candidate Matching Pack — 200,000 MMK, 1 year, both

## Behavior

1. No monthly/yearly cycles, no launch promo, no scheduled plans.
2. Users can buy any package any number of times → quotas sum into a single pooled balance, permanent.
3. Buy buttons stay enabled even when pending requests exist; show an info banner: "You have N package(s) awaiting approval. You can submit more."
4. On admin approval: add package's `active_jobs_quota` and `unlock_quota` to the user's pooled totals (or flip `is_unlimited_jobs` / `unlocks_unlimited` if Enterprise).
5. Add-on quantity: Unlock Pack and Featured Job get a number input; total = unit price × qty. On approval: increment pooled units (unlocks → unlocks_total; featured_jobs → featured_jobs_total).
6. 1-year add-ons (Matching, Branding) activate on approval; expire 1 year later via tick function.
7. Pricing page redesigned: package cards (no monthly/yearly toggle), add-on cards with qty steppers for unlock/featured.

## UI changes

- **Pricing.tsx**: remove cycle toggle, launch promo banner, scheduled/current-plan section. Show "Your totals" summary (Active Jobs: X, Candidate Unlocks: Y, plus active 1-year add-ons with expiry dates). Show pending-requests banner. Package cards have "Buy" button. Add-on cards: Unlocks/Featured show quantity stepper + computed total; Branding/Matching show 1-year note.
- **SubscribeSheet.tsx** → rename to **PurchaseSheet.tsx**: remove cycle/launch/active-sub messaging; for unlock/featured show qty; submit with computed total.
- **WalletChip**: keep "Packages" label.
- Remove "Subscribe" wording from buttons → "Buy".

## Backend changes

**Migration (schema + seed):**
- `subscription_plans`: drop `monthly_mmk`, `launch_mmk`; add `price_mmk` (one-time). Add tier `free_trial`. Reseed all 5 packages with unified prices. Drop unique constraint allowing duplicate purchases.
- `addon_products`: reseed — unlock pack & featured job become per-unit (mmk=unit price, unlock_amount=1 / 1 featured); add `is_per_unit boolean`. Branding/Matching keep duration_days=365.
- `subscriptions` table: repurpose as "package_grants" (or keep name) — drop `cycle`, `current_period_end`, `launch_*`, `auto_renew`, `scheduled` status. Each approved package = one row, status `active`, no expiry.
- `subscription_quotas`: keep pooled totals; add `unlocks_unlimited boolean`.
- `subscription_payment_requests`: drop `cycle`, `launch_price_applied`; add `quantity int default 1` for per-unit add-ons. Drop the unique pending-request index.
- `addon_purchases`: keep for 1-year add-ons; per-unit add-ons (unlocks/featured) instead bump quotas directly (no addon_purchases row needed) or store with expires_at=null.
- `launch_promo_config`: drop table (or leave inert + remove all references).
- **RPC `approve_subscription_payment`**: rewritten — on approval:
  - Package → insert subscriptions row; add quotas to `subscription_quotas` (sum), flip unlimited flags if Enterprise; enforce Free Trial once per user.
  - Per-unit addon (unlocks/featured) → add `quantity` to corresponding pooled total.
  - 1-year addon (branding/matching) → insert addon_purchases row with expires_at = now()+365d.
- **RPC `tick_expire_subscriptions`** → only expires 1-year add-ons now (no plan transitions).
- Data migration: convert existing active subscriptions to equivalent new-model rows (best-effort map by tier), wipe scheduled/pending launch data.

**Frontend hooks (`use-subscription.ts`):**
- Remove `BillingCycle`, `computePrice`, `useLaunchPromo`, `isLaunchActive`, `useMyScheduledSubscription`, `useMySubscription` (single active).
- Add `useMyPackageGrants()` (list), `useMyQuotaTotals()`, `useMyPendingRequests()` (count, not single).
- `useCreateSubscriptionPaymentRequest` accepts `quantity`.

## Files touched

- New migration (schema reset + reseed + RPC rewrite).
- `src/hooks/use-subscription.ts` — rewrite types/hooks.
- `src/pages/Pricing.tsx` — redesign.
- `src/components/pricing/SubscribeSheet.tsx` — rewrite as purchase sheet with qty.
- `src/components/WalletChip.tsx` — minor.
- Admin payment approval UI (`AdminPayments.tsx`) — show quantity column for per-unit add-ons.
- Any reads of `cycle` / `current_period_end` / `launch_price_applied` across the app — strip.

## Out of scope

- Job-seeker `profile_boost` — unchanged.
- Wallet top-ups, mentor bookings, placement fees — unchanged.
