# ThweSat — Full Mutation & UX Audit (Phase 0)

**Scope:** Every add / update / delete / approve / reject / status-change flow, plus
every screen for Job Seeker, Employer, Agent, Mentor.
**Method:** Code read of `src/hooks/use-*.ts`, `src/pages/*`, RPC definitions in DB,
RLS policies, and triggers. **No code changed in this phase.**

Tags
- **P0** — Data loss, security, broken flow, money/credit risk. Fix immediately.
- **P1** — UX confusion, partial failures, missing confirmations, missing audit. Fix soon.
- **P2** — Polish, copy, micro-interactions.

Each item includes the file/line and a one-line fix direction.

---

## A. MUTATIONS — Jobs & Applications

### A1. Orphaned applications when a job is deleted [P0, data integrity]
- `applications.job_id` has **no FK** to `jobs.id` (per schema dump → "No foreign keys for the table applications").
- `EmployerJobs.tsx:111` does a hard `delete().eq("id", jobId)` with no cascade and no warning.
- After delete, applications referencing that `job_id` keep existing but `applications.jobs(*)` joins return null → seeker's "My Applications" page silently breaks.
- **Fix:** add FK `applications.job_id → jobs.id ON DELETE CASCADE`, and prompt "This will also delete N applications" before allowing delete. Same applies to `saved_jobs.job_id`.

### A2. `useApproveJob` is non-atomic [P1]
- `use-employer-data.ts:249-265`: update jobs → insert notification. If notification insert fails the job is approved but the employer is never told.
- **Fix:** wrap in an RPC `approve_job(job_id)` (mirror of `post_job_with_credits` pattern) that does both writes in one transaction and writes to `admin_audit_log`.

### A3. `useUpdateApplicationStatus` non-atomic & no audit row [P1]
- `use-employer-data.ts:90-155`: update applications → fetch app/job → insert notification → fire-and-forget email.
- Status history table `application_status_history` exists with a trigger (`log_application_status_change`) so the audit row is OK, BUT the notification insert is not retried on failure and not rolled back on update failure mid-loop.
- **Fix:** push the whole status change into an `update_application_status` RPC; surface a single error.

### A4. Bulk reject runs N parallel mutations [P1]
- `EmployerApplications.tsx:247-256`: `Promise.all(ids.map(... updateStatus.mutateAsync ...))` — each call refetches the job/app and inserts its own notification → up to N×4 round-trips and N notification emails.
- **Fix:** add `update_applications_bulk` RPC that takes an array, writes once, queues a single batched notification.

### A5. "viewed" status is set on every detail open [P2]
- `EmployerApplications.tsx:142`: opening an application immediately mutates status to `viewed`. Any accidental click bumps the seeker an email/notification.
- **Fix:** only mark "viewed" once per applicant per session, debounce 2s, OR require explicit "Mark seen".

### A6. Agent placement fee hardcoded [P1]
- `EmployerApplications.tsx:225`: `const fee = isAgent ? Math.round(salary * 0.08) : 0;` — 8% magic number.
- **Fix:** read from `app_config` key `placement_fee_percent`. Already a settled pattern.

### A7. Job edit bypasses re-moderation [P1]
- `EmployerEditJob.tsx` updates jobs row directly; no flag to send back to `pending`.
- A verified employer can post a benign listing, then edit it into spam content that will never get reviewed.
- **Fix:** any edit to `title`, `description`, `requirements`, `external_url`, `application_method` or `salary*` resets `status` to `pending` (or to `pending_re_review`) for unverified employers.

### A8. No "reopen / repost / clone" for closed/rejected jobs [P1, UX]
- Once a job is `closed` or `rejected`, the only path is delete+post-from-scratch. Employer loses all the typing.
- **Fix:** "Repost" duplicates the row to a new draft.

### A9. Apply-to-job doesn't check `status='active'` [P1]
- `use-jobs.ts:162`: client-side never re-validates the job is still active before inserting an application. RLS allows insert even on closed jobs.
- **Fix:** RPC or RLS-side check; or add `WITH CHECK ((SELECT status FROM jobs WHERE id = job_id) = 'active')` style guard via a security-definer fn.

### A10. Withdraw application has no "are you sure" [P1, UX]
- `Applications.tsx:115`: single-tap mutation. AlertDialog is registered but `withdraw_at` is irreversible visually (the row jumps out of the active filter).
- Confirmation exists in some paths, missing in others — needs a sweep.

