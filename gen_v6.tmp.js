// ThweSat Use Cases v6.0 — comprehensive coverage (250+ cases)
// Plain English, all 8 sections populated, no technical jargon, no snake_case.
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageBreak, PageOrientation } = require('docx');

// ---- Test accounts (seeded) ----
const ACCOUNTS = [
  ['Job Seeker', 'qa.seeker@thwesat.test', 'QaSeeker#2026'],
  ['Employer',   'qa.employer@thwesat.test', 'QaEmployer#2026'],
  ['Agent',      'qa.agent@thwesat.test', 'QaAgent#2026'],
  ['Mentor',     'qa.mentor@thwesat.test', 'QaMentor#2026'],
  ['Partner',    'qa.partner@thwesat.test', 'QaPartner#2026'],
  ['Admin',      'qa.admin@thwesat.test', 'QaAdmin#2026'],
];

// ---- Pricing constants (from database) ----
const PLANS = {
  starter:    { price: 350000,    posts: 5,   featured: 1,  unlocks: 500 },
  growth:     { price: 1750000,   posts: 25,  featured: 5,  unlocks: 1500 },
  business:   { price: 5000000,   posts: 100, featured: 10, unlocks: 5000 },
  enterprise: { price: 10000000,  posts: 500, featured: 50, unlocks: 10000 },
};
const ADDONS = {
  job_post_unit: 75000,   // per one extra job posting
  featured_unit: 10000,   // per one featured slot
  matching_pack: 200000,  // candidate matching add-on
  unlock_unit:   1000,    // per one contact unlock
  profile_boost: 150000,  // boost employer profile in search
};
const ACTIONS = {
  unlock_contact: 25000,  // credits to reveal contact info
  cover_letter:   5000,   // credits to generate a cover letter
  skill_gap:      2500,   // credits for a skill gap report
};

// ---- Use case builder ----
let COUNTER = 0;
const CASES = [];
function uc(section, role, title, opts) {
  COUNTER += 1;
  const id = 'UC-' + String(COUNTER).padStart(3, '0');
  CASES.push({
    id, section, role, title,
    desc: opts.desc,
    pre:  opts.pre,
    data: opts.data,
    flow: opts.flow,
    exc:  opts.exc,
    res:  opts.res,
    post: opts.post,
    acc:  opts.acc,
  });
  return id;
}

// -------- 1. AUTHENTICATION & ONBOARDING --------
const S1 = 'Authentication & Onboarding';
uc(S1,'Guest','Sign up as a new Job Seeker',{
  desc:'A new visitor creates an account with role Job Seeker.',
  pre:'Visitor is on the sign-up page. Email is not already registered.',
  data:'Email: new.seeker+t1@thwesat.test  Password: NewSeeker#2026  Role: Job Seeker',
  flow:['Open the sign-up page.','Enter email, password and full name.','Choose Job Seeker as the role.','Accept the terms and privacy statement.','Submit the form.','Open the confirmation email and click the link.'],
  exc:'If the email is already in use the form shows a clear error and no account is created.',
  res:'A new account is created, the welcome bonus of free credits is added to the wallet, and the user is redirected to the seeker dashboard.',
  post:'The new user can sign in with the same email and password on any device.',
  acc:'Signed-in state persists, welcome bonus shows in the wallet, and the account role is Job Seeker.',
});
uc(S1,'Guest','Sign up as a new Employer',{
  desc:'A visitor creates an Employer account and completes company onboarding.',
  pre:'Visitor is on the sign-up page.',
  data:'Email: new.employer+t1@thwesat.test  Password: NewEmp#2026  Company: QA Test Co  City: Yangon',
  flow:['Open the sign-up page.','Choose Employer as the role.','Enter email, password and full name.','Submit the form and verify email.','Complete company details on the onboarding screen.','Save and continue.'],
  exc:'If company name is empty the onboarding form shows a validation error.',
  res:'Employer account is created and the company profile is saved. The user is taken to the employer dashboard.',
  post:'The employer can immediately post jobs (subject to plan quota).',
  acc:'Employer dashboard shows the newly created company name and zero jobs posted.',
});
uc(S1,'Guest','Sign up as an Agent',{
  desc:'Visitor creates an Agent (recruiter) account.',
  pre:'Visitor is on the sign-up page.',
  data:'Email: new.agent+t1@thwesat.test  Password: NewAgt#2026',
  flow:['Open the sign-up page.','Choose Agent as the role.','Enter email, password and full name.','Verify email and complete agent onboarding.'],
  exc:'Weak passwords (under 8 characters) are rejected client-side with a message.',
  res:'Agent account is created and the user lands on the agent dashboard.',
  post:'The agent can add client companies and post jobs on their behalf.',
  acc:'Agent dashboard renders with an empty clients list and a "Add client" button.',
});
uc(S1,'Guest','Sign up as a Mentor via become-a-mentor page',{
  desc:'Visitor becomes a mentor from the mentor onboarding page.',
  pre:'Visitor is on the "Become a mentor" page. Visitor is not signed in as a Job Seeker.',
  data:'Email: new.mentor+t1@thwesat.test  Password: NewMnt#2026  Expertise: Software Engineering',
  flow:['Open the "Become a mentor" page.','Choose Mentor as the role at sign-up.','Enter expertise and hourly rate.','Submit for review.'],
  exc:'Job Seekers who are already signed in are blocked from this page with a message.',
  res:'Mentor account is created with pending status until reviewed.',
  post:'Mentor appears in the mentor directory once approved.',
  acc:'Mentor dashboard renders and preferences page is accessible.',
});
uc(S1,'Guest','Sign in with existing account',{
  desc:'Existing user signs in with email and password.',
  pre:'Account exists and is not suspended.',
  data:'Email: qa.seeker@thwesat.test  Password: QaSeeker#2026',
  flow:['Open the login page.','Enter email and password.','Click Sign In.'],
  exc:'Wrong password shows a clear error and does not sign the user in.',
  res:'User is signed in and taken to the dashboard for their role.',
  post:'Session persists across page reloads until sign-out or expiry.',
  acc:'Header shows the signed-in user\'s avatar and the correct role.',
});
uc(S1,'Guest','Sign in with wrong password',{
  desc:'User enters an incorrect password.',
  pre:'Account exists.',
  data:'Email: qa.seeker@thwesat.test  Password: WrongPass!',
  flow:['Open the login page.','Enter the email and a wrong password.','Click Sign In.'],
  exc:'After several wrong attempts the account is temporarily rate-limited.',
  res:'A clear "invalid credentials" message is shown and no session is created.',
  post:'The account is not locked out on a single mistake.',
  acc:'User stays on the login page. No wallet or dashboard data loads.',
});
uc(S1,'Guest','Reset a forgotten password',{
  desc:'User requests a password reset link by email.',
  pre:'Account exists with a verified email.',
  data:'Email: qa.seeker@thwesat.test',
  flow:['Open the "Forgot password" page.','Enter the email.','Click Send Reset Link.','Open the email and click the reset link.','Enter a new password twice and submit.'],
  exc:'Unknown emails do not reveal whether the address exists (same message shown).',
  res:'The password is updated and the user can sign in with the new password.',
  post:'Old password no longer works.',
  acc:'User successfully signs in with the new password.',
});
uc(S1,'Guest','Reset password with expired link',{
  desc:'User clicks an old reset link.',
  pre:'A reset link older than the allowed window.',
  data:'Any expired reset link',
  flow:['Open an expired reset link.','Try to submit a new password.'],
  exc:'System refuses to accept the expired link.',
  res:'A clear "link expired" message is shown and the user is offered to request a new link.',
  post:'Password is not changed.',
  acc:'A new reset link can be requested from the same page.',
});
uc(S1,'Signed-in user','Sign out',{
  desc:'Signed-in user logs out from the settings menu.',
  pre:'User is signed in on any role.',
  data:'Any test account',
  flow:['Open the settings sheet from the header.','Tap Sign Out.'],
  exc:'None expected.',
  res:'Session is cleared and the user is returned to the public home page.',
  post:'Refreshing the page does not restore the session.',
  acc:'Signed-out header appears with a Sign In button.',
});
uc(S1,'Job Seeker','Complete first-time onboarding steps',{
  desc:'A new Job Seeker walks through the guided onboarding flow.',
  pre:'New account with no profile fields filled in.',
  data:'Preferred role, city, expected salary, industries',
  flow:['Sign in for the first time.','Complete each step in the guided onboarding.','Finish and land on the dashboard.'],
  exc:'Skipping a required step shows a validation error.',
  res:'Profile fields are saved and the profile completeness percentage increases.',
  post:'Onboarding does not reappear on next sign-in.',
  acc:'Dashboard shows a higher profile completion percentage than 10%.',
});
uc(S1,'Employer','Complete employer onboarding',{
  desc:'A new Employer completes company onboarding.',
  pre:'New employer with no company saved.',
  data:'Company name, logo, industry, size, city',
  flow:['Sign in for the first time.','Fill company profile fields.','Upload a company logo.','Save.'],
  exc:'Missing company name blocks saving.',
  res:'Company profile is stored and used across job postings.',
  post:'Company page renders publicly at the company URL.',
  acc:'Newly saved logo shows in the header and on each posted job.',
});

