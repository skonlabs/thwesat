## Phase A — SQL only, single migration

Run all 19 schema changes in one migration file. **No code edits in this phase.** Pages that read removed tables/columns will throw runtime errors until Phase B; user has accepted this.

### Migration steps (in dependency order)

1. **Drop dependents first** so renames/drops don't fail on FK or view dependencies:
   - `DROP VIEW IF EXISTS public.v_user_directory`.
   - `DROP VIEW IF EXISTS public.employer_profiles_public`.
   - Drop RPCs that reference soon-to-be-removed objects: `approve_payment_request`, `reject_payment_request`, `create_payment_reversal`, any partner-finance recompute fns reading `payment_requests`/`payment_reversals`/`partner_quality_metrics`/`partners`.

2. **Rename `profiles` view → `v_profiles`**:
   - Drop existing INSTEAD-OF triggers on `profiles`.
   - `ALTER VIEW public.profiles RENAME TO v_profiles`.
   - Recreate INSTEAD-OF INSERT/UPDATE/DELETE triggers on `v_profiles` (same dispatch logic to role tables).
   - Re-apply GRANTs and column-level REVOKEs on `v_profiles` (`email`, `phone` revoked from `anon`, `authenticated`).

3. **Rename `cv_documents` → `user_documents`**:
   - `ALTER TABLE public.cv_documents RENAME TO user_documents`.
   - Backfill `file_type`: existing values mapped to `'Resume' | 'Cover' | 'Others'`.
   - Add CHECK: `file_type IN ('Resume','Cover','Others')`.

4. **`applications` table**:
   - `ALTER TABLE applications DROP COLUMN cover_letter` (text body discarded, per "run full Phase A anyway").
   - `ALTER TABLE applications ADD COLUMN cover_letter_id uuid REFERENCES public.user_documents(id) ON DELETE SET NULL`.
   - `ALTER TABLE applications ADD COLUMN resume_id uuid REFERENCES public.user_documents(id) ON DELETE SET NULL`.

5. **Column drops** (no rename collisions):
   - `wallet_transactions`: drop `note`, `metadata`.
   - `job_status_history`: drop `metadata`.
   - `application_status_history`: drop `metadata`.
   - `subscription_plans`: drop `is_unlimited_jobs`, `is_unlimited_unlocks`; rename `active_jobs_quota` → `job_postings_quota`.
   - `subscription_quotas`: drop `is_unlimited_jobs`, `is_unlimited_unlocks`; rename `active_jobs_quota` → `job_postings_quota` (keeps RPC behaviour aligned with plans).
   - `partner_monthly_statements`: drop the 26 listed columns. **Note:** dropping `created_at` and `status` will break any default `ORDER BY created_at` and pending/paid filtering; keeping rows as audit skeletons only.

6. **`topup_requests`**: `created_at` already exists (will verify and skip if so). Add `created_by uuid` defaulting to `user_id` for existing rows; FK to `auth.users(id)`.

7. **Table drops** (cascade FKs):
   - `scam_reports`
   - `payment_requests`, `payment_reversals`
   - `partner_quality_metrics`
   - `partners` (FKs in `partner_profiles`, `partner_attributions`, `partner_monthly_statements`, `partner_referral_codes` set null or dropped)
   - `agent_clients` (drop `jobs.agent_client_id` if present)
   - `addon_purchases`

8. **Update `approve_subscription_payment` RPC** so it stops inserting into `addon_purchases` (function would otherwise error on next subscription approval). Behaviour: only mutates `subscription_quotas` counters (`job_postings_quota`, `unlock_quota`, `featured_jobs_quota`, candidate matching flag, `profile_boosts`).

9. **Update `sync_job_quotas` / `tick_expire_subscriptions`** to reference `job_postings_quota` (rename only).

### What Phase A intentionally leaves broken

These pages will throw until Phase B (next turn): `AdminPayments`, `AdminFinance*`, `AdminPartnerFinance`, `PartnerFinanceHub`, `PartnerDashboard`, `AgentClients`, `Wallet` (addon history section), `Pricing` (unlimited flags), `EmployerJobs` (quota chip), `Applications` apply form (cover_letter free-text), all `from("profiles")` calls (~50 files), all `from("cv_documents")` calls. Signup, signin, and job posting will also break until `profiles` references are updated.

Reply **go** to run the migration.