### A11. saved_jobs delete leaves stale `useSavedJobs` cache when join fails [P2]
- If a saved job's underlying job row is later deleted (see A1), the saved row stays.
- **Fix:** scheduled cleanup or LEFT JOIN filter.

### A12. Job moderator approve doesn't verify checklist [P1]
- `ModeratorDashboard.tsx:215-216`: approves the job whether the checklist boxes are ticked or not (UI-only gate).
- **Fix:** server-side gate, or at minimum disable the Approve button until all checks ticked (UI-side, easy).

---

## B. MUTATIONS — Mentor bookings & earnings

### B1. Counter-proposal creates a duplicate booking row [P0, data integrity]
- `MentorBookings.tsx:160-180` (`handleAcceptProposal`): inserts a NEW `mentor_bookings` row using the proposed date/time, leaves the original `cancelled` row hanging with `proposed_date` set.
- Result: orphan rows, double-counted in stats, escrow not migrated.
- **Fix:** RPC `accept_counter_proposal(booking_id)` that updates the original row in-place to `confirmed` + new datetime + clears proposed_*; transfers any held escrow.

### B2. No uniqueness on (mentor_id, mentee_id, scheduled_date, scheduled_time) [P0]
- A mentee can submit the same booking twice (double-tap, slow network) → two pending bookings, two notifications, two charges if escrow logic fires twice.
- **Fix:** `UNIQUE INDEX ON mentor_bookings (mentor_id, scheduled_date, scheduled_time) WHERE status IN ('pending','confirmed')`.

### B3. Cancel booking is two-step (refund RPC then status update) [P1]
- `MentorBookings.tsx:64-91`: if the second step fails after refund succeeded, the booking stays `pending` but credits already returned.
- **Fix:** fold both into `mentor_session_refund` RPC (already exists — extend it to also set `status='cancelled'`).

### B4. `useUpdateBookingStatus` writes to 4 tables sequentially [P1]
- `use-mentor-bookings.ts:155-242`: update bookings → upsert mentor_mentees → insert notification → fire 2 emails. Any mid-step failure leaves inconsistent state and the UI gets a misleading toast.
- **Fix:** RPC `update_booking_status` that does writes 1+2 atomically; notifications/emails in an `AFTER` trigger or queued to a single email job.

### B5. `useMarkSessionComplete` race [P1]
- `use-mentor-bookings.ts:281-307`: writes the user's completion timestamp, re-reads the row, then maybe writes `status='completed'`. Two concurrent calls (mentor+mentee at the same instant) can both miss the other's timestamp and never flip status.
- **Fix:** single RPC `mark_session_complete(role)` that uses `RETURNING` and updates status in one statement.

### B6. Cancellation doesn't free the availability slot [P1]
- `mentor_availability_slots.is_booked` is set when a booking is confirmed but no inverse path on cancel.
- **Fix:** trigger on `mentor_bookings` status change → set `is_booked=false` if status moves to cancelled/rejected.

### B7. Mentor reviews — no uniqueness, no booking validation server-side [P1]
- `mentor_reviews` has no `UNIQUE (booking_id, reviewer_id)`. A mentee can submit infinite reviews per booking.
- The RLS WITH CHECK validates the booking exists but not the booking is `completed` (any `confirmed` booking allows a 1-star review before the session even happens).
- **Fix:** add the unique index; tighten RLS to require status='completed'.

### B8. Mentor earnings — no public view of held vs released [P1]
- `MentorFinance.tsx` doesn't surface escrow held amounts; mentor only sees `pending`/`paid` from `mentor_earnings`. Held credits in `mentor_session_escrow` are invisible.
- **Fix:** add a "held in escrow" KPI; merge escrow rows into the earnings ledger view.

### B9. `mentor_payout_mark_paid` isn't gated by admin role in code [P1]
- The RPC exists; UI in `MentorFinance.tsx` shouldn't expose it to mentors. Verify that's the case (admin-only).

---

## C. MUTATIONS — Payments & Wallet

### C1. Payment request → booking update is non-atomic (already self-flagged) [P1]
- `use-payment.ts:81-109` has a TODO comment acknowledging this.
- **Fix:** RPC `create_payment_request` that does both writes.