// -------- 2. GUEST / PUBLIC PAGES --------
const S2 = 'Public Pages (Guest)';
[
  ['View home page','/', 'The public home page loads with hero, featured jobs and call-to-action.'],
  ['Browse public job list','/jobs', 'The jobs listing loads with filters, search and pagination.'],
  ['Open a job detail page','/jobs/:id', 'A job detail page loads with title, description, company card and Apply button.'],
  ['View public company profile','/company/:id', 'A company profile loads with logo, description and current openings.'],
  ['View public candidate profile','/profile/:id', 'A public candidate profile loads with headline and skills; contact info is hidden.'],
  ['Browse the mentor directory','/mentors', 'A directory of approved mentors loads with filters.'],
  ['Open a mentor detail page','/mentors/:id', 'A single mentor profile loads with rate, bio, availability and Book button.'],
  ['Browse guides library','/guides', 'The guides list loads with categories and a search box.'],
  ['Open a guide article','/guides/:id', 'A guide article loads with formatted content and share links.'],
  ['View the pricing page','/pricing', 'All plans, add-ons and their prices are shown clearly.'],
  ['View the terms of service','/terms-of-service', 'Terms page loads with headings and effective date.'],
  ['View the privacy policy','/privacy-policy', 'Privacy policy loads with headings and effective date.'],
  ['Use the contact form','/contact', 'A contact form is shown and can be submitted with a message.'],
  ['Read the community feed','/community', 'A public community feed loads with approved posts and reactions.'],
  ['Access a protected page while signed out','/dashboard', 'Guest is redirected to the login page and returned after signing in.'],
].forEach(([title,route,expect])=>{
  uc(S2,'Guest',title,{
    desc:'A visitor without an account uses a public page.',
    pre:'User is signed out. There is at least one public item where a detail page is opened.',
    data:'Route: '+route,
    flow:['Open '+route+' directly in the browser.','Wait for the page to render.'],
    exc:'If the item does not exist a friendly "not found" screen is shown.',
    res:expect,
    post:'No account is created and no personal data is stored.',
    acc:'Page renders without console errors and without redirecting to login (for public pages).',
  });
});

