
-- 1. Recreate referral trigger to fire on INSERT or UPDATE
DROP TRIGGER IF EXISTS trigger_referral_completed ON public.referrals;

CREATE TRIGGER trigger_referral_completed
AFTER INSERT OR UPDATE OF status ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.on_referral_completed();

-- 2. Backfill: process rewards for any referrers who already have 5+ completed referrals
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT referrer_id, count(*) AS n
    FROM public.referrals
    WHERE status = 'completed'
    GROUP BY referrer_id
    HAVING count(*) >= 5
  LOOP
    PERFORM public.process_referral_reward(r.referrer_id);
  END LOOP;
END $$;
