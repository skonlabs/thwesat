## Goal
Find why "save / load" actions (top-ups, payments, bookings, etc.) silently fail across multiple roles and produce a single round of targeted fixes — instead of chasing one button at a time.

## What the signals tell us so far
- Auth log shows `bad_jwt: invalid claim: missing sub claim` on `GET /user` from `thwesat.com` — separate from the running preview session. Worth confirming this isn't a stale localStorage token issue on production after the recent `signOut` cleanup changes.
- Console shows only an unrelated Radix `DialogContent` aria warning.
- Recent migration `20260621033118` added `WITH CHECK` clauses that subquery the **same row being updated** on `applications`, `mentor_bookings`, and `jobs`:
  ```sql
  WITH CHECK (... AND applicant_id = (SELECT applicant_id FROM applications a WHERE a.id = applications.id))
  ```
  This pattern can fail or behave unexpectedly under RLS because the subquery itself is also RLS-filtered. Likely culprit for "update booking", "withdraw application", "edit job", "mark placed" failures.
- Same migration dropped six `Partners update …` policies — partner-side write actions for jobs/profiles/posts/contact messages will now 403.
- `20260621031717` did `REVOKE SELECT ON employer_profiles FROM anon` — public job detail / company pages that still read the base table (not the `_public` view) would break for logged-out visitors only.
- `20260620191130` introduced `mentor_create_booking_and_hold` and `placement_confirm_with_invoice` RPCs — if any call site is still hitting the old direct-insert path, or if grants/signatures don't match, mentor booking + placement confirmation fail.

## Investigation passes
I'll run these in order and report findings before changing anything.

### Pass A — Reproduce + capture exact errors per role
For each role (seeker, mentor, employer, agent, admin, partner), I'll log in with the test account, exercise the failing surfaces, and collect the precise PostgREST error code + message:
1. Seeker: top-up create, withdraw application, save job, book mentor, accept placement.
2. Mentor: accept/decline booking, mark complete, withdraw earnings, edit availability.
3. Employer: post job, edit job, change application status, mark placement, subscribe.
4. Agent: same as employer surfaces (shared screens, different labels).
5. Admin: approve top-up, approve/reject payment, change user role, moderate job/post.
6. Partner: view attributed payments, statements, monthly revenue share.

I'll capture failures from network panel + console, not just "didn't work".

### Pass B — Audit the suspect RLS / RPC changes
- Diff every policy and grant introduced or dropped between `20260620191130` and `20260621033118` against current call sites in `src/hooks/*` and `src/pages/*`.
- Verify each `WITH CHECK (... = (SELECT … FROM same_table))` clause actually permits a legitimate owner UPDATE by running the exact SQL the client sends as the affected user (via `supabase--read_query` with `SET LOCAL request.jwt.claim.sub`).
- Confirm grants exist on every table touched in the last 4 migrations (`employer_profiles`, `applications`, `jobs`, `mentor_bookings`, `payment_requests`, RPC EXECUTE grants).
- Run `supabase--linter` and inspect for new errors after the recent security tightening.

### Pass C — Audit triggers + RPCs
- Check that `mentor_create_booking_and_hold`, `placement_confirm_with_invoice`, `review_payment_request`, `wallet_spend` are all `EXECUTE`-grantable to `authenticated` and return the JSON shapes the hooks expect.
- Scan `pg_trigger` for triggers on touched tables that might now reference dropped columns or roles.

### Pass D — Frontend audit
- Find call sites that still write directly to tables that now require an RPC (mentor booking, placement confirm).
- Find call sites using `.single()` on rows the user may not be able to see (returns PGRST116 → looks like a failure).
- Verify role checks in nav + guards match the actual role of failing test accounts (the agent / partner roles use shared employer screens — RLS may not include them in newer policies).

### Pass E — Apply fixes in one migration + matching frontend edits
Group the SQL fixes into a single migration:
1. Replace fragile `WITH CHECK (col = (SELECT col FROM same_table …))` with column-equality based on `OLD.col` via a `BEFORE UPDATE` trigger, OR drop the ownership re-check (policy already gates by `auth.uid()`).
2. Re-add the necessary partner write policies (scoped to attributed users) if any partner UI legitimately needs them; otherwise hide the buttons in the frontend instead.
3. Restore any missing `GRANT EXECUTE` / `GRANT SELECT, INSERT, UPDATE, DELETE` on the audited tables.
4. Update frontend hooks to call the new RPCs (mentor booking, placement confirm) where they still do direct table writes.

Verify by re-running Pass A for every failing flow until each returns success and the relevant test in `src/test/` and `e2e/` is green.

## Open questions before I start
- Can you list 2–3 of the **specific buttons** that fail today (with the role) and, if possible, the red toast text or browser network response body? It will let me skip Pass A for those and go straight to the root cause.
- Are failures appearing only on the **published** site (`thwesat.com`), only in the **preview**, or both? The `bad_jwt` log row suggests at least the published site has a stale-session problem.