### C2. `wallet_spend` idempotency relies on caller [P1]
- Caller passes `_idempotency_key`. Most callers do; `EmployerPostJob` does (`job_post:<job_id>`). Audit other callers — any that omit it can double-charge on retry.
- **Fix:** make `_idempotency_key` required NOT NULL in the RPC signature; throw if missing.

### C3. Topup proof upload uses `upsert: false` but path is timestamp-based [P2]
- `use-wallet.ts:158`: collisions impossible by design but if user double-clicks within the same ms, the second upload fails silently.
- **Fix:** add a random suffix to path.

### C4. Topup approval flow not in code I read — verify [unknown]
- `topup_requests` referenced but no admin approve UI surfaced in this audit. Confirm `AdminPayments.tsx` handles topups separately or this is a dead table.

### C5. No "refund" UI for credit purchases [P2]
- If admin rejects a topup that was already approved (user error), there's no path to claw back credits. Likely needs a `wallet_refund` RPC.

### C6. Currency mismatch silent [P1]
- `payment_requests.currency` defaults to MMK but UI accepts other currencies. Server doesn't reject mismatches against `app_config.payment_accounts`.
- **Fix:** validate currency against allowed list in the RPC.

---

## D. MUTATIONS — Profiles, Roles, Verification

### D1. `employer_profiles` exposes PII to all authenticated users [P0, security]
- Policy: `Authenticated can view employer profiles USING (true)` → every signed-in user can SELECT `contact_email`, `contact_phone`, `full_address` of every company.
- **Fix:** create a `employer_profiles_public` view (security_invoker=on) excluding contact fields, change the broad SELECT policy to that view; restrict base table SELECT to owner + admin + the matching applicant after they apply.

### D2. CV document deletion: storage first, then row [P1]
- `Profile.tsx:143-144`: `storage.remove([path])` then `from('cv_documents').delete()`. If second fails, the file is gone but DB row claims it exists → broken download forever.
- **Fix:** delete row first; storage cleanup in a follow-up trigger or scheduled job.

### D3. `AdminEmployers` cascade is client-side and fragile [P0]
- `AdminEmployers.tsx:122-132`: deletes jobs → notifications → profile in three separate calls. A failure on the second leaves a half-deleted account and the UI tells admin "deleted".
- **Fix:** RPC `admin_delete_employer(id)` doing all writes + audit_log insert in a transaction.

### D4. `AdminUsers` falls back to direct profile delete [P0]
- `AdminUsers.tsx:457`: comment says "RPC delete_user_cascade is not available — fall back to direct profile delete". Leaves `auth.users` orphaned, plus jobs, applications, mentor_bookings, wallet, etc.
- **Fix:** build the missing RPC. Until then, hide the delete button.

### D5. Role toggles: no audit log [P1]
- `set_user_role` / `revoke_user_role` RPCs don't appear to log to `admin_audit_log`. Verify and add.

### D6. Employer verification has no UI workflow surfaced [P1]
- `verification_status` is a column but no admin screen to flip it ("Verify employer"). Currently must be set via SQL.
- Now relevant because **auto-approve depends on `is_verified`** (Phase from previous turn).
- **Fix:** add Verify/Unverify action in `AdminEmployers`.

### D7. Mentor profile sync with profiles [P1]
- Per memory `mentor_profiles` mirrors fields from `profiles`. Any update to one needs to mirror to the other; no triggers found.
- **Fix:** trigger or single RPC.

### D8. Delegate token revoke not in UI [P2]
- `delegate_tokens.is_revoked` column exists but no "Revoke" button in `DelegateAccess.tsx` (verify).

### D9. Onboarding can create incomplete profiles [P1]
- `Signup.tsx` and `Onboarding.tsx` flows can leave `profiles` with empty required-feeling fields (display_name, location). No server-side guard via `is_profile_complete` function before allowing key actions like apply/post.
- **Fix:** gate `apply_to_job` and `post_job_with_credits` RPCs on `is_profile_complete(uid)`.

### D10. Agent client delete orphans jobs [P1]
- `use-agent-clients.ts:75`: `from('agent_clients').delete().eq('id', id)`. Jobs reference `agent_client_id` — after delete, those jobs show null company.
- **Fix:** prompt "N jobs reference this client", offer reassign or block delete.

---

## E. RLS & TRIGGER GAPS

### E1. `notifications` INSERT policy uses `can_notify(user_id)` [verify]
- Need to confirm `can_notify` actually limits writes (not just `return true`). If permissive, anyone can spam any user.

