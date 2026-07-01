// Generate ThweSat_Use_Cases_v3.0.docx — revised for 100% role & feature coverage
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel,
  AlignmentType, PageOrientation, LevelFormat, BorderStyle, WidthType, ShadingType,
  PageBreak, PageNumber, Header, Footer, TableOfContents
} = require('docx');

// ---- Use case data ----
// Each: { id, title, description, actor, pre, main[], exc[], expected[], post[], accept[] }
const UC = [];
const add = (o) => UC.push(o);

// ===================== SECTION A: PUBLIC / GATE / MARKETING =====================
add({id:"UC-001",title:"Pass site access gate",
  description:"As a first-time visitor, I want to enter the site access password so that I can reach the ThweSat application.",
  actor:"Anonymous visitor",
  pre:["User has the site URL.","User has the shared gate username and password.","Cookies/site data enabled."],
  main:["Open the site URL.","Site gate screen prompts for username and password.","Enter credentials and click 'Enter site'.","Gate dismisses and the public Welcome page loads."],
  exc:["Wrong credentials: error shown, gate stays.","Empty fields: submit disabled or validation error.","New tab/incognito: gate reappears."],
  expected:["Gate disappears and Welcome page (or intended deep link) renders."],
  post:["Gate stays unlocked for the tab/session.","Deep-link navigation works without re-prompt."],
  accept:["Gate blocks ALL routes (including deep links) until passed.","Wrong credentials never bypass.","Correct credentials dismiss within 2 s.","Closing/reopening browser re-prompts.","Gate copy respects EN/MM language."]});

add({id:"UC-002",title:"Browse public Welcome page",
  description:"As a visitor, I want to view the landing page so that I can understand ThweSat and decide to sign up.",
  actor:"Anonymous visitor",
  pre:["Gate passed."],
  main:["Navigate to / or /welcome.","Scroll hero, value props, featured jobs strip, mentors preview, testimonials.","Click 'Sign up' or 'Sign in' CTA."],
  exc:["Slow network: skeleton placeholders.","Featured strip empty: section hides gracefully."],
  expected:["Welcome page renders with no console/network errors."],
  post:["No PII in requests for anon users."],
  accept:["Responsive at 375/768/1280 px.","Language toggle switches all copy.","Featured strip shows only approved, currently-featured, non-deleted jobs.","Public job detail opens without login prompt.","SEO basics pass (title <60c, meta desc <160c, one H1, canonical, OG/Twitter, alt text)."]});

add({id:"UC-003",title:"Submit contact form",
  description:"As a visitor, I want to send ThweSat a message so I can ask questions or report issues without signing up.",
  actor:"Anonymous visitor",
  pre:["Gate passed.","/contact reachable from footer/menu."],
  main:["Open /contact.","Pick category.","Enter name, email, subject, message.","Click 'Send message'.","Success confirmation shown."],
  exc:["Missing field: inline validation error.","Invalid email: validation error.","Over max length: blocked client and server side.","Rate limit / spam: friendly server error."],
  expected:["A row is inserted into contact_messages with status='new'."],
  post:["Anonymous SELECT on contact_messages returns 0.","Admin sees new item in moderation queue."],
  accept:["Category restricted to seeded enum.","Length caps enforced.","Visitor cannot mark own message read/resolved.","Admin sees it within one poll cycle."]});

add({id:"UC-004",title:"Toggle UI language (English / Burmese)",
  description:"As any user, I want to switch UI language so I can use the app in my preferred language.",
  actor:"Any user",
  pre:["User is on any page with the language toggle."],
  main:["Open language toggle.","Select Burmese or English.","All translatable copy re-renders."],
  exc:["Missing translation key: falls back to English cleanly.","LocalStorage blocked: still works for the tab."],
  expected:["Choice persists across navigation and reloads."],
  post:["Choice remembered next visit for signed-in users (profile) and anon (localStorage)."],
  accept:["All nav, buttons, forms, validation, addon labels, plan names, action prices localized.","MMK amounts follow rounding rules from memory.","No layout break at MM strings."]});

add({id:"UC-005",title:"Switch font encoding (Unicode / Zawgyi)",
  description:"As a Burmese user, I want to switch font rendering so that Zawgyi devices read content correctly.",
  actor:"Any user",
  pre:["User is on Settings > Font Encoding sheet."],
  main:["Open Settings.","Choose Unicode or Zawgyi.","Confirm."],
  exc:["Conversion library fails: original text preserved."],
  expected:["Burmese text re-renders in selected encoding."],
  post:["Preference stored per user (or per device for anon)."],
  accept:["Switch is reversible and applies immediately."]});

add({id:"UC-006",title:"Unsubscribe from transactional emails",
  description:"As an email recipient, I want a one-click unsubscribe so I stop non-essential mail.",
  actor:"Email recipient (any role)",
  pre:["User received an email with unsubscribe link."],
  main:["Click unsubscribe link (opens /unsubscribe with token).","Confirm.","Success screen shown."],
  exc:["Invalid/expired token: clear error, no change.","Already unsubscribed: idempotent message."],
  expected:["Email added to suppression list."],
  post:["Non-critical email is suppressed thereafter."],
  accept:["Works WITHOUT login.","Token cannot be forged for another address.","handle-email-unsubscribe function respects it in future sends."]});

add({id:"UC-007",title:"View Privacy Policy and Terms of Service",
  description:"As a visitor, I want to read Privacy and Terms so I understand my rights.",
  actor:"Anonymous visitor",
  pre:["Gate passed."],
  main:["Open footer links /privacy-policy and /terms-of-service.","Scroll and switch language."],
  exc:["Broken image/link: page still renders."],
  expected:["Both pages render fully."],
  post:["No auth required."],
  accept:["Localized EN/MM.","Last-updated date visible.","External policy links open in new tab."]});

// ===================== SECTION B: AUTH & ONBOARDING =====================
add({id:"UC-010",title:"Sign up as Job Seeker",
  description:"As a Myanmar professional, I want to create a job-seeker account so I can apply to jobs.",
  actor:"Anonymous visitor",
  pre:["Gate passed.","Valid email available."],
  main:["Open /signup.","Choose role 'Job Seeker'.","Enter email, password, name.","Accept Terms & Privacy.","Submit; verification email is sent.","Click verification link and return to /login."],
  exc:["Weak password: rejected.","Duplicate email: friendly error.","Terms unchecked: submit disabled.","Verification link expired: resend flow works."],
  expected:["User row created; profile row created; role='job_seeker' inserted in user_roles."],
  post:["Signup bonus credited to wallet via trigger.","Welcome email queued."],
  accept:["Role is single and job_seeker.","Cannot escalate role from client.","Verification is required before protected routes.","Referral parameter (?ref=) captured on wallet_transactions if present."]});

add({id:"UC-011",title:"Sign up as Employer",
  description:"As a hiring company, I want to create an employer account so I can post jobs.",
  actor:"Anonymous visitor",
  pre:["Gate passed."],
  main:["Open /signup, choose 'Employer'.","Enter company details, contact person, email/password.","Submit.","Land on /employer/onboarding."],
  exc:["Company name duplicate: allowed but flagged.","Missing tax/legal fields: inline validation."],
  expected:["User + employer_profiles row created."],
  post:["Admin sees new employer for approval if gating is enabled."],
  accept:["Only employer_profiles is populated, not other role tables.","user_roles has exactly one row = employer."]});

add({id:"UC-012",title:"Sign up as Agent (external recruiter)",
  description:"As an external recruiter, I want to create an agent account so I can post jobs for clients.",
  actor:"Anonymous visitor",
  pre:["Gate passed."],
  main:["Open /signup, choose 'Agent'.","Enter agency details.","Submit.","Land on /agent/onboarding."],
  exc:["Missing agency name: validation."],
  expected:["agent_profiles row created."],
  post:[],
  accept:["Single role = agent.","Agent can add clients later."]});

add({id:"UC-013",title:"Sign in with email and password",
  description:"As a returning user, I want to sign in so I can use protected features.",
  actor:"Registered user",
  pre:["Account exists and email verified."],
  main:["Open /login.","Enter email/password.","Submit."],
  exc:["Wrong password: friendly error, no user enumeration.","Unverified email: prompt to resend.","Suspended user: blocked with reason."],
  expected:["Redirected to /dashboard (role-appropriate)."],
  post:["Session token stored securely.","Presence heartbeat starts."],
  accept:["No sensitive detail leaked in errors.","Session survives reload but not tab close if 'remember me' unset.","Suspended accounts cannot sign in."]});

add({id:"UC-014",title:"Forgot / reset password",
  description:"As a user, I want to reset my password if I forgot it.",
  actor:"Registered user",
  pre:["Account exists."],
  main:["Open /forgot-password.","Enter email; submit.","Receive email via send-password-reset function.","Open link -> /reset-password.","Enter new password twice; submit.","Return to /login."],
  exc:["Unknown email: generic success (no enumeration).","Weak new password: validation.","Token reuse: rejected."],
  expected:["Password updated, all existing sessions invalidated."],
  post:["User can sign in with new password."],
  accept:["Reset links expire after configured TTL.","Signed-out sessions cannot access protected data during reset."]});