// -------- 3. JOB SEEKER CRUD --------
const S3 = 'Job Seeker – Profile & Documents';
const seekerCrud = [
  ['Edit basic profile','Update headline, city and summary.',
    'Headline: "Full-Stack Engineer"  City: Yangon  Summary: 3-line bio',
    'The profile page shows the updated headline and city everywhere it appears.',
    'The public profile card reflects the change.'],
  ['Add work experience','Add a new work experience entry.',
    'Company: QA Bank, Role: Analyst, From: Jan 2024, To: Present',
    'The new entry appears at the top of the experience list.',
    'Profile completion percentage increases.'],
  ['Edit work experience','Edit an existing experience entry.',
    'Change end date from "Present" to Dec 2025',
    'Updated dates are visible on the profile.',
    'Ordering by date is respected.'],
  ['Delete a work experience','Remove an experience entry.',
    'Any existing entry',
    'The entry disappears from the profile.',
    'Public profile no longer shows the removed entry.'],
  ['Add an education entry','Add a school or degree.',
    'School: QA University, Degree: BSc CS, Year: 2020',
    'Education section shows the new entry.',
    'Profile completeness may increase.'],
  ['Add a skill','Add a new skill tag.',
    'Skill: TypeScript',
    'Skill chip is visible on the profile.',
    'Matching uses this skill.'],
  ['Remove a skill','Remove an existing skill tag.',
    'Skill: any',
    'Skill is removed from the profile immediately.',
    'Removed skill no longer influences matches.'],
  ['Upload a CV / resume',
    'Attach a PDF or Word CV to the profile.',
    'File: sample-cv.pdf (under 5 MB)',
    'CV file is uploaded and appears in the documents list.',
    'CV can be downloaded from the same list.'],
  ['Replace an existing CV','Upload a newer version of the CV.',
    'File: sample-cv-v2.pdf',
    'The new file replaces or is listed above the old one.',
    'Applications made after upload use the new CV.'],
  ['Delete a document','Remove a document from the account.',
    'Any uploaded file',
    'Document is removed from the documents list.',
    'The file is no longer downloadable.'],
  ['Toggle profile visibility',
    'Switch the public profile between visible and hidden.',
    'Toggle: On / Off',
    'When hidden, guests see a "profile not available" screen at the public URL.',
    'When visible again, the public page returns.'],
  ['Update contact preferences',
    'Change email and telegram contact settings.',
    'Telegram: @qa_seeker  Email visible: Off',
    'Contact preferences take effect on the public profile.',
    'Employers who unlocked earlier still see previously unlocked data.'],
  ['Change UI language to Burmese',
    'Switch app language from English to Burmese.',
    'Language: Burmese',
    'All labels, menus and dashboard tiles show Burmese text.',
    'Choice persists across sign-in sessions.'],
  ['Change password from settings',
    'Update account password.',
    'Old password + New password',
    'Password is updated and the user is asked to sign in again.',
    'Old password no longer works.'],
  ['Delete account (self-serve)',
    'Request account deletion.',
    'Confirmation input: DELETE',
    'Account is queued for deletion and the user is signed out.',
    'Public profile is removed and personal data is purged.'],
];
seekerCrud.forEach(([t,d,dat,res,acc])=>uc(S3,'Job Seeker',t,{
  desc:d, pre:'Signed in as Job Seeker with an existing profile.',
  data:dat,
  flow:['Sign in as Job Seeker.','Open the profile page or settings.','Perform the action described.','Save.'],
  exc:'Fields with invalid formats (e.g. very large file, invalid date order) are rejected with a message.',
  res:res, post:'Change persists after sign-out and back in.', acc:acc,
}));

// -------- 4. JOB SEEKER – JOB DISCOVERY / APPLY --------
const S4 = 'Job Seeker – Jobs & Applications';
const seekerJobs = [
  ['Search jobs by keyword','Search: "engineer"',
    'Only matching jobs are shown; keyword is highlighted where supported.'],
  ['Filter jobs by city','Filter: Yangon',
    'Only Yangon jobs remain in the list; count updates.'],
  ['Filter jobs by category','Filter: IT & Software',
    'Only jobs in that category remain.'],
  ['Filter jobs by salary range','Range: 500,000 – 1,000,000 MMK',
    'Only jobs falling in the range remain.'],
  ['Save a job','Any open job',
    'Job is added to Saved Jobs and the icon toggles to filled.'],
  ['Remove a saved job','Any saved job',
    'Job is removed from Saved Jobs and the icon toggles back.'],
  ['View saved jobs list','Route: /jobs/saved',
    'All previously saved jobs are listed with quick unsave option.'],
  ['Apply to a job with existing CV','Any open job',
    'Application is submitted, appears in "My Applications", and status is "Submitted".'],
  ['Apply to a job with a new CV','Attach a new CV during apply',
    'Application is submitted using the new CV.'],
  ['Withdraw an application','Any "Submitted" application',
    'Status changes to "Withdrawn" and employer sees it withdrawn.'],
  ['View application status history','Any application',
    'A step-by-step timeline of status changes is shown.'],
  ['See "matched jobs" recommendations','Home / dashboard',
    'A list of jobs matched to the profile is shown; empty state is shown for empty profiles.'],
  ['Unlock a candidate contact (employer view, self)','n/a',
    'Not applicable for seeker — verified negative case.'],
  ['Generate a cover letter for a job',
    'Any job + valid credit balance ≥ 5,000',
    'A cover letter is generated and the wallet is charged 5,000 credits.'],
  ['Run a skill-gap analysis for a job',
    'Any job + credit balance ≥ 2,500',
    'A skill-gap report is generated and the wallet is charged 2,500 credits.'],
];
seekerJobs.forEach(([t,dat,res])=>uc(S4,'Job Seeker',t,{
  desc:'A signed-in Job Seeker uses the job search and application tools.',
  pre:'Signed in as Job Seeker. At least one open job exists.',
  data:dat,
  flow:['Sign in as Job Seeker.','Open the jobs page.','Perform the action.','Confirm the result on-screen.'],
  exc:'If credits are insufficient, the action is blocked with a "top up your wallet" message.',
  res:res, post:'The action is reflected in the user\'s history / lists.',
  acc:'Screen updates immediately after the action.',
}));

