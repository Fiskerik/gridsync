-- Remove the client-side UPDATE policy on subscriptions entirely.
-- Users were still able to manipulate trial_started_at / trial_ends_at / trial_used /
-- started_at / ends_at on their own row as long as plan stayed 'free'. Subscription
-- mutations must now go through SECURITY DEFINER functions (e.g., start_subscription_trial)
-- or service-role backend code.
DROP POLICY IF EXISTS "Users can update own free subscription" ON public.subscriptions;

-- Revoke EXECUTE on internal trigger functions from public roles. They are only
-- invoked by triggers on auth.users and never need to be callable directly.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_subscription() FROM public, anon, authenticated;