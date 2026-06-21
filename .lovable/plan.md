
## 1. Unified "Employers/Recruiters Approvals"

Reuse existing `employer_profiles` for agents (already pre-seeded at signup). One queue, one schema, one flow — mirrors employer verification exactly.

**Backend (migration)**
- Backfill: for every `profiles.primary_role = 'agent'` user without a row in `employer_profiles`, insert one with `verification_status = 'pending'`. Defensive — covers agents created before signup pre-seed.
- Trigger `ensure_employer_profile_on_role`: after `profiles` insert/update, if `primary_role IN ('employer','agent')` and no `employer_profiles` row exists → insert pending row.
- No schema change to `employer_profiles` itself — `verification_status` already exists.

**Frontend gates (mirror employer)**
- Agents must already be blocked the same way employers are. Confirm + harden:
  - `AgentDashboard` already shows the "complete profile" banner when `!is_verified`. Change to a stronger "Pending approval" banner that distinguishes *needs profile data* vs *waiting on admin review*.
  - Gate `post-job`, `search-talent`, `unlock candidate`, `start conversation` for agents on `verification_status === 'verified'` (same checks as employer paths already use).

**Admin/Partner UI**
- Rename labels on `AdminDashboard` + `PartnerDashboard`: `Employer Verifications` → `Employers/Recruiters Approvals` (and Burmese: `အလုပ်ရှင်/ခေါ်ယူရေး အတည်ပြုရန်`).
- Rename `AdminEmployers` page header: `Employer Management` → `Employers & Recruiters`.
- Add a Role badge column (Employer / Recruiter) derived from joined `profiles.primary_role`.
- Add a role filter chip row (All / Employers / Recruiters) alongside the existing status tabs.
- Search/cards stay the same.

## 2. Partner referral tagging — verification pass

`Signup.tsx` already calls `lookup_partner_referral_code` → `redeem_partner_referral_code` after `signUp`. Risks to fix:
- If email confirmation is required, `getUser()` returns null right after `signUp` → the partner attribution is silently skipped. **Fix:** use the user id returned by `signUp` (already in `data.user`) instead of a second `getUser()` round-trip; if still null, fall back to a deferred enqueue (write the code into a one-row `pending_referral_redemptions` table keyed by email, drained by an auth trigger on first session). Simpler alternative: extend `redeem_partner_referral_code` so it can be re-applied idempotently the first time the user authenticates (lookup user by email + code). I'll go with the latter — single migration, no new table.
- Add Vitest covering: employer signup with partner code → `partner_attributions` row present; agent signup with partner code → row present; invalid code → user still created, no row.

## 3. Admin/Partner Users list — show email + Message

`/admin/users` (also served at `/partner/users`):
- Email is already fetched via `get_user_contacts_admin`. Currently shown inline in the row. Add a copy-to-clipboard button next to it for desktop.
- Add a `Message` icon-button on each row (admin + partner only). Click → calls existing `useStartConversation` and navigates to `/messages/:id`. Hidden for any non-admin/non-partner viewer (page is already system-role-gated, so this is just adding the action).

## 4. Tests / verification

- `e2e/agent.spec.ts`: assert pending agent cannot reach `/agent/post-job` (redirected to onboarding/pending banner).
- Manual sanity in preview: sign up agent with partner referral code → verify (a) row appears in admin approvals with Recruiter badge, (b) `partner_attributions` row exists, (c) blocked from posting until approved, (d) notification fired on approve/reject.

## Files touched

```text
supabase/migrations/<new>.sql          backfill + ensure-row trigger + idempotent partner redeem
src/pages/AdminDashboard.tsx           rename label
src/pages/PartnerDashboard.tsx         rename label
src/pages/AdminEmployers.tsx           role badge, role filter, page title
src/pages/AdminUsers.tsx               email copy + Message action
src/pages/AgentDashboard.tsx           pending-approval banner
src/pages/Signup.tsx                   use signUp().data.user.id; surface failure
src/hooks/use-employer-data.ts         (only if needed) expose verification_status cleanly
e2e/agent.spec.ts                      pending-agent gate test
src/test/partner-finance-rpc.test.tsx  partner-attribution-on-signup test (or new file)
```

No new tables, no changes to RLS beyond the backfill migration.