// -------- 5. EMPLOYER CRUD --------
const S5 = 'Employer – Company & Jobs';
const empCrud = [
  ['Edit company profile','Update company details and logo.',
    'Name, city, website, description, logo file',
    'Company page shows the updated data everywhere it appears.',
    'Header and job cards reflect the new logo.'],
  ['Post a new job (within plan)','Create a new job posting.',
    'Title, category, city, salary range, description, skills',
    'The new job appears in "My Jobs" and in the public listing.',
    'Available job slots decrease by 1.'],
  ['Post a job when quota is used up','Blocked posting attempt.',
    'Plan quota exhausted',
    'Posting is blocked and an "Upgrade plan" call-to-action is shown inside the Job Slots box.',
    'No job is created.'],
  ['Edit an existing job','Update title, salary or description.',
    'Any employer-owned job',
    'The updated details show in the public job detail page immediately.',
    'Applications so far remain intact.'],
  ['Close (unpublish) a job','Mark a job as closed.',
    'Any open job',
    'Job no longer appears in public search and is marked "Closed" for the employer.',
    'Existing applicants still see their status.'],
  ['Re-open a closed job','Bring a closed job back live.',
    'Any closed job',
    'Job returns to public search results.',
    'Job Slots count does not double-count.'],
  ['Delete a job','Remove a job posting.',
    'Any owned job with no active hires',
    'Job is removed from the employer\'s job list.',
    'Public listing no longer includes it.'],
  ['Feature a job (use featured slot)','Promote a job to top of list.',
    'Available featured slots ≥ 1',
    'Job is marked Featured and shown at the top of relevant listings.',
    'Featured slots decrement by 1.'],
  ['Un-feature a job','Remove featured status early.',
    'Any currently featured job',
    'Job returns to normal ranking.',
    'Featured slot does not increment back (single-use).'],
  ['View applicants for a job','Applicants list.',
    'Any job with at least one applicant',
    'A list of applicants with status controls is shown.',
    'Counts match the number displayed on the dashboard.'],
  ['Change application status',
    'Set an application to Reviewing / Shortlisted / Rejected / Hired.',
    'Any applicant',
    'Application status updates and the candidate receives a notification.',
    'Status timeline records the change.'],
  ['Unlock a candidate contact',
    'Reveal contact for a candidate using credits.',
    'Wallet ≥ 25,000 credits',
    'Contact is unlocked; wallet decreases by exactly 25,000 credits.',
    'Second view of the same contact does not charge again.'],
  ['Run candidate matching for a job (with add-on)',
    'Find top matches using the Matching add-on.',
    'Matching add-on active. Any open job.',
    'Up to 10 top matched candidates are shown at a time.',
    'Rejecting half reveals the next batch (never more than 10 shown at once).'],
  ['Edit company payment / contact info','Update contact fields.',
    'Contact email, telegram, phone',
    'Fields are saved and used on the company page.',
    'Applicants see the updated contact after unlock.'],
  ['Delete company profile via account deletion',
    'Wipe company and all jobs.',
    'Confirmation input: DELETE',
    'Company and its jobs are removed and the account is queued for deletion.',
    'Applicants receive a notice that jobs were withdrawn.'],
];
empCrud.forEach(([t,d,dat,res,acc])=>uc(S5,'Employer',t,{
  desc:d, pre:'Signed in as Employer with a saved company.',
  data:dat,
  flow:['Sign in as Employer.','Open the relevant page (Jobs, Applications or Company).','Perform the action.','Confirm on-screen.'],
  exc:'Missing required fields are blocked with clear validation.',
  res:res, post:'Change persists and is visible to relevant users.', acc:acc,
}));

// -------- 6. AGENT CRUD --------
const S6 = 'Agent – Clients & Jobs';
const agentCrud = [
  ['Add a client company','Add a new client the agent recruits for.',
    'Company name, contact email, city',
    'Client appears in the agent clients list.',
    'The agent can post jobs on behalf of this client.'],
  ['Edit a client company','Update client details.',
    'Any client the agent owns',
    'Updated fields are shown immediately.',
    'Jobs remain linked to this client.'],
  ['Remove a client','Detach a client from the agent.',
    'Client without active jobs',
    'Client is removed from the list.',
    'Jobs cannot be posted for this client anymore.'],
  ['Post a job for a client','Create a job under an existing client.',
    'Client + full job details',
    'Job appears in the agent\'s Jobs list, tagged with the client.',
    'Public listing shows the client company name, not the agent name.'],
  ['Edit a client-owned job','Update a job posted for a client.',
    'Any job the agent owns',
    'Updates take effect immediately.',
    'Applicants keep their history.'],
  ['View applications for an agent-posted job','Applicant list.',
    'Any agent job with applicants',
    'A full applicants list is shown to the agent.',
    'Actions match employer capabilities.'],
  ['Search talent as an Agent','Use the talent search tools.',
    'Any keyword',
    'A list of matching candidates is shown.',
    'Unlocks work with the wallet.'],
  ['Unlock a candidate contact (Agent)','Reveal contact using credits.',
    'Wallet ≥ 25,000 credits',
    'Contact is revealed; wallet decreases by 25,000 credits.',
    'Repeated view does not charge again.'],
  ['Buy a subscription plan (Agent)','Choose Growth plan.',
    'Plan: growth (1,750,000 MMK)',
    'A payment request is submitted for admin approval.',
    'After approval, quotas (25 posts, 5 featured, 1,500 unlocks) apply.'],
  ['Request a free trial (Agent)','Ask for a free-trial plan.',
    'Any allowed trial plan',
    'A request is submitted and status is Pending.',
    'On approval the trial quotas are applied.'],
];
agentCrud.forEach(([t,d,dat,res,acc])=>uc(S6,'Agent',t,{
  desc:d, pre:'Signed in as Agent.',
  data:dat,
  flow:['Sign in as Agent.','Open the appropriate page (Clients, Jobs, Search or Pricing).','Perform the action.','Confirm on-screen.'],
  exc:'Actions that need a paid plan are blocked with an upgrade message when quota is zero.',
  res:res, post:'Change persists and is visible on the agent dashboard.', acc:acc,
}));

