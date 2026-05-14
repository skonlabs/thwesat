# Comprehensive test coverage plan

Current state: 29 tests across 5 files. Coverage is concentrated on payments, partner finance, and job-expiry helpers. The rest of the app (mentor flow, applications, messaging, agents, role-gating, admin moderation, wallet) has zero unit-test coverage.

This plan adds ~60 focused tests organized **by role**, hitting the business logic that has actually broken in past audits — not just smoke tests.

## What gets tested

### 1. Job Seeker role — `src/test/roles/job-seeker.test.ts` (~8 tests)
- `useApplyToJob`: blocks duplicate application, blocks application to expired job, blocks self-apply to own employer post, requires CV when job is `application_method=platform`.
- `useSavedJobs`: toggle add/remove idempotency.
- Job filters: `useJobs` excludes `expires_at < now()`, excludes non-`active` status.
- CV primary toggle: setting one CV primary unflags others (client-side state guard).

### 2. Employer role — `src/test/roles/employer.test.ts` (~9 tests)
- `useCreateJob`: payload includes `expires_at`, `posted_by_label`, sanitized payment methods; rejects empty title.
- Job lifecycle hook: pause→active→closed transitions call correct status; closed→active is blocked client-side.
- `useApplications` (employer view): groups by job, filters by status param.
- Placement-fee calc: `placement_fee = salary × rate` with min/max clamp.
- Featured-job credit spend: insufficient balance throws before RPC call.

### 3. Recruiting Agent role — `src/test/roles/agent.test.ts` (~5 tests)
- Agent posting: `useCreateJob` with `agent_client_id` injects `client_company_name` + `client_logo_url` from selected client.
- `useAgentClients`: only returns rows where `agent_id = auth.uid()`; soft-delete sets `is_active=false`.
- Role label mapping: `useRoleLabels` returns Agent labels (not Employer) when `effectiveRole==='agent'`.

### 4. Mentor role — `src/test/roles/mentor.test.ts` (~10 tests)
- `useCreateBooking`: blocks double-booking same slot, marks slot `is_booked=true`.
- `useUpdateBookingStatus`: pending→confirmed allowed for mentor only; mentee cannot self-confirm.
- Mentee dedup: `mentor_mentees` upsert keyed on `(mentor_id, mentee_id)`, increments `sessions_completed` on `completed`.
- Escrow release on completion: both `mentor_completed_at` AND `mentee_completed_at` required before release.
- Decline with `decline_reason` refunds escrow.
- Availability slot validation: end_time > start_time.

### 5. Admin / Moderator role — `src/test/roles/admin.test.ts` (~9 tests)
- `useApprovePost`, `useRejectPost`, `useApproveJob`: write `moderation_reason`, set correct status.
- Admin payment review: revoke path triggers refund tx; approve writes `mentor_earnings`.
- `useToggleUserRole`: blocks demoting last admin.
- `useAdminAnalytics`: aggregates correctly handle empty datasets (no NaN).
- Action prices CRUD: only admin role can mutate.

### 6. Messaging — `src/test/messaging.test.ts` (~6 tests)
- `useStartConversation`: dedupes — returns existing conversation when both participants already share one.
- Optimistic send: appends client UUID, reconciles on server echo.
- `useUnreadCounts`: ignores own messages, counts only `is_read=false`.
- Polling cadence: 30s when tab visible, paused on `document.hidden`.

### 7. Notifications — `src/test/notifications.test.ts` (~4 tests)
- Mark-as-read mutation flips only the targeted ID.
- `link_path` deep-link is preserved through render.
- Unread badge count caps at 99+.

### 8. Wallet & credits — `src/test/wallet.test.ts` (~5 tests)
- `useSpendCredits`: throws `insufficient_credits` before RPC when balance < cost.
- `useTopupRequest`: blocks amount=0 and amount>MAX.
- Bonus credits applied: `credits + bonus_credits` is what's debited from package.
- MMK rounding: package prices snap to nearest 100 MMK in display.

### 9. Role/auth guards — `src/test/role-guards.test.tsx` (~6 tests)
- `AppRoleGuard`: redirects unauthorized role to `/`, allows matching role, allows admin override.
- `effectiveRole` derivation: agent + employer → agent wins; jobseeker + mentor → preserves both.
- Public crawler block: `/jobs` accessible to anon, `/admin/*` redirects.

### 10. Server-side RPC contracts — `src/test/server-contracts.test.ts` (~5 tests)
Read-only checks via `supabase--read_query` baked into a Vitest suite using a service-role lookup. Verifies the **shape and existence** of:
- `review_payment_request(_payment_id, _new_status, _admin_note)` exists.
- `admin_compute_partner_statement(_partner_id, _year, _month)` exists.
- `post_job_with_credits(_payload, _featured)` exists.
- `match_jobs_for_user(_user_id, _limit)` exists.
- Critical triggers present on `jobs`, `applications`, `mentor_bookings`.

(This catches the class of bug where a migration is reverted but the frontend still calls the RPC.)

## What is explicitly NOT covered

- Visual regression / screenshot tests (out of scope).
- E2E browser flows (would need Playwright; separate decision).
- Edge function execution (those are tested via `supabase--test_edge_functions` separately on demand).
- RLS enforcement (can only be tested with multiple JWTs; needs integration env).

## Execution order

1. Read each hook + page being tested to lock current contract.
2. Write suites in the order above.
3. Run `bunx vitest run` after each suite, fix failures (real bugs OR test bugs) before moving on.
4. Final report: total tests, any production bugs uncovered along the way.

## Estimate

~60 new tests, ~10 new files under `src/test/roles/` and `src/test/`. Likely uncovers 3–6 small production bugs that get fixed inline. Roughly a single focused work session.

## Open question

Want me to ship all 10 suites in one go, or stage it (Job Seeker + Employer + Mentor first, then Admin + cross-cutting)? Shipping all at once is faster but the diff will be large.
