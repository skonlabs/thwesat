# ThweSat — Deep Audit Report
**Date:** 2026-05-18  
**Scope:** Security, Code Quality, Architecture, Performance, UX, New Additions

---

## PRIORITIZED SUMMARY

| Priority | ID | Finding |
|---|---|---|
| **Critical** | SEC-1 | `.env` committed to git with live credentials + plaintext gate password |
| **Critical** | SEC-2 | Supabase anon key hardcoded in `client.ts` source file |
| **High** | SEC-3 | `_get_service_role_key()` function exists in public schema; still in types.ts |
| **High** | SEC-4 | `CompanyProfile.tsx` queries `employer_profiles` base table, exposing PII to all applicants |
| **High** | SEC-5 / CQ-1 | `send-app-email.ts` silently fails all email sends due to REVOKEd column access |
| **High** | SEC-6 | `send-transactional-email` edge function accepts arbitrary recipient emails from any authed user |
| **High** | NEW-2 / PERF-1 | 9.9 MB video files in `public/`, no CDN offloading |
| **Medium** | SEC-7 | Partner UPDATE policies lack `WITH CHECK` — can alter `is_verified`, sensitive columns |
| **Medium** | SEC-8 | `is_suspended` flag has no server-side enforcement in RLS or RPCs |
| **Medium** | CQ-2 | `use-role-labels.ts` casts auth context to `any`, always returns `undefined` for `effectiveRole` |
| **Medium** | CQ-3 | 467 `as any` usages; `strict: false` in tsconfig |
| **Medium** | UX-1 | Job edit does not trigger re-moderation (existing AUDIT.md A7, still unresolved) |
| **Medium** | UX-2 | Apply to closed/expired job not blocked server-side (existing AUDIT.md A9, still unresolved) |
| **Medium** | PERF-3 | `useEmployerJobApplicantBreakdown` fetches all applications with no limit |
| **Low** | SEC-9 | Site-gate is client-side only (documented; low risk if gate password is rotated) |
| **Low** | SEC-10 | No Content Security Policy headers |
| **Low** | CQ-4 | 6 files >694 lines needing decomposition |
| **Low** | UX-4 | 4 `<img>` elements without `alt` attributes (WCAG fail) |

---

## 1. SECURITY

### SEC-1 [CRITICAL] `.env` committed to git with live credentials

**File:** `/.env`

The file is tracked in git (committed since `2bc86d6` — "Restored gate credentials") and contains:
- Live Supabase project URL and anon key
- Plaintext site-gate credentials: `VITE_SITE_GATE_USER=admin`, `VITE_SITE_GATE_PASS=ts@123`

`.gitignore` only excludes `*.local`, not `.env` itself. Anyone with repo read access has these credentials permanently — including in git history even after deletion.

**Fix:** Add `.env` to `.gitignore` immediately. Rotate the site-gate password. Use `.env.example` with placeholder values for documentation.

---

### SEC-2 [CRITICAL] Supabase anon key hardcoded in source file

**File:** `src/integrations/supabase/client.ts:6`