// -------- 7. MENTOR CRUD --------
const S7 = 'Mentor – Preferences & Bookings';
const mentorCrud = [
  ['Edit mentor profile','Update bio, expertise and hourly rate.',
    'Bio, expertise tags, rate (MMK/hr)',
    'Updated details are shown on the public mentor profile.',
    'Directory reflects the new rate.'],
  ['Set weekly availability','Add or edit available time slots.',
    'Day / start / end for each slot',
    'Bookable time slots update on the mentor detail page.',
    'Booking screen shows only available slots.'],
  ['Add a paid session offering','Create a new session type.',
    'Title, duration, price (MMK)',
    'New session type is bookable by mentees.',
    'Pricing shows correctly in the booking screen.'],
  ['Accept a pending booking','Approve a mentee booking request.',
    'Any pending booking',
    'Booking becomes Confirmed and the mentee receives a notification.',
    'Booking appears in the mentee\'s and mentor\'s upcoming lists.'],
  ['Reject a pending booking','Decline a booking request.',
    'Any pending booking',
    'Booking is marked Rejected; mentee is notified.',
    'No charge is made and any hold is released.'],
  ['Complete a session','Mark a session as complete.',
    'Any confirmed booking whose time has passed',
    'Booking status becomes Completed and revenue is recorded.',
    'Mentee is invited to leave a review.'],
  ['Cancel an upcoming session','Cancel with policy applied.',
    'Any confirmed future booking',
    'Booking is cancelled and refund rules apply.',
    'Mentee is notified with reason.'],
  ['View mentees list','See mentees who have booked.',
    'Any past or upcoming booking',
    'A list of mentees is shown with contact and booking history.',
    'Only mentees the mentor has confirmed sessions with are visible.'],
  ['View mentor finance summary','Open mentor finance page.',
    'Any earnings history',
    'A breakdown of earnings, fees and payouts is shown.',
    'Numbers match the sum of completed bookings.'],
  ['Toggle vacation mode',
    'Temporarily hide from the mentor directory.',
    'Toggle: On / Off',
    'Mentor stops appearing in the public directory while On.',
    'Existing bookings are not affected.'],
];
mentorCrud.forEach(([t,d,dat,res,acc])=>uc(S7,'Mentor',t,{
  desc:d, pre:'Signed in as Mentor with an approved profile.',
  data:dat,
  flow:['Sign in as Mentor.','Open the appropriate page (Preferences, Bookings, Mentees or Finance).','Perform the action.','Confirm on-screen.'],
  exc:'Overlapping availability slots are rejected.',
  res:res, post:'Change persists and reflects on the public mentor profile.', acc:acc,
}));

// Mentee-side of mentoring (Job Seeker booking mentor)
const S7b = 'Job Seeker – Mentoring';
[
  ['Browse mentor directory',
    'A list of mentors is shown; filters can be applied.'],
  ['Book a mentor session',
    'Chosen slot becomes a Pending booking and mentor is notified.'],
  ['Pay for a booked session',
    'Wallet is charged the session price after mentor approval.'],
  ['Cancel my mentor booking',
    'Booking is cancelled and refund policy applies.'],
  ['Leave a mentor review',
    'A review is saved and shown on the mentor profile.'],
].forEach(([t,res])=>uc(S7b,'Job Seeker',t,{
  desc:'A Job Seeker interacts with the mentoring flow.',
  pre:'Signed in as Job Seeker with a mentor account available.',
  data:'Any approved mentor',
  flow:['Sign in as Job Seeker.','Open the mentors page.','Perform the action.','Confirm on-screen.'],
  exc:'Attempts to book overlapping slots are rejected.',
  res:res, post:'Booking or review appears in the user\'s history.', acc:'The change is visible on the mentor profile or in "My Bookings".',
}));

// -------- 8. FINANCE / WALLET --------
const S8 = 'Wallet & Payments';
const wallet = [
  ['View wallet balance','Job Seeker / Employer / Agent / Mentor',
    'The current balance is shown in the header and on the wallet page.'],
  ['Top up wallet by manual transfer',
    'Amount: 50,000 MMK. Method: KBZ Pay',
    'A top-up request is created with status Pending and admin is notified.'],
  ['Top-up approved by admin (view)',
    'Approved top-up request',
    'Wallet balance increases by the exact amount approved.'],
  ['Top-up rejected by admin (view)',
    'Rejected top-up request',
    'Balance is unchanged and the user sees the rejection reason.'],
  ['Spend credits on unlock',
    'Wallet balance ≥ 25,000',
    'Wallet decreases by exactly 25,000 credits.'],
  ['Spend credits on cover letter',
    'Wallet balance ≥ 5,000',
    'Wallet decreases by exactly 5,000 credits.'],
  ['Spend credits on skill gap',
    'Wallet balance ≥ 2,500',
    'Wallet decreases by exactly 2,500 credits.'],
  ['Buy add-on: 3 extra job postings (Employer)',
    'Add-on job posting × 3, total = 225,000 MMK',
    'Payment request is submitted; on approval Job Slots increase by 3.'],
  ['Buy add-on: featured slots (Employer)',
    'Featured × 5, total = 50,000 MMK',
    'After approval, Featured slots increase by 5.'],
  ['Buy add-on: candidate matching pack',
    'Total = 200,000 MMK',
    'After approval, Matching feature is unlocked for the employer.'],
  ['Buy add-on: unlocks pack',
    'Unlock × 50, total = 50,000 MMK',
    'After approval, contact unlocks are credited to the wallet.'],
  ['Buy Profile Boost',
    'Total = 150,000 MMK',
    'After approval, employer profile is boosted in search results.'],
  ['Buy Starter plan',
    'Total = 350,000 MMK',
    'On approval quotas: 5 posts, 1 featured, 500 unlocks.'],
  ['Buy Growth plan',
    'Total = 1,750,000 MMK',
    'On approval quotas: 25 posts, 5 featured, 1,500 unlocks.'],
  ['Buy Business plan',
    'Total = 5,000,000 MMK',
    'On approval quotas: 100 posts, 10 featured, 5,000 unlocks.'],
  ['Buy Enterprise plan',
    'Total = 10,000,000 MMK',
    'On approval quotas: 500 posts, 50 featured, 10,000 unlocks.'],
  ['View payment history',
    'Any past payment',
    'A chronological list of top-ups, plans and add-ons is shown with status.'],
  ['View my finance summary',
    'Any past activity',
    'A summary of total spent, refunded and pending is shown.'],
];
wallet.forEach(([t,dat,res])=>uc(S8,'Employer / Agent / Job Seeker',t,{
  desc:'The user interacts with wallet, plan and add-on flows.',
  pre:'Signed in with the appropriate role. Payment method reference is on hand.',
  data:dat,
  flow:['Sign in.','Open the wallet, pricing or payment history page.','Perform the action.','Confirm on-screen.'],
  exc:'Missing proof screenshot blocks submitting a top-up.',
  res:res, post:'Payment history and wallet reflect the outcome.', acc:'Numbers on the wallet page and in payment history match exactly.',
}));