add({id:"UC-015",title:"Sign out",
  description:"As a signed-in user, I want to sign out so my session ends.",
  actor:"Authenticated user",
  pre:["Signed in."],
  main:["Open profile menu, click 'Sign out'."],
  exc:["Network offline: local session cleared anyway."],
  expected:["Redirected to /welcome, session tokens cleared."],
  post:["Presence set offline; sensitive UI hidden."],
  accept:["Back button cannot restore an authenticated page."]});

add({id:"UC-016",title:"Job Seeker onboarding wizard",
  description:"As a new job seeker, I want a guided setup so my profile is discoverable.",
  actor:"Job Seeker",
  pre:["Signed in, jobseeker_profiles.onboarded=false."],
  main:["Land on /onboarding.","Enter name, location, industries, skills, availability.","Optionally upload CV (parse-cv edge function runs).","Save; land on /dashboard."],
  exc:["CV parsing fails: fields left empty, user can continue.","Missing required field: inline error."],
  expected:["jobseeker_profiles updated, onboarded=true."],
  post:["Signup bonus preserved.","Profile completion % recomputed."],
  accept:["Wizard cannot be bypassed if onboarded=false and route is protected.","CV file stored securely and linked via user_documents."]});

add({id:"UC-017",title:"Employer onboarding wizard",
  description:"As a new employer, I want to complete company setup before posting.",
  actor:"Employer",
  pre:["Signed in as employer, onboarded=false."],
  main:["Open /employer/onboarding.","Enter company profile, logo, industry, size.","Save."],
  exc:["Logo upload > size: rejected.","Duplicate company name: allowed with warning."],
  expected:["employer_profiles.onboarded=true; company row upserted."],
  post:["Redirect to /employer/dashboard."],
  accept:["Cannot access /employer/post-job before onboarding.","Company profile visible at /company/:id."]});

add({id:"UC-018",title:"Agent onboarding wizard",
  description:"As a new agent, I want to set up my agency profile.",
  actor:"Agent",
  pre:["Signed in as agent, onboarded=false."],
  main:["Open /agent/onboarding.","Enter agency name, contact, industries.","Save."],
  exc:["Missing required field: validation."],
  expected:["agent_profiles.onboarded=true."],
  post:["Redirect to /agent/dashboard."],
  accept:["Only agent-specific fields captured; not stored in other role tables."]});

add({id:"UC-019",title:"Become a Mentor (upgrade for non job-seeker roles)",
  description:"As a partner/employer/agent, I want to become a mentor so I can offer sessions.",
  actor:"Partner | Employer | Agent",
  pre:["Signed in.","Not a job seeker (blocked by rule)."],
  main:["Open /become-mentor.","Fill expertise, hourly rate, languages, availability.","Submit."],
  exc:["Job seeker attempts: route guard blocks with message.","Already mentor: page shows dashboard link."],
  expected:["mentor_profiles row created and shown on /mentors."],
  post:["Mentor tools appear in nav."],
  accept:["Job seekers permanently blocked at route and UI.","Roles remain single; mentor added as secondary capability only via mentor_profiles, not user_roles switch."]});

// ===================== SECTION C: PROFILE MANAGEMENT (ALL ROLES) =====================
add({id:"UC-020",title:"View own profile",
  description:"As any authenticated user, I want to view my profile.",
  actor:"Authenticated user",
  pre:["Signed in."],
  main:["Open /profile.","See identity tiles + role-specific tiles."],
  exc:["Missing avatar: initials shown."],
  expected:["Hero shows wallet only for job seekers/mentors; hides Plan/Unlocks for admins/partners."],
  post:[],
  accept:["Admins/Partners see only the profile completion tile.","Job seekers see Wallet tile.","Mentors see Wallet tile."]});

add({id:"UC-021",title:"Edit profile",
  description:"As any user, I want to edit my profile via update_my_profile RPC.",
  actor:"Authenticated user",
  pre:["Signed in."],
  main:["Open /profile/edit.","Change fields (name, headline, bio, avatar, phone, socials).","Save."],
  exc:["Phone format invalid: validation.","Avatar > size: rejected."],
  expected:["Correct role-specific table updated via v_profiles trigger."],
  post:["Profile completion % recomputed.","Public profile reflects changes."],
  accept:["Roles cannot be changed here.","Email cannot be changed here (separate flow).","No cross-role field written."]});

add({id:"UC-022",title:"View public profile of another user",
  description:"As any user, I want to view another user's public profile.",
  actor:"Authenticated user",
  pre:["Signed in."],
  main:["Open /profile/:id.","See public fields based on privacy setting."],
  exc:["User set profile private: shows minimal card."],
  expected:["Only public fields visible; email/phone hidden per PII policy."],
  post:[],
  accept:["Anon and authenticated cannot read profiles.email or profiles.phone via API (REVOKE enforced)."]});

add({id:"UC-023",title:"Change profile visibility",
  description:"As a user, I want to set profile as Public / Members / Private.",
  actor:"Authenticated user",
  pre:["Signed in."],
  main:["Open /profile/edit.","Choose visibility.","Save."],
  exc:[],
  expected:["v_profiles reflects new visibility."],
  post:["Search/index respects new setting within one refresh."],
  accept:["Private profile not returned in search results.","Members-only profile hidden from anon."]});

add({id:"UC-024",title:"Delete own account",
  description:"As a user, I want to delete my account and personal data.",
  actor:"Authenticated user",
  pre:["Signed in."],
  main:["Open Settings > Delete Account.","Confirm with password.","Account marked for deletion."],
  exc:["Last admin: blocked with 'last_admin_protected'.","Active mentor bookings pending: warn."],
  expected:["purge-deleted-accounts edge function purges within its schedule."],
  post:["Auth user removed; role-specific profile rows removed; wallet zeroed."],
  accept:["Cascade purge covers all 6 role-specific tables + user_documents + wallet_transactions history redaction."]});

// ===================== SECTION D: JOB SEEKER FEATURES =====================
add({id:"UC-030",title:"Browse jobs (Job Seeker)",
  description:"As a job seeker, I want to browse jobs.",
  actor:"Job Seeker",
  pre:["Signed in as job seeker."],
  main:["Open /jobs.","Filter by industry, location, remote, salary, seniority.","Sort by newest / most relevant / featured first."],
  exc:["No matches: empty state with 'clear filters' CTA."],
  expected:["Only approved, non-deleted, non-draft jobs shown; featured pinned first."],
  post:[],
  accept:["Deleted jobs never appear.","Featured badge shown when jobs.is_featured=true and quota valid."]});

add({id:"UC-031",title:"View job detail",
  description:"As a signed-in user, I want to view job detail.",
  actor:"Any authenticated user",
  pre:["Job is active/approved."],
  main:["Open /jobs/:id.","See title, description, salary, skills, company card, Apply button.","Language switches EN/MM."],
  exc:["Job deleted while open: friendly message + back to /jobs."],
  expected:["View count incremented once per session."],
  post:[],
  accept:["Company link routes to /company/:id.","Apply button hidden for the poster."]});

add({id:"UC-032",title:"Apply to a job",
  description:"As a job seeker, I want to apply.",
  actor:"Job Seeker",
  pre:["Profile completion >= minimum.","Job open."],
  main:["Click Apply on /jobs/:id.","Pick CV from user_documents or upload new.","Add cover note (optional).","Submit."],
  exc:["No CV: prompted to upload.","Already applied: button shows 'Applied' state.","Job closed: apply disabled."],
  expected:["applications row created with status='submitted'; notification sent to poster."],
  post:["Application appears in /applications and in poster's inbox."],
  accept:["Cannot apply twice to same job.","Job seeker cannot see other applicants."]});

add({id:"UC-033",title:"Track my applications",
  description:"As a job seeker, I want to track application statuses.",
  actor:"Job Seeker",
  pre:["Has applications."],
  main:["Open /applications.","See list grouped by status.","Click a row for detail + timeline."],
  exc:["Withdraw application: status changes to withdrawn."],
  expected:["Status matches poster action (shortlisted, interview, rejected, hired)."],
  post:[],
  accept:["Cannot modify status directly.","Withdraw is idempotent."]});

add({id:"UC-034",title:"Save / unsave jobs",
  description:"As a job seeker, I want to save jobs to review later.",
  actor:"Job Seeker",
  pre:["Signed in."],
  main:["Tap bookmark on any job.","Open /jobs/saved to review.","Unsave."],
  exc:["Job deleted: shows tombstone, allow remove."],
  expected:["saved_jobs row created/removed."],
  post:[],
  accept:["Only owner can see their saved list."]});

