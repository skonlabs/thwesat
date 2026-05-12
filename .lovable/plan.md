## Goal
Make the **My Jobs** and **Applications/Candidates** screens usable for employers and agents handling **50+ postings × 1000s of candidates each**. Today both screens force scrolling through cards and opening a modal for every triage action. We will redesign them as a focused ATS workflow.

## Problems with current UX

**My Jobs page**
- Each job card has 3 stacked sections (header + applicant chips + action bar) → very tall, only 4–5 visible at a time.
- KPI status filter row + per-card chips are duplicated information.
- Actions hidden behind a `MoreVertical` menu.

**Applications page (per job)**
- After clicking a job, candidates are shown as big cards with no inline action — every shortlist / reject / message requires opening a bottom-sheet modal. Reviewing 100 CVs = 100 modal opens.
- No bulk actions, no sort, no keyboard nav.
- Pipeline tiles wrap awkwardly on desktop.
- Detail lives in a small mobile bottom-sheet even on a 1440px screen.

## Redesign

### 1. My Jobs → compact rows + inline pipeline summary
Replace the 3-section card with a **single dense row** (responsive: row on md+, stacked on mobile):

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ● Active   Senior React Dev — Acme Co.            New 12  Short 4  Intv 2  │
│ Posted 3d · Apply on platform                     [Review →] [⋯ menu]       │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Status dot replaces the badge column.
- Pipeline counts inline as clickable chips that deep-link straight into that stage of the candidate pipeline (e.g. `?jobId=…&stage=new`).
- Primary CTA "Review candidates" jumps to the pipeline view.
- Edit / Share / Pause / Close / Delete / Promote moved into a single `⋯` menu so the row stays clean.
- Search box at top to filter postings by title/company.
- Keep status KPI tiles, but tighten them and only show counts > 0 by default.

### 2. Applications → two-pane ATS pipeline (master–detail)

This is the core change. On md+ screens we use a **resizable two-pane layout**:

```text
┌─ Posting bar: Senior React Dev (← All postings)  · 247 candidates ──────────┐
├─ Stage tabs: All 247 · New 12 · Short 18 · Intv 6 · Offered 2 · Placed 1 ─┤
├──────────────────────────────────────────────────┬──────────────────────────┤
│ ▣  Search by name, skill, location…   [Sort ▾] │  Candidate detail        │
│ ──────────────────────────────────────────────── │  ─────────────────────── │
│ ☐ ⓜ Mya Mya Aung  · React, TS · Yangon  · 2h │  Avatar · Name           │
│ ☐ ⓢ Hla Hla     · Node, AWS · Mandalay · 5h │  Headline · Location      │
│ ☑ ⓚ Kyaw Kyaw  · React Native · YGN · 1d ▸│  [Profile] [Message]      │
│ ☐ …                                           │                          │
│ ──────────────────────────────────────────────── │  Skills · Cover letter  │
│ Bulk: [Shortlist] [Reject…] [Message]          │  Status history          │
│        2 selected                                 │  Stage actions:         │
│ Page 1 / 13                                       │  Shortlist / Interview  │
│                                                   │  Offer / Place / Reject │
└──────────────────────────────────────────────────┴──────────────────────────┘
```

Key features:

- **Left list** — compact rows with avatar, name, headline, top 2 skills, location, time-ago, status pill. Hover reveals quick-action icons (✓ Shortlist, ✕ Reject, 💬 Message) so most triage happens without opening detail.
- **Right pane** — replaces the bottom-sheet modal. On mobile it slides up as a sheet (existing behavior preserved); on md+ it's a sticky right column.
- **Bulk select** — checkbox column + sticky bulk-action bar (Shortlist, Reject with reason, Message via template, Move to interview).
- **Sort** — Newest, Oldest, Skill match (existing), Last activity.
- **Search** — name, headline, location, skills (already there, kept).
- **Stage tabs** — single horizontal row, no duplicate "Pipeline" header. Stages reorder by funnel: All · New · Shortlisted · Interview · Offered · Placed · Rejected.
- **Pagination / virtualized** — page through 50 at a time so a 1000-candidate list stays fast.
- **Auto-mark viewed** stays.
- **Keyboard**: `j/k` next/prev candidate, `s` shortlist, `r` reject, `m` message, `[` `]` switch stage.

### 3. Mobile behavior
On screens < md, the right pane collapses back into the existing bottom-sheet modal so we don't regress mobile. Inline quick-actions stay on rows.

### 4. Shared changes
- One `CandidateRow` component used by both desktop list and (with denser variant) the mobile drill-down.
- `PipelineStageTabs` extracted from current inline JSX.
- Reject/Place/Interview-date dialogs are reused as-is.
- Deep-link query params: `?jobId=…&stage=new&q=react&sort=newest&sel=<id>` so refreshing/back keeps state and we can link from the Jobs page rows.

## Technical notes

- All work is presentation-layer in `src/pages/EmployerJobs.tsx` and `src/pages/EmployerApplications.tsx`, plus 2 small extracted components in `src/components/employer/`. No DB/RLS/business-logic changes — same hooks (`useEmployerJobs`, `useEmployerApplications`, `useUpdateApplicationStatus`).
- Two-pane layout uses CSS grid `md:grid-cols-[minmax(360px,_1fr)_minmax(420px,_1.2fr)]` with `lg:grid-cols-[420px_1fr]`. No new resize lib — keep static breakpoints.
- Keep applies-on-the-fly URL state via `useSearchParams` (already in use). New params: `stage`, `sort`, `q`, `sel`.
- Bulk actions = `Promise.all` over existing `useUpdateApplicationStatus.mutateAsync` with a single toast summarising successes/failures.
- Virtualization: start with simple pagination (50/page); only add `react-virtual` if a real list exceeds ~500 items in profiling.
- No new dependencies.

## Out of scope
- Drag-and-drop Kanban (slow at 1000s of cards; tabs + bulk actions cover the same need).
- Saved views / smart filters (can come later).
- Comments / internal notes per candidate (separate feature).

Once you approve, I'll ship this in one pass.