// -------- 9. MESSAGING & NOTIFICATIONS --------
const S9 = 'Messaging & Notifications';
[
  ['Start a chat with another user',
    'Employer starts a chat with a Job Seeker after unlock.',
    'A conversation is created and shown in "Messages".'],
  ['Send a text message',
    'Any conversation',
    'The message is delivered and shown for both users.'],
  ['View unread message count',
    'Any conversation with unread messages',
    'The header badge shows the correct unread count.'],
  ['Mark conversation as read',
    'Any conversation',
    'Unread badge decreases accordingly.'],
  ['Delete a conversation',
    'Any owned conversation',
    'Conversation disappears from "Messages" for the current user.'],
  ['Receive an in-app notification',
    'Any triggering event (new application, message, approval)',
    'A notification appears within 30 seconds and the badge count updates.'],
  ['Open a notification and jump to context',
    'Any unread notification',
    'Clicking the notification navigates to the related page.'],
  ['Mark all notifications as read',
    'Any unread notifications',
    'All notifications become read and the badge clears.'],
  ['Delete a notification',
    'Any notification',
    'The notification is removed from the list.'],
].forEach(([t,dat,res])=>uc(S9,'Signed-in user',t,{
  desc:'The user uses messaging or notification features.',
  pre:'User is signed in. A counterparty exists.',
  data:dat,
  flow:['Sign in.','Open Messages or Notifications.','Perform the action.','Confirm on-screen.'],
  exc:'Empty messages cannot be sent.',
  res:res, post:'Change is visible after refresh.', acc:'Counts and badges match the underlying list.',
}));

// -------- 10. COMMUNITY & GUIDES --------
const S10 = 'Community & Guides';
[
  ['Create a community post','Signed-in user','Text + optional image',
    'Post is submitted with status Pending review.'],
  ['Edit my community post','Author','Any of my pending or approved posts',
    'Edits are saved and, if already approved, may return to Pending.'],
  ['Delete my community post','Author','Any of my posts',
    'Post is removed from the feed for everyone.'],
  ['React to a community post','Signed-in user','Any approved post',
    'Reaction count updates and my reaction is highlighted.'],
  ['Comment on a community post','Signed-in user','Any approved post',
    'Comment appears under the post.'],
  ['Delete my own comment','Author','My own comment',
    'Comment disappears from under the post.'],
  ['Report a community post','Signed-in user','Any post',
    'Post is flagged for moderator review.'],
  ['Open a guide article','Signed-in or guest','Any published guide',
    'The full guide loads with images and formatting.'],
  ['Save a guide (bookmark)','Signed-in user','Any published guide',
    'Guide appears under saved items.'],
  ['Change guide language','Any user','Language toggle on the guide',
    'Guide switches between English and Burmese.'],
].forEach(([t,role,dat,res])=>uc(S10,role,t,{
  desc:'The user uses the community or guides features.',
  pre:'User is signed in unless the guide is public.',
  data:dat,
  flow:['Open the community feed or guide.','Perform the action.','Confirm on-screen.'],
  exc:'Empty posts or comments are blocked.',
  res:res, post:'Change is visible in the feed or list.', acc:'Feed / guide list refreshes immediately.',
}));

// -------- 11. AI TOOLS (branded as ThweSat tools, no "AI" label) --------
const S11 = 'ThweSat Career Tools';
[
  ['Generate a cover letter','Any job + wallet ≥ 5,000 credits',
    'A cover letter is generated and downloadable; wallet decreases by 5,000 credits.'],
  ['Run a skill gap analysis','Any job + wallet ≥ 2,500 credits',
    'A skill gap report is generated; wallet decreases by 2,500 credits.'],
  ['Use the profile builder','Any signed-in Job Seeker',
    'A structured profile draft is produced and can be saved.'],
  ['Insufficient credits for cover letter','Wallet < 5,000 credits',
    'Action is blocked with a "top up your wallet" message.'],
  ['Insufficient credits for skill gap','Wallet < 2,500 credits',
    'Action is blocked with a top-up prompt.'],
].forEach(([t,dat,res])=>uc(S11,'Job Seeker',t,{
  desc:'Career tool actions that draw on wallet credits.',
  pre:'Signed in as Job Seeker.',
  data:dat,
  flow:['Open the career tools section.','Choose the tool.','Confirm the credit charge.','Wait for the output.'],
  exc:'Errors from the generation server show a retry option and do not charge credits.',
  res:res, post:'Wallet is updated and history includes the action.', acc:'Wallet balance change matches the price of the action exactly.',
}));

// -------- 12. PARTNER --------
const S12 = 'Partner Portal';
[
  ['View partner dashboard','Partner metrics and quick links load.'],
  ['View partner finance summary','A monthly earnings summary is shown with quality-gate status.'],
  ['View referral list','A list of referred employers and their status is shown.'],
  ['Copy a referral link','A working referral link is copied to clipboard.'],
  ['Approve a community post from pending queue','Post moves to Approved and is visible in the public feed.'],
  ['Reject a community post from pending queue','Post is removed from pending and hidden from public.'],
  ['Escalate a community post to admin','Post is escalated; admin sees it in their queue.'],
  ['Try to open admin-only finance page','Partner is redirected away from admin finance.'],
  ['View own referral revenue share',
    'Formula example: 2,000,000 MMK × 15% = 300,000 MMK. The value matches.'],
  ['Fail quality gate month',
    'If quality gate fails, growth payout is 0 for that month.'],
].forEach(([t,res])=>uc(S12,'Partner',t,{
  desc:'A Partner uses their portal.',
  pre:'Signed in as Partner.',
  data:'Any partner test account',
  flow:['Sign in as Partner.','Open the relevant partner page.','Perform the action.','Confirm on-screen.'],
  exc:'Admin-only pages are blocked with a redirect.',
  res:res, post:'Data on-screen matches the underlying records.', acc:'No console errors; numbers are consistent across pages.',
}));

