# Migration 2b — Drop legacy `profiles` table

69 read sites + 6 write sites across 43 files reference `public.profiles`. A full rewire is high-risk for one turn. I'll take the pragmatic path: **convert `profiles` to a backward-compatible VIEW** so all existing reads keep working, and rewire only the 6 write sites to target role-specific tables directly.

## SQL migration

1. **Rename** `public.profiles` → `public._profiles_legacy` (preserved for one release as rollback insurance; will drop in a follow-up).
2. **Create view `public.profiles`** as `UNION ALL` over the 6 role tables (`jobseeker_profiles`, `employer_profiles`, `agent_profiles`, `mentor_profiles`, `partner_profiles`, `admin_profiles`) joined to `auth.users` for `email` / `phone`. Column set mirrors today's `profiles` shape (33 columns) — any column absent from a given role table is exposed as `NULL`.
3. **INSTEAD OF UPDATE trigger** on the view: dispatches the update to the correct role table based on the user's role from `user_roles`. Covers the 6 write sites without code changes (defense in depth; we'll still rewire the callers).
4. **GRANTs**: `SELECT` on the view to `anon, authenticated`; `UPDATE` to `authenticated`. Keep PII column-level revokes on `email`/`phone` for `anon` and `authenticated` (already in place on the legacy table — re-apply on the view).
5. **RLS**: views inherit RLS from underlying tables; no extra policies needed.

## Code rewire (write sites only)

Switch these 6 writes to the role-specific table:

- `src/hooks/use-auth.tsx:188` → infer role at signup, write to that role's table (already known at signup).
- `src/pages/EditProfile.tsx:503` → split by `effectiveRole`.
- `src/pages/Settings.tsx:194` (notification schedule) → `jobseeker_profiles` / `employer_profiles` etc. based on role.
- `src/pages/MentorPreferences.tsx:116` → `mentor_profiles`.
- `supabase/functions/match-candidates/index.ts:208` and `match-jobs/index.ts:139` (embedding writes) → `jobseeker_profiles`.

Read sites stay on `profiles` (the view) — zero behavioural change for them.

## What this does NOT do (deferred)

- Full rewire of the 43 read sites to role tables. The view keeps the API stable; rewiring is a cleanup, not a correctness fix.
- Dropping `_profiles_legacy`. Will drop in a follow-up after one stable release.

## Risks

- INSTEAD OF triggers add a small write overhead — negligible at this scale.
- View column types must match underlying tables exactly or PostgREST returns mismatched JSON. I'll cast to the legacy types in the view definition.
- `embedding` (vector) is only on `jobseeker_profiles` — view exposes it as `NULL` for other roles, which matches today's behaviour where only seekers had embeddings populated.

Reply **go** to run the SQL migration. Code rewire happens immediately after approval.