### E2. `application_status_history` / `job_status_history` rely on triggers [verify]
- Triggers `log_application_status_change` and `log_job_status_change` exist. Confirm they fire on every status path (including admin updates and bulk updates).

### E3. `mentor_earnings` no INSERT policy at all [P1]
- Only writable by service role. Confirm `mentor_session_release` runs as SECURITY DEFINER and that no client-side path attempts insert (would silently fail).

### E4. Public posts/community moderation [P1]
- `community_posts` SELECT allows author to see own unapproved post — fine. But `is_approved` defaults `false` and the author UI may show it as "live" before approval — visual mismatch.

---

## F. UX — Cross-cutting

### F1. No skeleton/loading state on most lists [P1]
- Employer Jobs, Applications, Mentor Bookings show a single Spinner. Skeleton rows would feel faster.

### F2. Empty states are inconsistent [P1]
- Some screens use `<EmptyState>`, some show plain text. Standardise: icon + title + 1-line description + primary CTA.

### F3. Destructive actions inconsistent [P1]
- AlertDialog used for most deletes but not all (notifications delete-all is a single click, agent client delete is direct).
- **Rule:** every destructive action requires a typed confirmation OR a 3-second undo toast. Pick one.

### F4. Toast policy violations [P1]
- Memory says "no success toasts". Found success toasts in:
  - `MentorBookings.tsx:86` ("Cancelled. Credits refunded if held.")
  - `EmployerJobs.tsx:113` ("Listing deleted")
  - `Applications.tsx:121` ("Application withdrawn")
- **Fix:** convert to silent state changes + visible UI feedback (row removed, status badge change). Keep toast only for errors.

### F5. Status badge labels not centralised [P2]
- `applied`, `submitted`, `viewed`, `shortlisted`, `interview`, `interviewed`, `offered`, `placed`, `rejected`, `withdrawn` — colors and labels scattered. Mix of `interview` and `interviewed` (A4 mentioned).
- **Fix:** single `<ApplicationStatusBadge status>` component used everywhere.

### F6. Role-shared screens use inconsistent labels [P1]
- Per memory, Agent shares Employer screens but with different labels. Audit shows mixed: some places say "Applicants", others "Candidates"; "Company" vs "Client".
- **Fix:** central `useRoleLabels()` hook, one source of truth.

### F7. Currency rendering inconsistent [P2]
- Mix of `MMK X`, `X MMK`, `K X`, `${amount.toLocaleString()}` without unit. Use `formatMMK` from `use-wallet.ts` everywhere.

---

## G. UX — Job Seeker

| Screen | P | Issue |
|---|---|---|
| Home | P1 | Headerless per memory but currently shows duplicate "Hello, X" + page title |
| Jobs | P1 | Filter chips wrap to 2 rows on mobile; bottom sheet is the right pattern but applied/saved counts not shown on each chip |
| Job Detail | P1 | "Apply" button stuck under bottom nav on small screens; no sticky CTA |
| Job Detail | P2 | Salary range shows even when `salary_negotiable=true` — should hide and show "Negotiable" |
| Applications | P1 | No detail view — clicking a row should open the conversation/timeline |
| Applications | P1 | "Withdrawn" applications still appear in default tab — should be hidden behind a filter |
| Saved Jobs | P2 | No sort, no filter, breaks A11 if underlying job deleted |
| Profile | P1 | "Edit Profile" and "Profile" duplicate fields; per memory Edit Profile owns Skills/Remote |
| Profile | P2 | Avatar upload has no crop |
| Career Tools | P1 | Cover-letter and gap-analysis pages show "AI" badge once — memory says strictly forbidden. Re-grep |
| Mentors list | P2 | No "Available now" filter despite `is_available` column |
| Mentor Detail | P1 | Booking flow has 4 sequential modals — collapse to one slide-over |
| Wallet | P2 | Top-up bottom sheet doesn't surface bonus_credits clearly |

---

## H. UX — Employer