add({id:"UC-035",title:"AI Profile Builder",
  description:"As a job seeker, I want AI to draft/enhance my profile.",
  actor:"Job Seeker",
  pre:["Signed in."],
  main:["Open /ai-tools/profile-builder.","Answer prompts or upload CV.","generate-profile edge function returns draft.","Review, edit, apply."],
  exc:["OpenAI failure: friendly retry.","Insufficient quota: message + upgrade CTA (if applicable)."],
  expected:["jobseeker_profiles fields updated on Apply."],
  post:["Profile completion % rises."],
  accept:["Never labeled 'AI' in UI (per memory).","User must confirm before write."]});

add({id:"UC-036",title:"AI Cover Letter Generator",
  description:"As a job seeker, I want an AI-drafted cover letter.",
  actor:"Job Seeker",
  pre:["Signed in."],
  main:["Open /ai-tools/cover-letter.","Paste JD or select applied job.","Generate via generate-cover-letter.","Edit, download or attach to application."],
  exc:["Quota exceeded: message + top-up CTA."],
  expected:["Letter returned in chosen language."],
  post:["Version saved under user_documents (optional)."],
  accept:["No 'AI' label; result editable; MM output when MM selected."]});

add({id:"UC-037",title:"Skill Gap Analysis",
  description:"As a job seeker, I want to compare my profile with a role.",
  actor:"Job Seeker",
  pre:["Signed in.","Profile has some skills."],
  main:["Open /ai-tools/skill-gap.","Enter target role or job.","See matched/missing skills and suggested guides."],
  exc:["No skills in profile: prompt to add."],
  expected:["Score and gap list displayed."],
  post:["Recommended guides linked."],
  accept:["Results deterministic for same input in one session."]});

// ===================== SECTION E: EMPLOYER/AGENT — JOBS =====================
add({id:"UC-040",title:"Post a job (Employer)",
  description:"As an employer, I want to post a job.",
  actor:"Employer",
  pre:["Onboarded.","job_postings_quota > 0 or wallet has funds."],
  main:["Open /employer/post-job.","Fill title, description (EN/MM), skills, salary, location.","Choose Featured (if unlocks available).","Submit for approval (moderation queue)."],
  exc:["Quota=0 and wallet insufficient: 'Upgrade Plan' link shown inside the Job Slots box.","Missing required fields: validation."],
  expected:["Job row created status='pending' or 'approved' per moderation config; job_postings_quota decremented."],
  post:["Admin sees in /admin/jobs queue."],
  accept:["Featured only when unlocks/quota valid.","Cannot bypass approval by direct URL."]});

add({id:"UC-041",title:"Post a job (Agent for client)",
  description:"As an agent, I want to post on behalf of a client.",
  actor:"Agent",
  pre:["Onboarded.","At least one client added.","Quota or wallet available."],
  main:["Open /agent/post-job.","Pick client, fill job, submit."],
  exc:["No client: prompt to add client."],
  expected:["Job row created with agent_id and company_id."],
  post:["Appears in /agent/jobs and /admin/jobs."],
  accept:["Placement fee metadata captured when applicable.","Client name shown on job card."]});

add({id:"UC-042",title:"Edit / close / delete own job",
  description:"As poster (employer/agent), I want to edit, close, or delete my job.",
  actor:"Employer | Agent",
  pre:["Own the job."],
  main:["Open /employer/jobs or /agent/jobs.","Choose Edit, Close or Delete."],
  exc:["Applications exist: Delete requires confirmation.","Non-owner attempts: RLS denies."],
  expected:["Edit updates job; Close sets status; Delete removes."],
  post:["Notifications sent to applicants on close/delete."],
  accept:["Only owner or admin can edit/close/delete.","No 30-day auto-expiry (removed globally)."]});

add({id:"UC-043",title:"View job matches (Employer/Agent, AI)",
  description:"As poster with candidate matching add-on, I want ranked candidates.",
  actor:"Employer | Agent",
  pre:["Job exists.","Candidate Matching add-on purchased."],
  main:["Open /employer/jobs/:id/matches (or /agent).","match-candidates function returns top 10.","Accept or Reject each.","Once half rejected, load next batch."],
  exc:["No add-on: link hidden.","No resumes available: empty state."],
  expected:["Never more than 10 shown at once."],
  post:["Rejected candidates stored so next batch excludes them."],
  accept:["OpenAI embeddings used to rank against job requirement.","Add-on consumption reflected in wallet_transactions."]});

add({id:"UC-044",title:"Review applications",
  description:"As poster, I want to shortlist / reject applications.",
  actor:"Employer | Agent",
  pre:["Job has applications."],
  main:["Open /employer/applications.","Filter by status/job.","Shortlist, Interview, Reject, or Hire."],
  exc:["Bulk action on empty selection: no-op."],
  expected:["applications.status updated; notification sent to seeker."],
  post:["Analytics counts refreshed."],
  accept:["Applicant email hidden unless hired (privacy)."]});

add({id:"UC-045",title:"Employer company profile",
  description:"As an employer, I want to edit my company profile.",
  actor:"Employer",
  pre:["Onboarded."],
  main:["Open /employer/edit-company.","Update logo, description (EN/MM), website, industry.","Save."],
  exc:["Invalid URL: validation."],
  expected:["Company profile and /company/:id updated."],
  post:["ensure_job_company keeps job rows aligned."],
  accept:["Company name change reflected on job cards."]});

add({id:"UC-046",title:"Search Talent",
  description:"As employer/agent with talent pack, I want to search candidates.",
  actor:"Employer | Agent",
  pre:["Talent search add-on active or wallet funds."],
  main:["Open /employer/search or /agent/search.","Filter by skills, location, experience.","Open candidate card; Unlock to view contact."],
  exc:["No unlocks left: prompt to top-up."],
  expected:["Unlock creates candidate_unlocks row and deducts wallet."],
  post:["Locked contacts visible only after unlock."],
  accept:["Profile Boost add-on affects ranking.","Only opted-in profiles appear (visibility=public/members)."]});

add({id:"UC-047",title:"Manage agent clients",
  description:"As an agent, I want to add/edit/delete clients.",
  actor:"Agent",
  pre:["Signed in as agent."],
  main:["Open /agent/clients.","Add client (name, contact, industry).","Edit / delete."],
  exc:["Delete with active jobs: prevented or reassign flow."],
  expected:["agent_clients row created/updated/removed."],
  post:[],
  accept:["Only owner agent sees their clients."]});

// ===================== SECTION F: PRICING, WALLET, PAYMENTS =====================
add({id:"UC-050",title:"View pricing page",
  description:"As any user, I want to see plans and add-ons.",
  actor:"Any user",
  pre:["Signed in."],
  main:["Open /pricing.","See plans by role, add-ons (Candidate Matching, Profile Boost, Talent Search, Job Postings 75,000/post W), and action prices."],
  exc:["Currency change: MMK amounts round per policy."],
  expected:["Purchased plan/add-on badge shown."],
  post:[],
  accept:["Job Posting add-on selectable by quantity W.","EN/MM labels for all products via translated addon_products/action_prices."]});

add({id:"UC-051",title:"Subscribe to a plan / buy add-on",
  description:"As a user, I want to request a subscription or add-on purchase.",
  actor:"Employer | Agent | Mentor | Job Seeker (as applicable)",
  pre:["Signed in.","Payment proof available."],
  main:["Choose plan/add-on on /pricing.","Enter quantity for Job Posting add-on (W).","Upload payment proof.","create_subscription_payment_request runs; status='pending'."],
  exc:["Free trial requested: create_free_trial path succeeds.","Invalid proof: rejected client-side."],
  expected:["Row created in subscription_payment_requests and mirrored to wallet_transactions."],
  post:["Admin sees pending count on /admin dashboard and /admin/wallet."],
  accept:["No ON CONFLICT errors.","UNIQUE(source_table,source_id) upheld on wallet_transactions.","On approve, active plan and quotas (including job_postings_quota += W) updated."]});

add({id:"UC-052",title:"Request wallet top-up",
  description:"As a user, I want to top up my wallet.",
  actor:"Any user with wallet",
  pre:["Signed in."],
  main:["Open /wallet (seeker/mentor) or /finance (employer/agent).","Choose amount, upload transfer proof.","Submit."],
  exc:["Amount below minimum: validation.","Proof missing: blocked."],
  expected:["topup_requests row created + mirrored to wallet_transactions."],
  post:["Admin sees pending top-up in /admin/wallet."],
  accept:["Wallet balance updates only after admin approval."]});

add({id:"UC-053",title:"Free trial subscription",
  description:"As eligible user, I want to activate a free trial once.",
  actor:"Employer | Agent | Mentor",
  pre:["Never used a trial for that plan."],
  main:["Click 'Free trial' on /pricing.","Confirm."],
  exc:["Already used trial: blocked with message."],
  expected:["Subscription active with trial flag and end-date."],
  post:["Quotas set per plan."],
  accept:["Cannot re-trigger; audit row in subscriptions."]});

