-- Helper: check whether a user's primary_role is employer or agent.
-- SECURITY DEFINER avoids RLS recursion when called from a profiles policy.
CREATE OR REPLACE FUNCTION public.is_employer_or_agent(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND primary_role IN ('employer', 'agent')
  );
$$;

DROP POLICY IF EXISTS "Members see visible profiles" ON public.profiles;

CREATE POLICY "Members see visible profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (auth.uid() <> id)
  AND (NOT has_role(auth.uid(), 'admin'::app_role))
  AND (NOT has_role(auth.uid(), 'moderator'::app_role))
  AND (
    visibility = ANY (ARRAY['public'::text, 'members'::text])
    OR (
      visibility = 'employers'::text
      AND public.is_employer_or_agent(auth.uid())
    )
  )
);