```ts
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

This is committed to source control. While a Supabase anon key is semi-public by design, combined with the known project URL it allows direct API calls outside the app. The file should read from `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY` instead.

---

### SEC-3 [HIGH] `_get_service_role_key()` function exists in public schema

**Files:**
- `supabase/migrations/20260509120255_*.sql` — creates the function reading from `vault.decrypted_secrets`
- `supabase/migrations/20260509120317_*.sql` — REVOKEs EXECUTE from `anon, authenticated, public`
- `src/integrations/supabase/types.ts:2626` — function still in generated types

The REVOKE prevents direct calls from end-user roles, but the function exists in the public schema. Any SECURITY DEFINER function that can be manipulated to call `_get_service_role_key()` would still return the service role key. **Fix:** Drop the function entirely or move it to a non-public schema.

---

### SEC-4 [HIGH] `CompanyProfile.tsx` exposes employer PII to all applicants

**File:** `src/pages/CompanyProfile.tsx:27`

```ts
supabase.from("employer_profiles").select("*").eq("id", id).maybeSingle()
```

The current RLS policy allows any applicant who has applied to a job at this employer to read **all columns** including `contact_email`, `contact_phone`, `contact_name`, and `full_address`. These fields are intentionally hidden in `employer_profiles_public`, but this page bypasses the view entirely and renders the raw fields at lines 191–204.

**Fix:** Change to query `employer_profiles_public`. Restrict the base-table SELECT policy to owner + admin/moderator only.

---

### SEC-5 [HIGH] `send-app-email.ts` silently drops all emails sent by `recipientUserId`

**File:** `src/lib/send-app-email.ts:25`

```ts
supabase.from("profiles").select("email").eq("id", opts.recipientUserId).maybeSingle()
```

Migration `20260507093702` REVOKEs `SELECT (email, phone)` from `authenticated` on `profiles`. The result is always `null`, so `if (!to) return` silently aborts. Every transactional email triggered from the frontend (application status changes, booking confirmations, etc.) is never actually sent when only a `recipientUserId` is provided.

**Fix:** Use `supabase.rpc("get_my_contact_info")` for self-lookups, or add a `get_contact_info_for_notify(_user_id uuid)` SECURITY DEFINER RPC.

---

### SEC-6 [HIGH] `send-transactional-email` edge function allows email abuse

**File:** `supabase/functions/send-transactional-email/index.ts:61`

Any authenticated user can call this function with an arbitrary `recipientEmail` and `templateName`. No check exists that the caller is permitted to email that address. This allows any job seeker to send emails to any address via the platform's verified sending domain (`notify.thwesat.com`), risking domain blacklisting.

**Fix:** Validate `recipientEmail` equals `auth.uid()`'s own email, or gate notification templates to service-role/admin callers only.

---

### SEC-7 [MEDIUM] Partner UPDATE policies lack `WITH CHECK`

**File:** `supabase/migrations/20260514202042_*.sql`

```sql
CREATE POLICY "Partners update employer profiles" ON public.employer_profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'partner'::app_role));
```

No `WITH CHECK` clause means a partner can set `is_verified=true`, `subscription_tier`, and other sensitive columns on any employer profile. Same issue exists on the `profiles` table policy (partners can alter `primary_role`, `is_suspended`).

**Fix:** Add `WITH CHECK` restricting changes to non-sensitive columns, or enforce via SECURITY DEFINER RPCs.

---

### SEC-8 [MEDIUM] `is_suspended` flag has no server-side enforcement

The `profiles.is_suspended` column is set by `set_user_suspended()`, but no RLS policy, trigger, or RPC checks this flag before allowing a suspended user to insert jobs, post community content, apply to jobs, or book mentors. Suspension is only reflected in the admin UI.

**Fix:** Add `AND NOT (SELECT is_suspended FROM public.profiles WHERE id = auth.uid())` to INSERT/UPDATE WITH CHECK clauses on key tables (`jobs`, `applications`, `community_posts`, `mentor_bookings`).

---

### SEC-9 [MEDIUM] Site-gate is client-side only — trivially bypassable

**File:** `src/components/SiteGate.tsx`

Credentials are loaded from `import.meta.env` and compared in JavaScript in the browser. Running `sessionStorage.setItem("site_gate_passed", "1")` from the browser console grants immediate access. This is appropriate as a staging soft-gate only — not a real access control mechanism.

---

### SEC-10 [LOW] No Content Security Policy headers

No CSP meta tags or server headers are configured in `index.html` or `vite.config.ts`. The app renders user-supplied content (community posts, job descriptions, mentor bios). An XSS escape would be unrestricted. Add a CSP as defence-in-depth alongside the existing `sanitize.ts`.

---

## 2. CODE QUALITY

### CQ-1 [HIGH] Silent email failure (see SEC-5)

This is both a security and a functional bug — all transactional emails triggered with `recipientUserId` are silently dropped.

---

### CQ-2 [HIGH] `use-role-labels.ts` always returns `undefined` for `effectiveRole`

**File:** `src/hooks/use-role-labels.ts:10`

```ts
const { effectiveRole } = useAuth() as any;
```

`effectiveRole` is not a property on `AuthContextType`. The cast to `any` silences the TypeScript error but the value is always `undefined`. Role labels always fall back to defaults regardless of the user's actual role.

---

### CQ-3 [MEDIUM] 467 `as any` usages; TypeScript strict mode disabled

`tsconfig.app.json` has `"strict": false` and `"noImplicitAny": false`. Key examples of unsafe `any` usage:
- `src/hooks/use-jobs.ts:317` — returns `any[]`, losing application type info
- `src/hooks/use-partner-finance.ts:46` — entire result typed as `any[]`
- `src/components/settings/MentorPreferencesSection.tsx:53` — `mentorProfile as any` to access `timezone`

---

### CQ-4 [MEDIUM] Large files needing decomposition

| File | Lines | Issue |
|---|---|---|
| `src/pages/EmployerApplications.tsx` | 1,072 | Job list + application detail + status mutation all in one |
| `src/pages/JobDetail.tsx` | 1,063 | Job detail, apply flow, payment, employer card |
| `src/pages/EditProfile.tsx` | 980 | All profile sections + phone picker |
| `src/pages/ProfileBuilder.tsx` | 876 | Full CV parsing and editing |
| `src/pages/Community.tsx` | 775 | Feed, post creation, moderation |
| `src/pages/MentorBooking.tsx` | 694 | All booking steps |

---

### CQ-5 [MEDIUM] `useAllProfiles` and `useSearchTalent` use a `.limit(1000)` hard cap

**File:** `src/hooks/use-profiles.ts:53, 78`

No pagination — as the user base grows, this silently caps results and becomes a performance and accuracy issue.

---

### CQ-6 [LOW] QueryClient exposed on `window`

**File:** `src/App.tsx:85`

`(window as any).__APP_QUERY_CLIENT__` makes the React Query cache inspectable and manipulable from the browser console. This is a developer convenience that should not exist in production builds.

---

### CQ-7 [LOW] Missing error handling in async hooks

Out of 121 `await supabase` calls in `src/hooks/`, only 14 are in try/catch. Mutation functions outside React Query (e.g., `use-auth.tsx:189–191`) have unguarded awaits that silently swallow errors.

---

## 3. ARCHITECTURE

### ARCH-1 [HIGH] Frontend role guards are the primary RBAC mechanism for several admin actions

**Files:** `src/App.tsx`, `src/components/AppRoleGuard.tsx`

`SystemRoleGuard` and `AppRoleGuard` are client-side guards readable from React state. For admin actions like `AdminEmployers.tsx:81` (direct `employer_profiles.update()` with no RPC), the only protection is the client-side guard. Critical admin mutations must be backed by server-side RLS policies or SECURITY DEFINER RPCs.

---

### ARCH-2 [MEDIUM] Inconsistent data access patterns

Direct Supabase calls scattered across page components, bypassing hooks:
- `src/pages/CompanyProfile.tsx:27`
- `src/pages/AdminDashboard.tsx:22`
- `src/pages/EmployerOnboarding.tsx:54, 68`
- `src/pages/Signup.tsx:121`

Some hooks contain entire multi-step mutations; others delegate back to pages. No clear boundary between UI and data layers.

---

### ARCH-3 [MEDIUM] Duplicate RPC definitions across migrations

`wallet_topup_approve` is defined in three separate migration files (`20260505105357`, `20260514202042`, `20260518045750`). The last one wins, but conflicting versions in history create maintenance risk.

---

### ARCH-4 [LOW] Single `ErrorBoundary` at app root

**File:** `src/App.tsx:89`

A single top-level error boundary means any page-level throw produces a blank screen. Page-level boundaries would allow graceful degradation and keep other parts of the app functional.

---

## 4. PERFORMANCE

### PERF-1 [HIGH] 9.9 MB of video assets in `public/` folder

**Files:** `public/videos/seeker-tour.mp4` (6.1 MB), `public/videos/agent-tour.mp4` (3.8 MB)

These are served as static assets, adding ~10 MB to the site footprint. This is particularly costly for Myanmar's target demographic on mobile data. **Fix:** Host on a CDN (Cloudflare R2, Supabase Storage) and reference via URL rather than bundling in `public/`.

---

### PERF-2 [MEDIUM] Skill filter applied client-side after loading 1,000 rows

**File:** `src/hooks/use-profiles.ts:53`

The `filters?.skill` filter is applied in JavaScript after a `.limit(1000)` fetch. Push this to a Postgres `ANY(skills)` filter to reduce data transfer.

---

### PERF-3 [MEDIUM] `useEmployerJobApplicantBreakdown` fetches all applications with no limit

**File:** `src/hooks/use-jobs.ts:336`

A large employer with thousands of applications downloads all of them on every 30-second refetch just to compute a per-job count breakdown. This should be a server-side aggregation query.

---

### PERF-4 [LOW] No route-level code splitting

`framer-motion` v11 is imported in 15+ files. With no `React.lazy` / `Suspense` route splitting in `App.tsx`, all page components and their dependencies load in the initial bundle.

---

## 5. UX / PRODUCT GAPS

### UX-1 [HIGH] Job edit does not trigger re-moderation (AUDIT.md A7, still unresolved)

**File:** `src/pages/EmployerEditJob.tsx`

A verified employer can edit `description`, `requirements`, or `external_url` of an approved listing without triggering re-moderation. This is a moderation bypass allowing policy-violating content to be injected post-approval.

---

### UX-2 [HIGH] Apply to closed/expired job not blocked server-side (AUDIT.md A9, still unresolved)

No server-side guard (RLS INSERT policy or RPC check) prevents applications being submitted to expired or inactive jobs. The RLS INSERT policy does not check `jobs.status = 'active'`.

---

### UX-3 [MEDIUM] `WelcomeTourVideoCard` has no video error handler

**File:** `src/components/WelcomeTourVideoCard.tsx`

The `<video>` element has no `onError` handler. If the video fails to load, the player UI appears functional but nothing plays, with no user feedback.

---

### UX-4 [MEDIUM] Images without `alt` attributes (WCAG 2.1 AA fail)

- `src/pages/PaymentHistory.tsx:168`
- `src/pages/EmployerFinance.tsx:359`
- `src/components/PageHeader.tsx:103`
- `src/pages/AdminPayments.tsx:378`

---

### UX-5 [MEDIUM] Outstanding AUDIT.md P1 issues still unresolved

| ID | Issue |
|---|---|
| A6 | Agent placement fee hardcoded at 8% in `EmployerApplications.tsx:225` |
| A7 | Job edit bypasses re-moderation |
| A9 | Apply to closed job not blocked server-side |
| C1 | Payment request → booking update non-atomic (TODO comment in `use-payment.ts:81`) |
| D6 | Employer verification UI missing — must be done via raw SQL |

---

## 6. NEW ADDITIONS AUDIT

### NEW-1 [INFO] `remotion-sales/` — correctly isolated, not production risk

The Remotion project has its own `package.json` and is excluded from the main app's `tsconfig.app.json`. Vite will not bundle it. No secrets hardcoded.

**Minor issues:**
- Uses `react@19` while the main app uses `react@18` — shared imports would break
- `"typescript": "^6.0.3"` in peer deps — TypeScript 6 is unreleased, will cause install failures
- README is a generic Bun template, not project-specific
- Video is 42 seconds; `WelcomeTourVideoCard.tsx` claims "45 seconds" — copy mismatch

---

### NEW-2 [HIGH] Pre-rendered video assets in `public/` — 9.9 MB bundled with app

See PERF-1. Move to CDN.

---

### NEW-3 [INFO] Updated `logo.svg` is safe

`src/assets/logo.svg` uses only safe SVG primitives. No scripts, `foreignObject`, or event handlers. Has proper `role="img"` and `aria-label`.

---

### NEW-4 [INFO] Previous `AUDIT.md` coverage

Phase 1 P0 items (A1, B1, B2, D3, D4) from the previous audit have been resolved per migration history. Outstanding items from that audit that remain open are flagged as UX-5 above. New issues found in this audit not covered previously: SEC-5, SEC-6, SEC-7, SEC-8.

---

*End of audit report.*
