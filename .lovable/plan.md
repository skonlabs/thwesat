## Three-part request

### 1) Remove "30-day" auto-expiry copy completely

No DB-level auto-expiry exists (we confirmed earlier — the boost is a permanent boolean on `jobs.is_featured`). Only the user-facing copy still says "30 days" / "for X days". I'll sweep every Featured copy string so the message is simply: "Featured placement at the top of search results" (EN) and the Burmese equivalent — no duration.

Files to update:
- `src/components/wallet/SpendConfirmSheet.tsx` (line ~126)
- `src/pages/EmployerPostJob.tsx` (Featured checkbox helper text)
- `src/pages/Pricing.tsx` (Featured add-on description)
- Any other "30 day"/"7 day" Featured references (will grep before edit)

### 2) Featured Job — end-to-end gap fixes

Findings from the review:

| Gap | Fix |
|---|---|
| **Featured slot is consumed but never refunded** when an employer toggles a job off-featured in `EmployerEditJob.tsx`, deletes the job, or admin rejects it. | Add a small server-side RPC `unfeature_job(_job_id)` that flips `is_featured=false` and decrements `featured_jobs_used` (clamped at 0) — wired into the edit page, delete flow, and admin reject. |
| **Edit Job lets a non-featured job become featured for free** — there's no quota check; it just writes `is_featured=true`. | Edit page now calls `feature_job_with_quota` when toggling on; the form no longer writes `is_featured` directly. |
| **`EmployerJobs.tsx` "Promote" button still shows** for jobs that are `pending` / `expired` / `closed`. Promoting an inactive job wastes a slot. | Gate the "Promote to Featured" button to `status === 'active'` jobs only (matches current condition already — keeping). Add same guard in RPC. |
| **Duplicating a job correctly strips `is_featured`** (already done in `EmployerJobs.tsx` line 137). Verified. | No change. |
| **Public surfaces** (`Welcome.tsx`, `Jobs.tsx`, `HomePage.tsx`) already filter expired listings and sort by `is_featured` desc. | No change. |

### 3) Candidate Matching for jobs (uses Matching Pack add-on)

**Eligibility:** an employer/agent has an active, non-expired `addon_purchases` row with `addon.kind = 'matching'`. A helper hook `useHasMatchingPack()` is added so the UI can gate the feature per user.

**UI changes (only when pack is active):**

- `EmployerJobs.tsx` — each job card gets a new action **"View matched candidates"** (alongside existing Promote / Edit / Duplicate).
- New page **`/employer/jobs/:id/matches`** (`EmployerJobMatches.tsx`):
  - Calls a new edge function `match-candidates` for the job.
  - Shows **up to 10 candidates at a time**, with avatar, headline, skills, experience, and match score.
  - Each candidate has **Reject** and **View profile** (deep-link to `/profile/:user_id`).
  - When the user rejects ≥ 5 of the visible 10, a **"Show next matches"** button appears. Clicking it removes the rejected ones and tops the list back up to 10 from the next-best unseen candidates. The visible list never exceeds 10.
  - Rejections are persisted per `(employer_user_id, job_id, seeker_user_id)` so the same rejected candidate isn't shown again in future sessions.

**Backend changes:**

- New table `job_candidate_rejections` (employer_user_id, job_id, seeker_user_id, created_at) + RLS so the employer only sees their own rows.
- New table `job_candidate_matches` cache (job_id, seeker_user_id, score, computed_at) so we don't re-run OpenAI for every page-load; refreshed only when a job's text changes or on explicit "Refresh matches".
- New edge function `match-candidates`:
  - Verifies the caller owns the job AND has an active matching pack.
  - For each seeker `profile` (with a non-empty headline/skills/bio), builds a compact JSON, then asks OpenAI (`text-embedding-3-small` for retrieval + cosine ranking — same pattern as the existing `match-jobs` function) to rank candidates against the job's text.
  - Returns top N (default 30) excluding already-rejected seekers; the page slices 10 at a time.
  - Caches results in `job_candidate_matches` for 24 h.

**Why embeddings, not chat-completion:** the existing `match-jobs` edge function already uses embeddings, the project is already wired for embedding-based matching, it's deterministic, ~100× cheaper than asking GPT to rank, and works at the scale of "all resumes in the system". "Uses OpenAI" remains true.

### Technical details (for review)

- New migration: `unfeature_job` RPC, `job_candidate_rejections` table + RLS + grants, `job_candidate_matches` table + RLS + grants.
- New edge function: `supabase/functions/match-candidates/index.ts` (uses `OPENAI_API_KEY` — already configured for `match-jobs`).
- New hook: `src/hooks/use-matching-pack.ts` (`useHasMatchingPack()`).
- New page: `src/pages/EmployerJobMatches.tsx` + route registration in `src/App.tsx`.
- `EmployerJobs.tsx`: add "View matches" action (gated), wire to new page.
- `EmployerEditJob.tsx`: route featured-toggle through `feature_job_with_quota` / `unfeature_job`.
- `SpendConfirmSheet.tsx`, `EmployerPostJob.tsx`, `Pricing.tsx`: drop "30 days" copy.

No design tokens or routing patterns change. No new dependencies.