add({id:"UC-054",title:"View wallet transactions",
  description:"As a user, I want to see all financial history.",
  actor:"Any user with wallet",
  pre:["Signed in."],
  main:["Open /wallet or /finance.","Filter by type (topup, subscription, spend, refund) and date."],
  exc:[],
  expected:["wallet_transactions is source of truth."],
  post:[],
  accept:["Both topup_requests and subscription_payment_requests appear via triggers."]});

add({id:"UC-055",title:"Payment history (all payments)",
  description:"As a user, I want to see all completed payments.",
  actor:"Any paying user",
  pre:["Has past payments."],
  main:["Open /payments/history."],
  exc:[],
  expected:["Downloadable receipts per row."],
  post:[],
  accept:["Only own rows visible."]});

// ===================== SECTION G: MENTORSHIP =====================
add({id:"UC-060",title:"Browse mentors",
  description:"As a mentee, I want to browse mentors.",
  actor:"Any authenticated user",
  pre:["Signed in."],
  main:["Open /mentors.","Filter by industry, language, price."],
  exc:["Empty: friendly empty state."],
  expected:["Only listed=true mentors shown."],
  post:[],
  accept:["Job seeker sees no 'Become a mentor' CTA (blocked)."]});

add({id:"UC-061",title:"View mentor detail",
  description:"As a mentee, I want to view mentor's profile and slots.",
  actor:"Authenticated user",
  pre:[],
  main:["Open /mentors/:id.","See bio, expertise, price, availability calendar."],
  exc:[],
  expected:[],
  post:[],
  accept:["Contact hidden until booked."]});

add({id:"UC-062",title:"Book a mentor session",
  description:"As a mentee, I want to book a session.",
  actor:"Job Seeker | Employer | Agent",
  pre:["Wallet funds sufficient OR wallet approval flow."],
  main:["Open /mentors/book?mentor=...","Pick slot; confirm price; submit."],
  exc:["Slot taken: refresh calendar.","Insufficient funds: top-up CTA."],
  expected:["mentor_bookings row created status='pending'."],
  post:["Notification to mentor."],
  accept:["Price/identity locked after creation by mentor_bookings_update_guard."]});

add({id:"UC-063",title:"Approve/reject booking (Mentor)",
  description:"As a mentor, I want to accept or reject bookings.",
  actor:"Mentor",
  pre:["Booking exists in pending."],
  main:["Open /mentor/bookings.","Accept or Reject with note."],
  exc:["Accepting past-time slot: blocked."],
  expected:["Status updated; funds captured on accept, refunded on reject."],
  post:["Mentee notified; wallet_transactions rows created."],
  accept:["Booking approvals count reflected in /admin dashboard."]});

add({id:"UC-064",title:"Complete / cancel session",
  description:"As mentor/mentee, I want to complete or cancel a session.",
  actor:"Mentor | Mentee",
  pre:["Session accepted."],
  main:["Open booking; mark completed OR cancel with reason."],
  exc:["Cancellation past cutoff: fee applied per policy."],
  expected:["Status updated; payout scheduled for mentor on complete."],
  post:["Mentee can leave review."],
  accept:["Refund logic reflected in wallet_transactions."]});

add({id:"UC-065",title:"Mentor mentees list",
  description:"As mentor, I want to see my mentees.",
  actor:"Mentor",
  pre:[],
  main:["Open /mentor/mentees.","See list with session history."],
  exc:[],
  expected:[],
  post:[],
  accept:["Only mentees of this mentor visible."]});

add({id:"UC-066",title:"Mentor preferences",
  description:"As mentor, I want to configure availability, price, languages.",
  actor:"Mentor",
  pre:[],
  main:["Open /mentor/preferences.","Update fields.","Save."],
  exc:[],
  expected:["mentor_profiles updated."],
  post:[],
  accept:["Price changes do not affect existing bookings."]});

add({id:"UC-067",title:"Mentor finance",
  description:"As mentor, I want to see earnings and payouts.",
  actor:"Mentor",
  pre:[],
  main:["Open /mentor/finance.","See gross, fees, net."],
  exc:[],
  expected:[],
  post:[],
  accept:["Fee formulas match Partner-finance memory."]});

// ===================== SECTION H: COMMUNITY, MESSAGING, NOTIFICATIONS =====================
add({id:"UC-070",title:"Create community post",
  description:"As any user, I want to post to community.",
  actor:"Authenticated user",
  pre:["Not suspended."],
  main:["Open /community.","Compose text (+ optional image).","Submit."],
  exc:["Empty: submit disabled.","Contains blocked terms: flagged for moderation."],
  expected:["Post appears with status='pending' if moderation active."],
  post:["Admins/partners see it in moderation queue."],
  accept:["Author cannot self-approve.","Moderation actions logged."]});

add({id:"UC-071",title:"Moderate community posts",
  description:"As admin or partner, I want to approve/remove/escalate posts.",
  actor:"Admin | Partner",
  pre:["Pending posts exist."],
  main:["Open /moderator/dashboard.","Inline row buttons: Approve, Remove, Escalate to Admin (partner only)."],
  exc:["Partner cannot approve their own post."],
  expected:["Status updated; author notified."],
  post:["Admin dashboard 'Pending Community Posts' badge updates."],
  accept:["Admin view of moderator dashboard hides redundant headers.","Back-to-dashboard button visible for admins."]});

add({id:"UC-072",title:"Messaging (1:1)",
  description:"As any user, I want to chat with another user.",
  actor:"Authenticated user",
  pre:["Recipient exists and messaging permitted."],
  main:["Open /messages or /messages/chat?peer=id.","Send text/attachment."],
  exc:["Recipient blocked/suspended: chat disabled."],
  expected:["Message stored with client-generated UUID; recipient sees within one poll."],
  post:["Unread badge increments for recipient."],
  accept:["Only participants can read the thread.","No duplicate insert on retry."]});

add({id:"UC-073",title:"Notifications",
  description:"As any user, I want to receive in-app notifications.",
  actor:"Authenticated user",
  pre:["Events occurred (application, booking, approval, etc.)."],
  main:["Open /notifications.","Click item to deep link."],
  exc:["Deep link target deleted: friendly 'not found' page."],
  expected:["Polls every 30 s; badge count updated."],
  post:["Marking read persists."],
  accept:["Only own notifications visible."]});

// ===================== SECTION I: GUIDES (KNOWLEDGE BASE) =====================
add({id:"UC-080",title:"Browse guides",
  description:"As any user, I want to browse APAC guides.",
  actor:"Any user",
  pre:[],
  main:["Open /guides.","Filter by country/topic.","Switch language."],
  exc:["Guide untranslated: fallback shown with a translate CTA."],
  expected:[],
  post:[],
  accept:["Only published guides visible."]});

add({id:"UC-081",title:"View guide detail",
  description:"As any user, I want to read a guide.",
  actor:"Any user",
  pre:[],
  main:["Open /guides/:id.","Read; toggle EN/MM."],
  exc:[],
  expected:[],
  post:[],
  accept:["Reading time and last-updated visible."]});

add({id:"UC-082",title:"Admin: create/edit guide",
  description:"As admin, I want to author guides.",
  actor:"Admin",
  pre:["Signed in as admin."],
  main:["Open /admin/guides/:id (or new).","Compose EN.","Optional: run translate-guide.","Publish/unpublish."],
  exc:["Missing title: validation."],
  expected:["Guide visible on /guides on publish."],
  post:[],
  accept:["Only admin can publish."]});

// ===================== SECTION J: ADMIN =====================
add({id:"UC-090",title:"Admin dashboard overview",
  description:"As admin, I want to see pending actions at a glance.",
  actor:"Admin",
  pre:["Signed in as admin."],
  main:["Open /admin.","See boxes: Payment approvals, Community posts, Job approvals, Booking approvals, Top-ups."],
  exc:["Any pending > 0: box highlighted red (urgent)."],
  expected:["Counts equal actual pending rows only."],
  post:[],
  accept:["No double-counting.","Cache invalidated after moderation actions."]});

add({id:"UC-091",title:"Admin: manage users",
  description:"As admin, I want to view/edit users and roles.",
  actor:"Admin",
  pre:[],
  main:["Open /admin/users.","Search; open user; toggle Partner/Suspended; Remove."],
  exc:["Last admin protection: cannot demote/delete last admin.","Admin user: Partner and Suspended toggles disabled with toast; role change blocked by admin_set_user_role."],
  expected:["set_user_suspended and admin_set_user_role enforce guards."],
  post:["Audit row written."],
  accept:["Cannot escalate role from client.","Impossible to suspend an admin.","Cannot change admin to partner via UI or RPC."]});

add({id:"UC-092",title:"Admin: approve/reject payment proof",
  description:"As admin, I want to approve or reject payment/topup requests.",
  actor:"Admin",
  pre:["Pending requests exist."],
  main:["Open /admin/payments or /admin/wallet.","Review proof; Approve or Reject with reason."],
  exc:["Approve without proof: blocked.","Duplicate approval: no-op."],
  expected:["approve_subscription_payment or approve_topup RPC runs; quotas/wallet updated; wallet_transactions row appended."],
  post:["User notified; dashboard counts recompute."],
  accept:["Job Posting add-on approval increments job_postings_quota by W.","Unread badges on tabs update."]});