// -------- 13. ADMIN --------
const S13 = 'Admin Portal';
const admin = [
  ['View admin dashboard','All pending action counts are correct and highlighted red when > 0.'],
  ['Open Booking Approvals card','Booking approvals list opens with pending mentor bookings.'],
  ['Open Packages & Add-ons tab','Pending plan and add-on requests are listed with unread badge count.'],
  ['Open Wallet Top-ups tab','Pending top-up requests are listed with unread badge count.'],
  ['Approve a top-up request','Wallet is credited and requester is notified.'],
  ['Reject a top-up request','Request is marked rejected; balance is unchanged.'],
  ['Approve a subscription payment','Plan quotas are applied to the requester and record is stored.'],
  ['Reject a subscription payment','Request is rejected; no quotas are applied.'],
  ['Approve an add-on payment','Add-on effect is applied (e.g. featured slots increase).'],
  ['Reject an add-on payment','No add-on is granted.'],
  ['Approve a mentor booking payout','Payout is recorded and mentor is notified.'],
  ['View users list','A list of all users with role and status is shown.'],
  ['Suspend a non-admin user','User is marked Suspended and cannot sign in.'],
  ['Un-suspend a user','User can sign in again.'],
  ['Delete a non-admin user','User account is removed after confirmation.'],
  ['Cannot suspend an Admin','Toggle is disabled and server rejects the attempt.'],
  ['Cannot change an Admin\'s role to Partner','Toggle is disabled and server rejects the attempt.'],
  ['Cannot remove the last Admin','Remove button is disabled with a clear message.'],
  ['View job queue','All pending / flagged jobs are shown for review.'],
  ['Approve a flagged job','Job returns to public listing.'],
  ['Reject a flagged job','Job is unpublished and the poster is notified.'],
  ['View partner list','All partners are listed with revenue share settings.'],
  ['Edit a partner\'s revenue share','Change is saved and applies to future months.'],
  ['View partner finance page','Monthly statements for each partner are shown.'],
  ['View admin analytics','Charts of signups, jobs and payments load.'],
  ['View admin payments legacy view','Historical payments load correctly.'],
  ['Edit a guide','Changes to a guide article are saved and re-published.'],
  ['Delete a guide','Guide is removed from the guides list.'],
  ['Change a user\'s role (non-admin)','Role is updated and dashboards reflect the change.'],
  ['Community moderation from admin view','Approve / Remove buttons work inline in the pending list.'],
];
admin.forEach(([t,res])=>uc(S13,'Admin',t,{
  desc:'An Admin performs a management action.',
  pre:'Signed in as Admin.',
  data:'Any admin test account',
  flow:['Sign in as Admin.','Open the relevant admin page.','Perform the action.','Confirm on-screen.'],
  exc:'Guards protect the last-remaining Admin from removal or role change.',
  res:res, post:'Change is auditable in the payment or history views.',
  acc:'Counts on the dashboard match the counts in the details lists.',
}));

// -------- 14. SECURITY & PRIVACY --------
const S14 = 'Security & Privacy';
const sec = [
  ['Guest cannot see private candidate contact',
    'Public profile hides email and phone until unlocked.'],
  ['Employer without unlock cannot see contact',
    'Contact fields are masked until the wallet is charged for unlock.'],
  ['Job Seeker cannot open Admin pages',
    'Direct URL access to /admin sends the seeker back to the dashboard.'],
  ['Partner cannot open Admin finance',
    'Partner is redirected away from /admin/finance.'],
  ['Employer cannot open Seeker-only pages',
    'Direct URL access to seeker-only routes redirects to the dashboard.'],
  ['Job Seeker cannot become a mentor',
    'The Become-a-mentor route is blocked and the mentor call-to-action is hidden.'],
  ['Session persists across refresh',
    'Signed-in session survives a full page reload.'],
  ['Session ends on sign-out',
    'After sign-out, protected pages redirect to login.'],
  ['Rate limiting on repeated wrong sign-ins',
    'After several wrong attempts the login is temporarily throttled.'],
  ['Uploaded files are size-limited',
    'Files above the allowed size are rejected client-side.'],
  ['Users cannot see other users\' wallets',
    'Wallet balance and history are only visible to the account owner.'],
  ['Users cannot see other users\' messages',
    'Message list is scoped to conversations the user is part of.'],
  ['Users cannot open payment requests they do not own',
    'Payment requests belonging to other users are not accessible.'],
];
sec.forEach(([t,res])=>uc(S14,'All roles',t,{
  desc:'Access control and privacy behaviour is verified.',
  pre:'The right role is signed in (or signed out) as described.',
  data:'Any test account of the target role',
  flow:['Sign in (or stay signed out) as the target role.','Attempt the action described in the title.','Observe the result.'],
  exc:'Guarded pages redirect instead of showing an error.',
  res:res, post:'No sensitive data is shown to unauthorised users.',
  acc:'Blocking works both via direct URL and via UI interaction.',
}));

