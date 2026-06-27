# Migration 2 + 3 — Execution Plan

Two destructive migrations. I'll run them sequentially, each as a single approval, with code rewire between them so the app stays compilable.

---

## Migration 2 — Per-role profile split

### SQL (single migration)
1. **Create new role tables** (each `user_id uuid PK references auth.users(id)`):
   - `jobseeker_profiles` — display_name, avatar_url, headline, bio, bio_my, location, website, skills[], languages[], experience, visibility, remote_ready, has_laptop, internet_stable, has_wise, has_upwork, preferred_work_types[], referral_code, last_seen_at, deleted_at, created_at, updated_at
   - `agent_profiles` — display_name, avatar_url, headline, bio, location, website, languages[], visibility, referral_code, last_seen_at, deleted_at, timestamps
   - `partner_profiles` — merges current `partners` table + display fields (tier, commission_rate, bank info, etc.)
   - `admin_profiles` — display_name, avatar_url, timestamps
   - Keep existing `mentor_profiles`, `employer_profiles` — backfill their missing display columns (display_name, avatar_url, bio, location, languages, last_seen_at) from `profiles`.

2. **Backfill** each table from `public.profiles` joined to `user_roles`.

3. **Re-point FKs** that reference `profiles(id)` to `auth.users(id)`:
   jobs.posted_by, applications.user_id, messages.sender_id, conversation_participants.user_id, community_posts.author_id, post_comments/likes/saves, saved_jobs.user_id, notifications.user_id, mentor_bookings.{mentor_id,mentee_id}, mentor_reviews, agent_clients.agent_id, referrals, wallet_transactions.user_id, feature_unlocks.user_id, generated_documents.user_id, cv_documents.user_id, scam_reports.reporter_id, subscriptions.user_id, etc.

4. **Create `v_user_directory` view** — `UNION ALL` over the 6 role tables exposing `(id, display_name, avatar_url, role)` for chat headers / notifications / mentions.

5. **RLS + GRANTs** on every new table: self read/write; cross-user reads scoped (employer reads jobseeker when an application exists; mentor reads mentee when a booking exists; everyone reads `v_user_directory`).

6. **DROP** `profiles_public` view, then **DROP** `public.profiles`.

### Code rewire (after migration approval)
- Split `useProfile` → `useJobseekerProfile`, `useEmployerProfile`, `useAgentProfile`, `useMentorProfile`, `usePartnerProfile`, `useAdminProfile`.
- `useAuth()` exposes `user.email` / `user.phone` directly — remove every `profile.email` / `profile.phone` read.
- Cross-role display lookups (chat, notifications, mentions, public profile pages, search talent) switch to `v_user_directory`.
- Files touched (~40): EditProfile, Profile, PublicProfile, SearchTalent, Messages, ChatView, Notifications, Community, Mentors, MentorDetail, EmployerApplications, AgentClients, AdminUsers, AdminEmployers, AdminPartners, hooks/use-profiles, use-mentor-data, use-employer-data, use-agent-clients, use-messages-data, use-notifications-data, use-community-posts, etc.
- Edge functions: `match-candidates`, `match-jobs`, `parse-cv`, `generate-profile` — swap `profiles` → role table.

---

## Migration 3 — Table consolidation

### SQL (single migration)
1. **Create `wallet_transaction_requests`**:
   `id, user_id, request_type (topup|subscription|addon|reversal), amount_mmk, currency, reference_id, reference_type, proof_url, payment_method, sender_reference, status (pending|approved|rejected), reviewed_by, reviewed_at, admin_note, metadata jsonb, timestamps`.
2. **Rewrite `approve_*` RPCs** as one `approve_wallet_request(_id)` that dispatches on `request_type` → writes `wallet_transactions` ledger row + executes side-effect (grant credits / activate subscription / grant addon / reverse).
3. **Backfill** from `topup_requests`, `subscription_payment_requests`, `payment_requests`, `payment_reversals` (preserving status, reviewer, timestamps).
4. **DROP** `topup_requests`, `subscription_payment_requests`, `payment_requests`, `payment_reversals`.
5. **DROP** `delegate_tokens` (deletes Panic delegate-access feature).
6. **DROP** `ai_rate_limits`, `partner_tier_approvals`, `partner_statement_revisions`, `partners` (folded into `partner_profiles` in M2), `career_tracks`, `career_track_enrollments`, `mentor_session_escrow`.
7. **Strip** `partner_monthly_statements` to `id, partner_id, period_month, period_year, created_by, created_at` — admin finance recomputes on-read.
8. **Rename** view `v_active_unlocks` → `active_feature_unlocks`.

### Code rewire
- `TopUp.tsx`, `Pricing.tsx`, `SubscribeSheet`, addon checkout flows → insert into `wallet_transaction_requests` with `request_type`.
- `AdminPayments.tsx`, `AdminWallet.tsx`, `AdminFinance*` → single review queue against `wallet_transaction_requests`.
- `AdminPartnerFinance.tsx` → recompute monthly numbers on-read.
- Delete: `DelegateAccess.tsx`, `DelegateTokenSheet.tsx`, `use-delegate-token.ts`, AI rate-limit guards in edge functions, partner tier-approval admin screen.
- `useWallet` hooks: `useMyTopupRequests` → `useMyWalletRequests(type?)`.

---

## Risks (re-confirming)
- **Dropping `profiles` is irreversible.** Every FK repoint must succeed before drop — I'll wrap in a single transaction.
- **Stripping `partner_monthly_statements`** loses historical snapshots (recomputes use current rules).
- **Dropping `ai_rate_limits`** = users can spam OpenAI-backed features. No mitigation.
- **Dropping `delegate_tokens`** = Panic delegate-access feature gone (memory file will be updated).
- **Dropping `mentor_session_escrow`** — confirm escrow flow isn't relied upon. Currently 0 code references but it may be future-planned. **Need your call.**

## Execution order
1. Submit Migration 2 SQL → await your approval → run.
2. Rewire code for M2 → typecheck passes.
3. Submit Migration 3 SQL → await your approval → run.
4. Rewire code for M3 → typecheck passes.
5. Update memory files (`features/safety-and-security`, `features/payment-system`, `features/partner-finance`).

**Reply "go" to start with Migration 2 SQL.** Or call out anything to keep (e.g. `mentor_session_escrow`, `delegate_tokens`, historical partner statements) before I drop it.