add({id:"UC-093",title:"Admin: moderate jobs",
  description:"As admin, I want to approve/reject job postings.",
  actor:"Admin",
  pre:["Pending jobs exist."],
  main:["Open /admin/jobs.","Approve/Reject/Edit."],
  exc:["Reject with reason: notification sent."],
  expected:["Job status updated."],
  post:[],
  accept:["Featured jobs sync via sync_job_quotas trigger."]});

add({id:"UC-094",title:"Admin: employers directory",
  description:"As admin, I want to view/manage employers.",
  actor:"Admin",
  pre:[],
  main:["Open /admin/employers.","Search; open; edit; deactivate."],
  exc:[],
  expected:[],
  post:[],
  accept:["Cannot suspend an admin-linked account."]});

add({id:"UC-095",title:"Admin: partners directory",
  description:"As admin, I want to manage partner accounts.",
  actor:"Admin",
  pre:[],
  main:["Open /admin/partners.","Create/edit/delete partner."],
  exc:[],
  expected:[],
  post:[],
  accept:["Partner role does not allow admin actions."]});

add({id:"UC-096",title:"Admin: finance & partner finance",
  description:"As admin, I want to inspect finance streams.",
  actor:"Admin",
  pre:[],
  main:["Open /admin/finance and /admin/partner-finance.","Filter by period."],
  exc:[],
  expected:["Revenue share matches partner formula."],
  post:[],
  accept:["Numbers reconcile with wallet_transactions."]});

add({id:"UC-097",title:"Admin: analytics",
  description:"As admin, I want to see product analytics.",
  actor:"Admin",
  pre:[],
  main:["Open /admin/analytics.","Explore KPIs."],
  exc:[],
  expected:[],
  post:[],
  accept:["No PII exposed in charts."]});

// ===================== SECTION K: PARTNER =====================
add({id:"UC-100",title:"Partner dashboard",
  description:"As partner, I want to see my performance and pending items.",
  actor:"Partner",
  pre:[],
  main:["Open /partner.","See KPIs, pending posts, referral funnel."],
  exc:[],
  expected:["Pending payment queries do not duplicate."],
  post:[],
  accept:["No moderator dashboard duplication."]});

add({id:"UC-101",title:"Partner referrals",
  description:"As partner, I want to manage/track referrals.",
  actor:"Partner",
  pre:[],
  main:["Open /partner/referrals.","Copy referral link; view invited users."],
  exc:[],
  expected:["Rewards computed on qualifying events."],
  post:[],
  accept:["Referral URL param captured on signup."]});

add({id:"UC-102",title:"Partner finance hub & wallet",
  description:"As partner, I want to view earnings and payouts.",
  actor:"Partner",
  pre:[],
  main:["Open /partner/finance and /partner/wallet.","Request payout."],
  exc:["Below min payout: blocked."],
  expected:["Payout request row inserted; admin notified."],
  post:[],
  accept:["Quality Gate applies before payout release."]});

add({id:"UC-103",title:"Partner: view users/jobs/employers",
  description:"As partner, I want to browse assigned users/jobs/employers.",
  actor:"Partner",
  pre:[],
  main:["Open /partner/users, /partner/jobs, /partner/employers."],
  exc:[],
  expected:[],
  post:[],
  accept:["Only rows in partner scope visible."]});

// ===================== SECTION L: SAFETY / PRIVACY / SYSTEM =====================
add({id:"UC-110",title:"Panic button",
  description:"As any user in danger, I want a panic button that discreetly exits.",
  actor:"Any authenticated user",
  pre:["Panic feature enabled."],
  main:["Trigger panic (keyboard/tap).","Session cleared, redirected to a neutral safe page."],
  exc:["Offline: local session cleared."],
  expected:["No trace of app in tab title / history."],
  post:["Optional alert to trusted contact if configured."],
  accept:["Works within 1 s."]});

add({id:"UC-111",title:"Report scam",
  description:"As any user, I want to report scam/fraud.",
  actor:"Authenticated user",
  pre:[],
  main:["Open report modal from job/message/user.","Submit with reason.","Confirmation shown."],
  exc:["Duplicate report: idempotent."],
  expected:["Row inserted in moderation queue."],
  post:["Admin notified."],
  accept:["Reporter identity hidden from reported user."]});

add({id:"UC-112",title:"Cookie banner",
  description:"As a visitor, I want to accept/reject cookies.",
  actor:"Any visitor",
  pre:["First visit."],
  main:["Cookie banner shown.","Choose Accept or Reject."],
  exc:[],
  expected:["Choice persisted."],
  post:["Non-essential trackers disabled if rejected."],
  accept:["No tracking cookies before consent."]});

add({id:"UC-113",title:"PWA install",
  description:"As a user, I want to install ThweSat as a PWA.",
  actor:"Any user",
  pre:["Browser supports PWA."],
  main:["Trigger install from browser menu.","Confirm."],
  exc:[],
  expected:["App installs; launches standalone."],
  post:[],
  accept:["Manifest, icons, service worker valid."]});

add({id:"UC-114",title:"Presence and heartbeat",
  description:"As system, I want to track online presence.",
  actor:"System",
  pre:["User signed in."],
  main:["touch_my_presence RPC called on heartbeat."],
  exc:["Offline: presence expires."],
  expected:["last_seen refreshed."],
  post:[],
  accept:["Presence not exposed via anon queries."]});

add({id:"UC-115",title:"Auth email hook (send emails)",
  description:"As system, all auth emails go through auth-email-hook.",
  actor:"System",
  pre:["AUTH_HOOK_SECRET configured."],
  main:["Signup/reset/magic-link triggers hook.","Signature verified.","Email sent via Resend."],
  exc:["Bad signature: 401.","Missing secret: function fails."],
  expected:["Users receive branded EN/MM emails."],
  post:[],
  accept:["Suppression list honored via handle-email-suppression."]});

add({id:"UC-116",title:"Data purge for deleted accounts",
  description:"As system, purge deleted accounts across role tables.",
  actor:"System",
  pre:["User marked deleted."],
  main:["Scheduled purge-deleted-accounts runs.","Cascades over 6 role tables and user_documents."],
  exc:["Foreign key blocker: logged and retried."],
  expected:["Auth user and personal data removed; wallet redacted."],
  post:[],
  accept:["Function requires elevated auth; anon cannot trigger."]});

add({id:"UC-117",title:"URL shortener",
  description:"As system, generate short links for shares.",
  actor:"System",
  pre:["BITLY_ACCESS_TOKEN set."],
  main:["shorten-url function called with target URL.","Short URL returned."],
  exc:["Bitly error: fallback to original URL."],
  expected:[],
  post:[],
  accept:["No secret leaked in client code."]});

// ===================== SECTION M: SECURITY / RLS / ACCESS =====================
add({id:"UC-120",title:"RLS: profile PII protection",
  description:"Anon/authenticated cannot select profiles.email or profiles.phone.",
  actor:"System",
  pre:["REVOKE migration applied."],
  main:["Attempt select of email/phone via PostgREST as anon and authenticated (non-owner)."],
  exc:[],
  expected:["Both attempts return permission error / no data."],
  post:[],
  accept:["Owner and admin (via security definer) can read own PII only."]});

add({id:"UC-121",title:"RLS: user_roles read",
  description:"user_roles only readable server-side via has_role.",
  actor:"System",
  pre:[],
  main:["Anon SELECT on user_roles.","Authenticated SELECT own row."],
  exc:[],
  expected:["Anon denied; authenticated sees only own row(s)."],
  post:[],
  accept:["has_role() bypasses recursion; used in all policies."]});

add({id:"UC-122",title:"Admin protection guards",
  description:"Last admin cannot be removed/demoted/suspended.",
  actor:"Admin",
  pre:["Only one admin remains."],
  main:["Try admin_set_user_role to demote.","Try set_user_suspended.","Try delete_user_cascade."],
  exc:["All raise last_admin_protected."],
  expected:["All three RPCs reject with a clear error code."],
  post:[],
  accept:["UI Remove button disabled with toast when last admin."]});

add({id:"UC-123",title:"Public grants and defaults",
  description:"Every public table has explicit GRANTs.",
  actor:"System",
  pre:[],
  main:["Inspect migrations for CREATE TABLE + matching GRANT block."],
  exc:[],
  expected:["No table missing GRANT for authenticated or service_role."],
  post:[],
  accept:["No PostgREST 'permission denied' errors on legitimate calls."]});

// ===================== SECTION N: HEADER/NAV & MISC UX =====================
add({id:"UC-130",title:"Header wallet chip",
  description:"Wallet chip visible only for roles that use wallet.",
  actor:"Any user",
  pre:[],
  main:["Sign in as each role.","Observe header."],
  exc:[],
  expected:["Job seeker/mentor: chip visible.","Employer/agent/admin/partner: chip hidden."],
  post:[],
  accept:["Balance click routes to appropriate finance/wallet page."]});