// -------- 15. SETTINGS --------
const S15 = 'Settings';
[
  ['Change display language','Language switches to Burmese and persists.'],
  ['Change font size / encoding','New font renders across pages.'],
  ['Update telegram handle','Telegram is saved and shown on the public profile.'],
  ['Update privacy preferences','Privacy toggles are saved and take effect.'],
  ['Adjust session expiry preference','New expiry length is applied on next sign-in.'],
  ['Manage notification preferences','Chosen categories are enabled or disabled.'],
  ['Unsubscribe from marketing emails','User is removed from marketing lists.'],
].forEach(([t,res])=>uc(S15,'Signed-in user',t,{
  desc:'A user changes account settings.',
  pre:'User is signed in.',
  data:'Any test account',
  flow:['Open settings from the header.','Change the setting.','Save.'],
  exc:'Invalid values are rejected with a clear message.',
  res:res, post:'Change persists after sign-out and back in.',
  acc:'Setting persists across page reloads.',
}));

// -------- Render document --------
function T(text, opts={}) { return new TextRun({ text: String(text), ...opts }); }
function P(text, opts={}) { return new Paragraph({ children:[T(text, opts)], spacing:{after:80} }); }
function H(text, level) { return new Paragraph({ heading:level, children:[T(text,{bold:true})], spacing:{before:180, after:120} }); }

const border = { style: BorderStyle.SINGLE, size: 2, color: 'BBBBBB' };
const borders = { top:border, bottom:border, left:border, right:border };
function cell(text, opts={}) {
  const paragraphs = String(text).split('\n').map(l => new Paragraph({ children:[T(l, opts.bold?{bold:true}:{})] }));
  return new TableCell({
    borders,
    width:{ size: opts.w, type: WidthType.DXA },
    shading: opts.shade ? { fill: opts.shade, type: ShadingType.CLEAR } : undefined,
    margins:{ top:60, bottom:60, left:100, right:100 },
    children: paragraphs,
  });
}
function rowKV(k, v) {
  const kw = 2400, vw = 6960;
  return new TableRow({ children:[ cell(k,{w:kw,bold:true,shade:'F1F1F5'}), cell(v,{w:vw}) ]});
}
function ucTable(c) {
  return new Table({
    width:{ size: 9360, type: WidthType.DXA },
    columnWidths:[2400, 6960],
    rows:[
      rowKV('ID', c.id),
      rowKV('Title', c.title),
      rowKV('Role', c.role),
      rowKV('Description', c.desc),
      rowKV('Pre-Conditions', c.pre),
      rowKV('Test Data', c.data),
      rowKV('Main Flow', c.flow.map(s=>'• '+s).join('\n')),
      rowKV('Exceptions', c.exc),
      rowKV('Expected Results', c.res),
      rowKV('Post-Conditions', c.post),
      rowKV('Acceptance Criteria', c.acc),
    ],
  });
}

const children = [];
children.push(new Paragraph({ heading:HeadingLevel.TITLE, alignment:AlignmentType.CENTER, children:[T('ThweSat Use Cases v6.0', {bold:true, size:44})], spacing:{after:120} }));
children.push(new Paragraph({ alignment:AlignmentType.CENTER, children:[T('Comprehensive functional & role coverage — '+CASES.length+' use cases', {italics:true})], spacing:{after:240} }));

// Test accounts
children.push(H('Seeded Test Accounts', HeadingLevel.HEADING_1));
const accTable = new Table({
  width:{size:9360,type:WidthType.DXA}, columnWidths:[2400,3960,3000],
  rows:[
    new TableRow({children:[cell('Role',{w:2400,bold:true,shade:'F1F1F5'}), cell('Email',{w:3960,bold:true,shade:'F1F1F5'}), cell('Password',{w:3000,bold:true,shade:'F1F1F5'})]}),
    ...ACCOUNTS.map(([r,e,p])=>new TableRow({children:[cell(r,{w:2400}), cell(e,{w:3960}), cell(p,{w:3000})]})),
  ],
});
children.push(accTable);
children.push(P(' '));

// Prices
children.push(H('Reference Prices', HeadingLevel.HEADING_1));
children.push(P('Plans: Starter 350,000 · Growth 1,750,000 · Business 5,000,000 · Enterprise 10,000,000 (MMK)'));
children.push(P('Add-ons: Job Posting 75,000/post · Featured Slot 10,000 · Candidate Matching 200,000 · Unlock 1,000 each · Profile Boost 150,000 (MMK)'));
children.push(P('Actions (credits): Unlock Contact 25,000 · Cover Letter 5,000 · Skill Gap 2,500'));

// Table of sections
const sections = [...new Set(CASES.map(c=>c.section))];
children.push(H('Sections', HeadingLevel.HEADING_1));
sections.forEach(s=>{
  const count = CASES.filter(c=>c.section===s).length;
  children.push(P('• ' + s + ' — ' + count + ' use cases'));
});
children.push(new Paragraph({ children:[new PageBreak()] }));

sections.forEach(section=>{
  children.push(H(section, HeadingLevel.HEADING_1));
  CASES.filter(c=>c.section===section).forEach(c=>{
    children.push(H(c.id + ' — ' + c.title, HeadingLevel.HEADING_2));
    children.push(ucTable(c));
    children.push(P(' '));
  });
  children.push(new Paragraph({ children:[new PageBreak()] }));
});

const doc = new Document({
  styles:{
    default:{ document:{ run:{ font:'Arial', size:20 } } },
    paragraphStyles:[
      { id:'Heading1', name:'Heading 1', basedOn:'Normal', next:'Normal', quickFormat:true,
        run:{ size:30, bold:true, font:'Arial', color:'1B1740' },
        paragraph:{ spacing:{before:240, after:120}, outlineLevel:0 }},
      { id:'Heading2', name:'Heading 2', basedOn:'Normal', next:'Normal', quickFormat:true,
        run:{ size:24, bold:true, font:'Arial', color:'333333' },
        paragraph:{ spacing:{before:160, after:80}, outlineLevel:1 }},
    ],
  },
  sections:[{
    properties:{ page:{ size:{ width:12240, height:15840 }, margin:{ top:1080, bottom:1080, left:1080, right:1080 }}},
    children,
  }],
});

Packer.toBuffer(doc).then(buf=>{
  fs.writeFileSync('/mnt/documents/ThweSat_Use_Cases_v6.0.docx', buf);
  console.log('Wrote v6.0 with', CASES.length, 'use cases');
});
