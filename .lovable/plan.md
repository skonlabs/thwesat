## Context

Agent and Employer share the same screen files (`EmployerJobs.tsx`, `EmployerApplications.tsx`, `EmployerPostJob.tsx`, `EmployerFinance.tsx`, `SearchTalent.tsx`, `EmployerEditCompany.tsx`) — only the dashboard is role-specific. The complaint isn't that "Agent looks different from Employer" — it's that all of these shared screens are noticeably worse than the polished Agent Dashboard. This plan brings them up to that bar.

The existing `.lovable/plan.md` already covers My Jobs + Applications redesign. I'll execute that plus extend the polish to the other three.

## What changes

### 1. My Jobs (`EmployerJobs.tsx`)
- Replace tall 3-section cards with a **single dense row** per job: status dot · title/company · inline pipeline chips (New / Short / Intv) · `Review →` CTA · `⋯` menu (Edit, Share, Pause, Close, Delete, Promote).
- Pipeline chips deep-link to Applications with `?jobId=…&stage=…`.
- KPI tiles tightened, only show counts > 0.
- Search box at top to filter postings by title/company.
- Mobile: same row stacks vertically; actions stay inline.

### 2. Applications (`EmployerApplications.tsx`)
- Two-pane ATS layout on `md+`:
  - Left: candidate list rows with avatar, name, top skills, location, time-ago, hover quick-actions (✓ Shortlist, ✕ Reject, 💬 Message). Checkbox column for bulk select.
  - Right: sticky candidate detail (replaces bottom-sheet modal).
- Stage tabs row (All · New · Shortlisted · Interview · Offered · Placed · Rejected) — single row, no duplicate "Pipeline" header.
- Bulk action bar (Shortlist, Reject, Message) when rows selected.
- Sort + search kept; pagination 50/page.
- Mobile: detail collapses back to existing bottom-sheet, list rows keep inline quick-actions.

### 3. Post Job (`EmployerPostJob.tsx`)
- Reduce from 2 long steps to a **single scrollable form with section anchors** (Details · Compensation · Requirements · Application Method). Stepper bar replaced with anchor pills.
- Group salary + currency + negotiable into one row.
- Sticky bottom bar with credit cost + Submit (no separate "next" → "submit" navigation).
- Live preview kept but moved to a slide-over instead of inline sheet.

### 4. Finance (`EmployerFinance.tsx`)
- Match Agent Finance: header KPI row (Total Earnings · This Month · Pending) → ledger table → filters in a slim toolbar instead of stacked card.
- Empty state matches Agent.

### 5. Search Talent (`SearchTalent.tsx`)
- Same grid pattern as Agent Search: `grid gap-3 md:grid-cols-2 xl:grid-cols-3` with compact candidate cards (avatar · name · headline · top skills · status badge · Message/View buttons).
- Filters move to bottom-sheet trigger button (matches mem://features/search-filters).

### 6. Company (`EmployerEditCompany.tsx`)
- Match Agent Profile pattern: hero card with logo + verified badge, sectioned form below (About · Contact · Industry · Locations).
- Save bar sticks to bottom while scrolling.

## Scope & wording

- Wording stays employer-side (Applicants, Hires, Company) — not Agent-side (Candidates, Placements, Client). That decision was already locked in.
- Pure presentation work — no DB, RLS, or business-logic changes. Same hooks (`useEmployerJobs`, `useEmployerApplications`, `useUpdateApplicationStatus`, `useEmployerFinance`).
- No new dependencies.

## Order I'll ship

1. My Jobs (highest visible impact)
2. Applications (core daily workflow)
3. Search Talent + Finance (quick polish)
4. Post Job (form refactor)
5. Company (last; simple form)

This will land across multiple turns — I'll ship one screen per turn so you can review each before I move on. Sound good?