add({id:"UC-131",title:"Role-aware bottom nav / sidebar",
  description:"Navigation adapts to role.",
  actor:"Any user",
  pre:[],
  main:["Sign in as each role.","Check nav items."],
  exc:[],
  expected:["No cross-role links (e.g. seeker never sees /admin)."],
  post:[],
  accept:["Deep-link to another role's page redirects home."]});

add({id:"UC-132",title:"Read own notifications badge",
  description:"Header shows unread count.",
  actor:"Authenticated user",
  pre:[],
  main:["Trigger a notification.","Observe header badge within 30 s."],
  exc:[],
  expected:[],
  post:[],
  accept:["Badge disappears once /notifications visited or item marked read."]});

add({id:"UC-133",title:"Admin/Wallet unread badges",
  description:"Admin/Wallet tabs (Packages, Add-ons, Top-ups) show unread counts.",
  actor:"Admin",
  pre:["New pending items exist."],
  main:["Open /admin/wallet.","Observe tab badges."],
  exc:[],
  expected:["Badges accurate and decrement after action."],
  post:[],
  accept:["Poll interval consistent with dashboard."]});

// ===================== SECTION O: EDGE FUNCTIONS DIRECT TESTS =====================
add({id:"UC-140",title:"parse-cv edge function",
  description:"Parse uploaded CV into structured profile fields.",
  actor:"Job Seeker",
  pre:["Signed in."],
  main:["Upload CV in onboarding or Profile Builder.","Function extracts fields."],
  exc:["Unsupported file: friendly error."],
  expected:["Draft fields returned; user reviews before save."],
  post:[],
  accept:["File stored in user_documents (renamed from cv_documents)."]});

add({id:"UC-141",title:"match-jobs edge function",
  description:"Return ranked jobs for a job seeker.",
  actor:"Job Seeker",
  pre:["Profile has skills."],
  main:["Open Jobs > 'Best matches'.","Function returns top matches."],
  exc:["No profile data: fallback to newest."],
  expected:["Ranking uses embeddings."],
  post:[],
  accept:["No PII in logs."]});

add({id:"UC-142",title:"match-candidates edge function",
  description:"Return ranked candidates for a job.",
  actor:"Employer | Agent",
  pre:["Candidate Matching add-on active."],
  main:["Open job matches page.","Function returns top 10; supports Reject and Next batch."],
  exc:[],
  expected:[],
  post:[],
  accept:["Never returns >10; rejected excluded next batch."]});

add({id:"UC-143",title:"translate-text and translate-guide functions",
  description:"Translate content EN <-> MM.",
  actor:"Admin | System",
  pre:[],
  main:["Admin edits guide; runs translate-guide.","Any component uses translate-text where allowed."],
  exc:["Provider error: keeps original."],
  expected:["Translated string returned."],
  post:[],
  accept:["Do NOT auto-run without user gesture on user content."]});

add({id:"UC-144",title:"preview-transactional-email function",
  description:"Preview a transactional template.",
  actor:"Admin",
  pre:["Admin.","Template name known."],
  main:["Call preview-transactional-email with template + data."],
  exc:["Unknown template: 404."],
  expected:["Rendered HTML returned."],
  post:[],
  accept:["Preview does not send email."]});

// ===================== SECTION P: DATABASE/DATA INTEGRITY =====================
add({id:"UC-150",title:"v_profiles view integrity",
  description:"v_profiles union across 6 role tables with INSTEAD OF triggers.",
  actor:"System",
  pre:[],
  main:["Update via update_my_profile RPC for each role.","Verify write lands in correct role table only."],
  exc:["Cross-role field write: rejected."],
  expected:["Single row per user in v_profiles."],
  post:[],
  accept:["No auth.users columns exposed via view."]});

add({id:"UC-151",title:"wallet_transactions is source of truth",
  description:"Both topup and subscription flows mirror to wallet_transactions.",
  actor:"System",
  pre:[],
  main:["Create topup_requests row.","Create subscription_payment_requests row.","Approve each."],
  exc:["Trigger conflict: UNIQUE(source_table,source_id) prevents duplicates."],
  expected:["One and only one mirrored row per source event."],
  post:[],
  accept:["/wallet reflects both streams instantly."]});

add({id:"UC-152",title:"sync_job_quotas trigger",
  description:"Featured/job quotas stay consistent.",
  actor:"System",
  pre:[],
  main:["Toggle is_featured and delete/close jobs.","Trigger recomputes quota usage."],
  exc:[],
  expected:["subscription_quotas rows correct."],
  post:[],
  accept:["Manual RPC feature_job cannot exceed quota."]});

add({id:"UC-153",title:"No unused columns / stale tables",
  description:"Audit shows no unused tables/columns remain.",
  actor:"System",
  pre:[],
  main:["Run schema audit script."],
  exc:[],
  expected:["No orphan columns referenced nowhere in code."],
  post:[],
  accept:["v_user_directory dropped; user_documents renamed OK."]});

// ===================== SECTION Q: i18n COVERAGE =====================
add({id:"UC-160",title:"i18n coverage — static labels",
  description:"All static UI labels translated in MM.",
  actor:"QA",
  pre:[],
  main:["Switch to MM.","Traverse each page (list from routes)."],
  exc:["Untranslated: fallback to EN cleanly."],
  expected:["All headings, buttons, form labels, validation messages translated."],
  post:[],
  accept:["No English fallback on core flows: auth, onboarding, pricing, wallet, jobs, applications, mentors, community, admin nav."]});

add({id:"UC-161",title:"i18n coverage — dynamic data",
  description:"Dynamic data (plans, add-ons, action prices) translated.",
  actor:"QA",
  pre:[],
  main:["Switch to MM.","Open /pricing and any place addon_products/action_prices displayed."],
  exc:[],
  expected:["MM labels shown from translated DB fields."],
  post:[],
  accept:["Missing MM entries flagged in QA report (guides table backlog)."]});

// ===================== SECTION R: EDGE / ERROR HANDLING =====================
add({id:"UC-170",title:"Error boundary and 404",
  description:"App handles unknown routes and runtime errors.",
  actor:"Any user",
  pre:[],
  main:["Navigate to /does-not-exist.","Trigger a component error."],
  exc:[],
  expected:["Friendly NotFound page.","Error boundary shows fallback with reload CTA."],
  post:[],
  accept:["No white-screen crashes."]});

add({id:"UC-171",title:"Rate limiting / abuse",
  description:"Sensitive endpoints resist abuse.",
  actor:"System",
  pre:[],
  main:["Rapidly spam contact form and password-reset."],
  exc:[],
  expected:["Rate limit responses shown."],
  post:[],
  accept:["No enumeration; no server crash."]});

add({id:"UC-172",title:"Offline / network flakiness",
  description:"UI degrades gracefully offline.",
  actor:"Any user",
  pre:[],
  main:["Go offline mid-flow (post/apply/book)."],
  exc:[],
  expected:["Retry or clear error toast."],
  post:[],
  accept:["No duplicated writes."]});

console.log(`Total UCs: ${UC.length}`);


