# Playwright E2E suite

Live end-to-end tests covering every user role.

## Setup

Set credentials for whichever roles you want to exercise (missing roles are skipped, not failed):

```bash
export E2E_SEEKER_EMAIL=... E2E_SEEKER_PASSWORD=...
export E2E_EMPLOYER_EMAIL=... E2E_EMPLOYER_PASSWORD=...
export E2E_AGENT_EMAIL=... E2E_AGENT_PASSWORD=...
export E2E_MENTOR_EMAIL=... E2E_MENTOR_PASSWORD=...
export E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=...
export E2E_MODERATOR_EMAIL=... E2E_MODERATOR_PASSWORD=...
export E2E_PARTNER_EMAIL=... E2E_PARTNER_PASSWORD=...

# Optional — defaults to the Lovable preview URL
export BASE_URL=https://thwesat.com
```

## Run

```bash
bunx playwright install chromium   # one-time
bunx playwright test               # all roles
bunx playwright test e2e/seeker.spec.ts
bunx playwright test --headed      # watch in a browser
```

## What's covered

| File | Role | Scope |
|---|---|---|
| `seeker.spec.ts` | jobseeker | dashboard, jobs browse + detail, save toggle, edit-profile CRUD, notifications, messages, wallet |
| `employer.spec.ts` | employer | dashboard, jobs list, applications, post-job form, finance |
| `agent.spec.ts` | agent | dashboard, clients |
| `mentor.spec.ts` | mentor | dashboard, bookings, mentees, finance |
| `admin.spec.ts` | admin | dashboard, finance hub (all 5 tabs), users, job queue, partners, analytics |
| `moderator.spec.ts` | moderator | dashboard + verifies admin-finance is blocked |
| `partner.spec.ts` | partner | dashboard, finance, referrals + verifies admin-finance is blocked |

All specs default to read-mostly assertions to avoid writing junk into live data. The seeker edit-profile test does mutate the `headline` field on the test account and reads it back to verify the round-trip.
