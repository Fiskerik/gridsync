-- Restrict client-side subscription inserts to the free plan only.
-- Plan upgrades must happen server-side (e.g., via SECURITY DEFINER functions or edge functions using the service role).
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;

CREATE POLICY "Users can insert own free subscription"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND plan = 'free'::plan_type);

-- Restrict client-side subscription updates so users cannot self-promote to a paid plan.
-- Trial activation and paid upgrades must go through privileged server-side code.
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;

CREATE POLICY "Users can update own free subscription"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND plan = 'free'::plan_type);

-- Server-side function to start a 14-day trial on a paid plan. Runs as definer so it
-- bypasses the restrictive update policy above, while still enforcing per-user checks.
CREATE OR REPLACE FUNCTION public.start_subscription_trial(_target_plan plan_type)
RETURNS public.subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.subscriptions;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _target_plan = 'free'::plan_type THEN
    RAISE EXCEPTION 'Cannot start a trial on the free plan';
  END IF;

  SELECT * INTO _row FROM public.subscriptions WHERE user_id = _uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription record not found for user';
  END IF;

  IF _row.trial_used THEN
    RAISE EXCEPTION 'Trial already used';
  END IF;

  UPDATE public.subscriptions
  SET plan = _target_plan,
      trial_started_at = now(),
      trial_ends_at = now() + interval '14 days',
      trial_used = true,
      updated_at = now()
  WHERE user_id = _uid
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.start_subscription_trial(plan_type) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.start_subscription_trial(plan_type) TO authenticated;