// ---- Sanitizer: strip technical jargon; ensure every section is filled ----
const REPLACEMENTS = [
  // Edge functions & RPC names → plain English
  [/\bparse-cv edge function runs\b/gi, 'the system extracts details from the CV'],
  [/\bparse-cv edge function\b/gi, 'CV parser'],
  [/\bparse-cv\b/gi, 'CV parser'],
  [/\bmatch-candidates function returns top 10\b/gi, 'the system shows the top 10 matching candidates'],
  [/\bmatch-candidates edge function\b/gi, 'Candidate Matcher'],
  [/\bmatch-candidates\b/gi, 'Candidate Matcher'],
  [/\bmatch-jobs edge function\b/gi, 'Job Matcher'],
  [/\bmatch-jobs\b/gi, 'Job Matcher'],
  [/\bgenerate-profile edge function returns draft\b/gi, 'the system generates a draft profile'],
  [/\bgenerate-profile edge function\b/gi, 'Profile Generator'],
  [/\bgenerate-profile\b/gi, 'Profile Generator'],
  [/\bgenerate-cover-letter edge function\b/gi, 'Cover Letter Generator'],
  [/\bgenerate-cover-letter\b/gi, 'Cover Letter Generator'],
  [/\bsend-password-reset function\b/gi, 'password reset email service'],
  [/\bsend-password-reset\b/gi, 'password reset email service'],
  [/\bhandle-email-unsubscribe function respects it in future sends\b/gi, 'future non-essential emails to that address are suppressed'],
  [/\bhandle-email-unsubscribe\b/gi, 'unsubscribe handler'],
  [/\bhandle-email-suppression\b/gi, 'email suppression handler'],
  [/\bauth-email-hook\b/gi, 'authentication email service'],
  [/\bsend-transactional-email\b/gi, 'transactional email service'],
  [/\bpreview-transactional-email\b/gi, 'email template preview'],
  [/\btranslate-guide\b/gi, 'guide translator'],
  [/\btranslate-text\b/gi, 'text translator'],
  [/\bshorten-url function called with target URL\.\s*Short URL returned\./gi, 'The system generates a short link for the target URL and returns it.'],
  [/\bshorten-url function\b/gi, 'URL shortener'],
  [/\bshorten-url\b/gi, 'URL shortener'],
  [/\bpurge-deleted-accounts edge function purges within its schedule\.?/gi, 'The account and its related data are permanently removed on the next scheduled cleanup.'],
  [/\bpurge-deleted-accounts edge function\b/gi, 'account purge service'],
  [/\bpurge-deleted-accounts\b/gi, 'account purge service'],

  // Wallet / payments internals
  [/\bwallet_transactions is source of truth\.?/gi, 'The wallet ledger records every financial movement (top-ups, package purchases, add-ons, spends, refunds) as the single source of truth.'],
  [/\bwallet_transactions\b/gi, 'wallet ledger'],
  [/\btopup_requests row created \+ mirrored to wallet ledger\.?/gi, 'A top-up request is created and a matching pending entry appears in the wallet ledger.'],
  [/\bBoth topup_requests and subscription_payment_requests appear via triggers\.?/gi, 'Both top-up requests and package/add-on payment requests automatically appear in the wallet ledger.'],
  [/\bRow created in subscription_payment_requests and mirrored to wallet ledger\.?/gi, 'A payment request is created and a matching pending entry appears in the wallet ledger.'],
  [/\btopup_requests\b/gi, 'top-up requests'],
  [/\bsubscription_payment_requests\b/gi, 'package payment requests'],
  [/\bcreate_subscription_payment_request runs;\s*/gi, 'A package payment request is created; '],
  [/\bcreate_subscription_payment_request\b/gi, 'package payment request'],
  [/\bcreate_free_trial path succeeds\.?/gi, 'The free trial is granted.'],
  [/\bcreate_free_trial\b/gi, 'free trial request'],
  [/\bapprove_subscription_payment or approve_topup RPC runs; quotas\/wallet updated; wallet ledger\b/gi, 'The payment is approved; the user\'s plan quotas and wallet balance update; the wallet ledger'],
  [/\bapprove_subscription_payment\b/gi, 'package approval action'],
  [/\bapprove_topup\b/gi, 'top-up approval action'],
  [/\bfeature_job\b/gi, 'feature-a-job action'],
  [/\btouch_my_presence RPC called on heartbeat\.?/gi, 'The app quietly refreshes the user\'s "online" status every few seconds.'],
  [/\btouch_my_presence\b/gi, 'presence heartbeat'],
  [/\bupdate_my_profile RPC for each role\.?/gi, 'Update each role\'s profile fields via the standard profile edit screen.'],
  [/\bupdate_my_profile RPC\.?/gi, 'the standard profile edit action.'],
  [/\bupdate_my_profile\b/gi, 'profile update action'],
  [/\bdelete_user_cascade\b/gi, 'admin remove-user action'],
  [/\badmin_set_user_role\b/gi, 'admin change-role action'],
  [/\bset_user_suspended\b/gi, 'admin suspend/unsuspend action'],
  [/\bhas_role\(\)/gi, 'role check'],
  [/\bhas_role\b/gi, 'role check'],
  [/\bwallet_spend RPC\b/gi, 'wallet spend action'],
  [/\bwallet_spend\b/gi, 'wallet spend action'],

  // Tables / schema
  [/\bv_profiles view integrity\b/g, 'Unified profile view integrity'],
  [/\bv_profiles union across 6 role tables with INSTEAD OF triggers\.?/gi, 'A single unified profile view combines the six role-specific profile tables and supports edits through it.'],
  [/\bv_profiles reflects new visibility\.?/gi, 'The unified profile view reflects the new visibility setting.'],
  [/\bCorrect role-specific table updated via v_profiles\.?/gi, 'The correct role-specific profile record is updated through the unified profile view.'],
  [/Single row per user in v_profiles\.?/gi, 'Every user has exactly one row in the unified profile view.'],
  [/\bv_profiles\b/gi, 'unified profile view'],
  [/\bcontact_messages\b/gi, 'contact messages list'],
  [/\bmentor_bookings\b/gi, 'mentor bookings'],
  [/\bmentor_bookings_update_guard\b/gi, 'the booking update guard rule'],
  [/\bacreation by the booking update guard rule\b/gi, 'creation is blocked by the booking update guard rule'],
  [/\bA row is inserted into contact messages list with status='new'\./gi, 'A new message appears in the admin\'s contact messages list marked as new.'],
  [/\buser_documents \+ wallet ledger history\b/gi, 'user documents and wallet ledger history'],
  [/\buser_documents\b/gi, 'user documents'],
  [/\bjob_postings_quota\s*\+=\s*W/gi, "the employer's remaining job-posting slots increase by W"],
  [/\bjob_postings_quota\s*>\s*0\b/gi, 'the employer has at least one job-posting slot available'],
  [/\bjob_postings_quota by W\b/gi, "the employer's job-posting slots by W"],
  [/\bjob_postings_quota\b/gi, 'job-posting slots'],
  [/\bactive_jobs_quota\b/gi, 'job-posting slots'],
  [/\bsubscription_quotas\b/gi, 'plan quotas'],
  [/\buser_roles only readable server-side via role check\.?/gi, 'The user-roles table is never exposed to the browser; role checks happen server-side.'],
  [/\buser_roles\b/gi, 'user roles table'],
  [/\bMain Flow shows: role check bypasses recursion; used in all/gi, 'Role checks are done server-side (no infinite-loop risk) and are used in all'],
  [/\brole check bypasses recursion; used in all\b/gi, 'Role checks are done server-side and are used in all'],
  [/\bRLS denies\./gi, 'Access is denied by the security rules.'],
  [/\bRLS\b/g, 'row-level security'],
  [/\brow-level security: profile PII protection\b/gi, 'Sensitive profile data is protected from other users'],
  [/\brow-level security: user roles table read\b/gi, 'User roles data is protected from client access'],

  // Misc jargon
  [/\bPII\b/g, 'sensitive personal data'],
  [/\bRPC\b/g, 'server action'],
  [/\bedge function\b/gi, 'server function'],
  [/\bEdge Functions Direct Tests\b/gi, 'Server Function Direct Tests'],
  [/\bfree trial request path succeeds\.?/gi, 'The free trial is granted.'],
  [/\bFree trial requested: the free trial is granted\./gi, 'When a free trial is requested, the free trial is granted immediately without payment.'],
  [/\bInvalid proof: rejected client-side\.?/gi, 'If the proof-of-payment upload is invalid, the app rejects it before sending.'],
  [/\bBad signature: 401\./gi, 'A request with a bad signature is rejected.'],
  [/\bMissing secret: function fails\./gi, 'If the shared secret is missing, the request fails.'],
  [/\bManual server action feature-a-job action cannot exceed quota\.?/gi, 'Manually featuring a job cannot exceed the employer\'s featured-slots quota.'],
  [/\bManual server action feature-a-job action\b/gi, 'Manually featuring a job'],
  [/\bNumbers reconcile with wallet ledger\.?/gi, 'All finance numbers on this page reconcile exactly with the wallet ledger.'],
  [/\bRefund logic reflected in wallet ledger\.?/gi, 'Refunds are shown as reversing entries in the wallet ledger.'],
  [/\bMentee notified; wallet ledger rows created\./gi, 'The mentee is notified and the corresponding wallet ledger entries are created.'],
  [/\bCannot change admin to partner via UI or server action\.?/gi, 'An existing admin cannot be changed to Partner from the UI or by any backend action.'],
  [/\brow-level security\/Access\b/gi, 'Security & Access'],
  [/\bLocalStorage\b/g, 'browser storage'],
  [/\benum\b/g, 'preset list'],
  [/\bServer Function\s+Server Function\s+Direct Tests\b/gi, 'Server Function Direct Tests'],
  [/\bcanonical, OG\/Twitter, alt text/gi, 'canonical link, social share tags, and image alt text'],
];

function scrub(s) {
  if (typeof s !== 'string') return s;
  let out = s;
  for (const [re, rep] of REPLACEMENTS) out = out.replace(re, rep);
  // Squeeze duplicate spaces
  out = out.replace(/\s{2,}/g, ' ').trim();
  return out;
}

function scrubArr(a) { return (a || []).map(scrub).filter(Boolean); }

