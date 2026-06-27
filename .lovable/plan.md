
# Architecture Refactor Plan

Executed as **3 sequential migrations** + **code rewire**. Each migration is independently reviewable. Code changes happen AFTER all migrations are approved so types regenerate cleanly.

---

## Migration 1 — Roles canonicalization & single-role enforcement

**Goal:** `user_roles` is the only place roles live. Six roles only: `job_seeker, agent, employer, partner, mentor, admin`. One role per user.

1. Rename `app_role` enum values: keep `job_seeker, agent, employer, partner, mentor, admin`. Drop `moderator`, `user`, `jobseeker` (after backfill).
2. Backfill: for every profile whose `primary_role` is set but has no `user_roles` row, insert one — mapping `jobseeker → job_seeker`, `administrator → admin`.
3. Add `UNIQUE(user_id)` on `user_roles` (was unique on `(user_id, role)`).
4. Update signup trigger to write a single `user_roles` row.
5. Drop `profiles.primary_role` column.
6. Rename `subscription_plans.role` → `plan_for_role` (plan attribute, not user role).
7. Rewrite every RLS policy / SECURITY DEFINER fn / view that reads `profiles.primary_role` to call `has_role(auth.uid(), '<role>')`.

## Migration 2 — Per-role profile split (drop shared `profiles`)

**Goal:** Each role has its own profile table. No shared `profiles` table. FKs that pointed at `profiles.id` get re-pointed at `auth.users.id`.

1. Create `jobseeker_profiles`, `agent_profiles`, `partner_profiles`, `admin_profiles`. Keep existing `mentor_profiles`, `employer_profiles` (they already exist).
2. Each role table: `user_id uuid PK references auth.users(id)`, `full_name`, `avatar_url`, `created_at`, `updated_at`, plus role-specific columns migrated from current `profiles` (CV link → jobseeker, etc.).
3. Backfill each role table from current `profiles` joined to `user_roles`.
4. Re-point FKs (jobs.posted_by, applications.user_id, messages.sender_id, etc.) to `auth.users(id)`.
5. Drop `profiles_public` view.
6. Drop `profiles` table.
7. New helper view `v_user_directory` (id, full_name, avatar_url, role) — UNION over the six role tables — for places that need cross-role display (chat headers, notifications).
8. Grants + RLS on every new table: self read/write; cross-user read scoped by feature need (e.g. employer can read jobseeker public fields when there's an application).

## Migration 3 — Table consolidation

1. **Drop** `delegate_tokens` (delete Panic delegate-access feature).
2. **Drop** `partners` table — partner-specific fields move into `partner_profiles`.
3. **Drop** `ai_rate_limits`.
4. **Drop** `partner_tier_approvals`.
5. **Drop** `partner_statement_revisions`.
6. **Strip** `partner_monthly_statements` to `id, partner_id, period_month, period_year, created_by, created_at`. Drop the ~30 computed columns. Admin finance UI recomputes on-read from `partner_attributions` + `wallet_transactions`.
7. **Create** `wallet_transaction_requests` with shape:
   `id, user_id, request_type (topup|subscription|addon|reversal), amount, currency, reference_id, reference_type, proof_url, payment_method, status (pending|approved|rejected), reviewed_by, reviewed_at, rejection_reason, metadata jsonb, created_at, updated_at`.
   On `approve` → write `wallet_transactions` ledger row + execute side-effect (activate sub, grant addon, reverse txn).
8. **Backfill** `wallet_transaction_requests` from `topup_requests`, `subscription_payment_requests`, `payment_requests`, `payment_reversals`.
9. **Drop** `topup_requests`, `subscription_payment_requests`, `payment_requests`, `payment_reversals`.
10. **Rename** view `v_active_unlocks` → `active_feature_unlocks`.

## Code rewire (after migrations land)

- Remove switch-role UI entirely: delete role-switcher component, `switch_role` RPC calls, role-switching routes. `useUserRoles` returns single role.
- Replace every `profile.primary_role` read with `useUserRoles().role`.
- Replace every `profile.email/phone` read with `user.email/user.phone` from `useAuth()`.
- Split `useProfile` into `useJobseekerProfile`, `useEmployerProfile`, etc. Route components fetch their own role's profile.
- Rewrite payment flows (`TopUp.tsx`, `Pricing.tsx`, `Checkout` sheets, admin payment review screens) to use `wallet_transaction_requests`.
- Rewrite admin Partner Finance dashboard to recompute monthly numbers on-read.
- Delete delegate-access screens/components, AI rate-limit guards, partner tier-approval admin screen, statement-revisions UI.
- Update `match-candidates` edge function & any other fn referencing dropped tables.
- Verify with Playwright: signup (each role), login, post job, apply, chat, top up, buy subscription, buy addon, admin approve payment, partner statement view.

## Out of scope

- Multi-role-per-user UX (explicitly forbidden by #3).
- Touching `auth.users`, storage buckets, or realtime config.
- Renaming `app_role` type itself (only enum values change).

## Risk callouts

- **Drop `profiles` is destructive** — every FK across the schema repoints. Some indexes will need to be re-created. Estimated 60-80 line changes per migration file.
- **Stripping `partner_monthly_statements`** loses historical snapshots. If you ever change revenue-share rules later, old statements will recompute with new rules. Accept?
- **Dropping `ai_rate_limits`** means a single user can spam CV-parse / match-candidates / cover-letter and burn OpenAI budget. No mitigation unless we add gateway-level limits later.
- **Dropping `delegate_tokens`** removes the Panic feature documented in `mem://features/safety-and-security`. Memory file will need updating.

Reply **"go"** to start with Migration 1. I'll wait for the Supabase approval prompt on each migration before moving to the next.
