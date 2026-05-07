// Mirrors the DB function public.is_profile_complete(_user_id uuid) exactly.
// The signup/profile-complete bonus depends on ALL these fields being present,
// so the client-side % MUST match the DB definition or the bonus will never trigger.
//
// DB requires (all non-null, trimmed non-empty):
//   display_name, headline, bio, location, email, experience, avatar_url, phone
//   skills (array, length > 0), languages (array, length > 0)

const isNonEmptyString = (v: unknown): boolean =>
  typeof v === "string" && v.trim().length > 0;

const isNonEmptyArray = (v: unknown): boolean =>
  Array.isArray(v) && v.length > 0;

export interface ProfileCompletionInput {
  display_name?: string | null;
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  email?: string | null;
  experience?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  skills?: string[] | null;
  languages?: string[] | null;
}

export interface ProfileCompletionResult {
  filled: number;
  total: number;
  percent: number;
  isComplete: boolean;
  missing: Array<keyof ProfileCompletionInput>;
}

export function computeProfileCompletion(
  profile: ProfileCompletionInput | null | undefined,
): ProfileCompletionResult {
  const checks: Array<[keyof ProfileCompletionInput, boolean]> = [
    ["display_name", isNonEmptyString(profile?.display_name)],
    ["headline", isNonEmptyString(profile?.headline)],
    ["bio", isNonEmptyString(profile?.bio)],
    ["location", isNonEmptyString(profile?.location)],
    ["email", isNonEmptyString(profile?.email)],
    ["experience", isNonEmptyString(profile?.experience)],
    ["avatar_url", isNonEmptyString(profile?.avatar_url)],
    ["phone", isNonEmptyString(profile?.phone)],
    ["skills", isNonEmptyArray(profile?.skills)],
    ["languages", isNonEmptyArray(profile?.languages)],
  ];
  const total = checks.length;
  const filled = checks.filter(([, ok]) => ok).length;
  const missing = checks.filter(([, ok]) => !ok).map(([k]) => k);
  const percent = Math.round((filled / total) * 100);
  return { filled, total, percent, isComplete: filled === total, missing };
}