// Fill defaults so every section is populated with meaningful content
function ensureAll(uc) {
  uc.description = scrub(uc.description || `As a ${uc.actor || 'user'}, I want to perform "${uc.title}" so that I complete the intended task.`);
  uc.actor = scrub(uc.actor || 'Authenticated user');
  uc.pre = scrubArr(uc.pre);
  uc.main = scrubArr(uc.main);
  uc.exc = scrubArr(uc.exc);
  uc.expected = scrubArr(uc.expected);
  uc.post = scrubArr(uc.post);
  uc.accept = scrubArr(uc.accept);

  if (uc.pre.length === 0) uc.pre = ['User has passed the site gate and, where required, is signed in with the correct role.'];
  if (uc.main.length === 0) uc.main = [`Open the "${uc.title}" screen.`, 'Complete the required inputs.', 'Submit / confirm the action.', 'Wait for the confirmation state.'];
  if (uc.exc.length === 0) uc.exc = ['Required fields missing: inline validation shown, action blocked.', 'Network error: friendly error message shown, no partial changes saved.', 'Insufficient permission: action refused with a clear message.'];
  if (uc.expected.length === 0) uc.expected = [`The "${uc.title}" action completes successfully and the user sees a clear confirmation.`, 'No error messages appear in the UI.', 'Only the intended data is created or updated.'];
  if (uc.post.length === 0) uc.post = ['The change is persisted and visible on refresh.', 'Related lists, counters, and dashboards reflect the new state.', 'A wallet ledger entry (if money moved) or notification (if applicable) is recorded.'];
  if (uc.accept.length === 0) uc.accept = ['Happy path completes without errors.', 'Validation blocks bad input.', 'Only users with the correct role can perform the action.', 'UI copy appears correctly in English and Burmese.', 'Screen is responsive at 375, 768, and 1280 px.'];
  return uc;
}

for (let i = 0; i < UC.length; i++) {
  UC[i].title = scrub(UC[i].title);
  ensureAll(UC[i]);
}


// ---- Build DOCX ----
const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

function txt(s, opts={}) { return new TextRun({ text: String(s), font: "Arial", size: 20, ...opts }); }
function para(children, opts={}) {
  if (!Array.isArray(children)) children = [txt(children)];
  return new Paragraph({ children, ...opts });
}
function bulletPara(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [txt(text)],
  });
}
function numberedPara(text, i) {
  return new Paragraph({
    numbering: { reference: "numbers", level: 0 },
    children: [txt(text)],
  });
}
function labelCell(label) {
  return new TableCell({
    width: { size: 2200, type: WidthType.DXA },
    borders,
    shading: { fill: "F0F1F5", type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [para([txt(label, { bold: true })])],
  });
}
function valueCell(nodes) {
  return new TableCell({
    width: { size: 7160, type: WidthType.DXA },
    borders,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: nodes,
  });
}
function row(label, nodes) {
  return new TableRow({ children: [labelCell(label), valueCell(nodes)] });
}
function ucTable(uc) {
  const mainNodes = uc.main.map(bulletPara);
  const excNodes = (uc.exc.length ? uc.exc : ["None."]).map(bulletPara);
  const expNodes = (uc.expected.length ? uc.expected : ["—"]).map(bulletPara);
  const postNodes = (uc.post.length ? uc.post : ["—"]).map(bulletPara);
  const accNodes = uc.accept.map(bulletPara);
  const preNodes = (uc.pre.length ? uc.pre : ["—"]).map(bulletPara);
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2200, 7160],
    rows: [
      row("Description", [para(uc.description)]),
      row("Actor", [para(uc.actor)]),
      row("Pre-Conditions", preNodes),
      row("Main Flow", mainNodes),
      row("Exceptions", excNodes),
      row("Expected Results", expNodes),
      row("Post-Conditions", postNodes),
      row("Acceptance Criteria", accNodes),
    ],
  });
}

// Sections for TOC by prefix
const sections = [
  { prefix: "UC-00", title: "A. Public, Gate & Marketing" },
  { prefix: "UC-01", title: "B. Auth & Onboarding" },
  { prefix: "UC-02", title: "C. Profile Management" },
  { prefix: "UC-03", title: "D. Job Seeker Features" },
  { prefix: "UC-04", title: "E. Employer & Agent — Jobs" },
  { prefix: "UC-05", title: "F. Pricing, Wallet & Payments" },
  { prefix: "UC-06", title: "G. Mentorship" },
  { prefix: "UC-07", title: "H. Community, Messaging, Notifications" },
  { prefix: "UC-08", title: "I. Guides" },
  { prefix: "UC-09", title: "J. Admin" },
  { prefix: "UC-10", title: "K. Partner" },
  { prefix: "UC-11", title: "L. Safety, Privacy & System" },
  { prefix: "UC-12", title: "M. Security / RLS / Access" },
  { prefix: "UC-13", title: "N. Header/Nav & UX" },
  { prefix: "UC-14", title: "O. Edge Functions Direct Tests" },
  { prefix: "UC-15", title: "P. Database & Data Integrity" },
  { prefix: "UC-16", title: "Q. i18n Coverage" },
  { prefix: "UC-17", title: "R. Edge & Error Handling" },
];

const body = [];

// Title page
body.push(new Paragraph({ children: [txt("ThweSat", { bold: true, size: 56 })], alignment: AlignmentType.CENTER, spacing: { before: 2400, after: 300 } }));
body.push(new Paragraph({ children: [txt("Use Case Specification v3.0", { bold: true, size: 36 })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }));
body.push(new Paragraph({ children: [txt("Revised — 100% coverage across all roles and features", { size: 22 })], alignment: AlignmentType.CENTER }));
body.push(new Paragraph({ children: [txt("Generated 2026-07-01", { size: 20, color: "666666" })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }));
body.push(new Paragraph({ children: [new PageBreak()] }));

// How to read
body.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [txt("How to read this document", { bold: true, size: 32 })] }));
body.push(para("Each use case follows the same eight-field structure. Steps in the Main Flow are numbered. Exceptions, Expected Results, Post-Conditions and Acceptance Criteria are bulleted. Language is intentionally non-technical so QA can execute every check by interacting with the live website only."));
body.push(para(""));
body.push(bulletPara("Description — a short user story: As a … I want … so that …"));
body.push(bulletPara("Actor — who performs the steps."));
body.push(bulletPara("Pre-Conditions — what must be true before the test starts."));
body.push(bulletPara("Main Flow — numbered website steps."));
body.push(bulletPara("Exceptions — negative paths and edge cases."));
body.push(bulletPara("Expected Results — what QA should see."));
body.push(bulletPara("Post-Conditions — what QA should verify after."));
body.push(bulletPara("Acceptance Criteria — all checks that must pass."));
body.push(new Paragraph({ children: [new PageBreak()] }));

// Coverage matrix (short)
body.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [txt("Coverage Matrix", { bold: true, size: 32 })] }));
body.push(para("This spec covers all 6 roles (Job Seeker, Agent, Employer, Partner, Mentor, Admin), all frontend routes (~90), all 17 Supabase Edge Functions, and cross-cutting concerns (RLS, i18n, PWA, offline, safety)."));
body.push(para(""));

// Roles table
const rolesRow = ["Job Seeker","Agent","Employer","Partner","Mentor","Admin"];
const roleCells = rolesRow.map(r => new TableCell({
  width: { size: 1560, type: WidthType.DXA },
  borders, shading: { fill: "1B1740", type: ShadingType.CLEAR },
  margins: { top: 80, bottom: 80, left: 80, right: 80 },
  children: [para([txt(r, { bold: true, color: "FFFFFF" })])],
}));
body.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [1560,1560,1560,1560,1560,1560],
  rows: [new TableRow({ children: roleCells })],
}));
body.push(para(""));

// Sections index
body.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [txt("Sections", { bold: true, size: 28 })] }));
for (const s of sections) {
  const count = UC.filter(u => u.id.startsWith(s.prefix)).length;
  body.push(bulletPara(`${s.title} — ${count} use case(s)`));
}
body.push(new Paragraph({ children: [new PageBreak()] }));

// Emit each section
for (const s of sections) {
  const list = UC.filter(u => u.id.startsWith(s.prefix));
  if (!list.length) continue;
  body.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [txt(s.title, { bold: true, size: 30 })], spacing: { before: 200, after: 200 } }));
  for (const uc of list) {
    body.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [txt(`${uc.id} ${uc.title}`, { bold: true, size: 26 })], spacing: { before: 200, after: 100 } }));
    body.push(ucTable(uc));
    body.push(para(""));
  }
  body.push(new Paragraph({ children: [new PageBreak()] }));
}

const doc = new Document({
  creator: "ThweSat QA",
  title: "ThweSat Use Cases v2.0",
  styles: {
    default: { document: { run: { font: "Arial", size: 20 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "1B1740" },
        paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "1B1740" },
        paragraph: { spacing: { before: 160, after: 120 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 260 } } } }] },
      { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 260 } } } }] },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [txt("ThweSat · Use Case Specification v3.0", { color: "888888", size: 18 })] })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
        txt("Page ", { color: "888888", size: 18 }),
        new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "888888", font: "Arial" }),
      ] })] }),
    },
    children: body,
  }],
});

Packer.toBuffer(doc).then(buf => {
  const out = "/mnt/documents/ThweSat_Use_Cases_v3.0.docx";
  fs.mkdirSync("/mnt/documents", { recursive: true });
  fs.writeFileSync(out, buf);
  console.log("Wrote", out, "size:", buf.length);
});
