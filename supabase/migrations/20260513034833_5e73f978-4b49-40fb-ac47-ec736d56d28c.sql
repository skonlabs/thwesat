
-- Jobs: active jobs visible to everyone
DROP POLICY IF EXISTS "Anyone can view active jobs" ON public.jobs;
CREATE POLICY "Anyone can view active jobs"
  ON public.jobs FOR SELECT
  TO anon, authenticated
  USING (status = 'active' OR employer_id = auth.uid());

-- Mentor profiles
DROP POLICY IF EXISTS "Anyone can view mentor profiles" ON public.mentor_profiles;
CREATE POLICY "Anyone can view mentor profiles"
  ON public.mentor_profiles FOR SELECT
  TO anon, authenticated
  USING (true);

-- Mentor availability
DROP POLICY IF EXISTS "Anyone can view availability slots" ON public.mentor_availability_slots;
CREATE POLICY "Anyone can view availability slots"
  ON public.mentor_availability_slots FOR SELECT
  TO anon, authenticated
  USING (true);

-- Mentor reviews
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.mentor_reviews;
CREATE POLICY "Anyone can view reviews"
  ON public.mentor_reviews FOR SELECT
  TO anon, authenticated
  USING (true);

-- Guides
DROP POLICY IF EXISTS "Anyone can view guides" ON public.guides;
CREATE POLICY "Anyone can view guides"
  ON public.guides FOR SELECT
  TO anon, authenticated
  USING (true);

-- Public profiles (only visibility = 'public')
CREATE POLICY "Public profiles readable by anon"
  ON public.profiles FOR SELECT
  TO anon
  USING (visibility = 'public');

-- Employer profiles needed for company pages and job cards
CREATE POLICY "Employer profiles readable by anon"
  ON public.employer_profiles FOR SELECT
  TO anon
  USING (true);

-- Active agent clients (used to display agent-posted job attribution)
CREATE POLICY "Active agent clients readable by anon"
  ON public.agent_clients FOR SELECT
  TO anon
  USING (is_active = true);