| Screen | P | Issue |
|---|---|---|
| Dashboard | P1 | Numeric stats navigate via URL params (good) but some stats (e.g. "Pending review") have no destination route |
| My Jobs | P0 | Delete confirm doesn't say how many applicants will be affected (A1) |
| My Jobs | P1 | No "Repost / Duplicate" action (A8) |
| Applications | P1 | Two-pane layout great on desktop, but right pane has no close button on tablet |
| Applications | P1 | Bulk actions limited to reject/shortlist; no bulk move-to-interview, no bulk download CVs |
| Applications | P1 | "Mark viewed" auto-fires on row open (A5) |
| Post Job | P1 | Step indicator shows 1/2 but page is now single-form per recent change → indicator is dead UI |
| Post Job | P2 | Salary fields accept negative? Min/max swap allowed? Validate client-side too |
| Finance | P1 | "Pending placement fees" and "Approved" not visually distinguished |
| Company | P1 | No "Preview as candidate" |
| Search Talent | P1 | No saved-search; no "Invite to apply" action shown on candidate card |

---

## I. UX — Agent

Inherits all Employer issues plus:

| Screen | P | Issue |
|---|---|---|
| Clients | P0 | Delete client does not warn about linked jobs (D10) |
| Clients | P1 | No "active jobs per client" count on the list |
| Post Job | P1 | "Posted by: client" picker resets on validation error → user must re-pick |
| Applications | P1 | Placement-fee 8% hardcoded (A6) |
| Dashboard | P2 | Labels say "Employer Dashboard" in some places — should be "Agent Dashboard" |

---

## J. UX — Mentor

| Screen | P | Issue |
|---|---|---|
| Dashboard | P1 | "Sessions completed" pulled from a derived count in `useMentorMentees` (use-mentor-bookings.ts:373) — duplicates server-side `total_sessions`; can desync |
| Bookings | P0 | Counter-proposal creates duplicate booking (B1) |
| Bookings | P1 | "Accept" / "Decline" with no confirmation; "Decline" lets you optionally counter-propose, not obvious |
| Bookings | P1 | "Mark complete" — no UI feedback that the OTHER party also needs to confirm; race in B5 |
| Mentees | P1 | No filter "Active / Completed / Pending" despite the data; just one big list |
| Mentees | P2 | "Add note" button writes to `notes` field — no edit history |
| Availability | P1 | Slot deletion via guard trigger blocks if booked, but UI doesn't say so until the toast appears |
| Availability | P1 | Recurring slots — only single-day; "Repeat weekly" is requested but missing |
| Earnings | P1 | Held escrow not surfaced (B8) |
| Profile | P1 | "Become mentor" flow on first open, no edit screen for hourly_rate later (verify) |

---

## K. ADMIN / MODERATOR (out of stated scope but affects all roles)

| Screen | P | Issue |
|---|---|---|
| Moderator Dashboard | P1 | Job-approval checklist is decorative (A12) |
| Admin Employers | P0 | Cascade delete is client-side (D3) |
| Admin Users | P0 | Delete user falls back to direct profile delete, leaves auth.users + all related data orphaned (D4) |
| Admin Payments | P1 | No filter by payment_type, no export |
| Admin Wallet | P2 | No "issue manual credit" with audit trail |

---

## L. PROPOSED FIX ORDER

**Phase 1 — P0 mutations (data loss, money, security)**
1. A1 — `applications.job_id` FK + cascade + delete-warning UI
2. A1b — same for `saved_jobs.job_id`
3. B1 — counter-proposal RPC, no duplicate row
4. B2 — uniqueness index on mentor_bookings
5. D1 — employer_profiles PII view + RLS lock-down
6. D3 — `admin_delete_employer` RPC
7. D4 — `delete_user_cascade` RPC (or hide button)
8. D10 — agent_client delete guard

**Phase 2 — P0/P1 UX blockers**
- F4 (toast policy), F3 (destructive confirm), A4 (bulk in 1 RPC), A5 (viewed debounce), A6 (placement fee from config), A7 (re-moderation on edit), A8 (repost), A10 (withdraw confirm)
- H/I/J row-by-row UX fixes

**Phase 3 — P1 mutation hardening**
- A2, A3, B3, B4, B5, B6, B7, B8, C1, C2, C6, D2, D5, D6, D7, D9, E1–E4

**Phase 4 — P1 UX polish per role (G/H/I/J)**

**Phase 5 — P2 cleanup**
- F5 (status badge component), F6 (role labels hook), F7 (currency formatter), and the rest tagged P2

---

## M. NOT AUDITED (out of scope or already covered)

- Edge functions internals (parse-cv, match-jobs, send-transactional-email) — no caller-side issues found
- Realtime/messaging channel security (covered in earlier sessions)
- Email templates rendering
- i18n string completeness (separate sweep)
- Performance / N+1 queries (separate sweep)
