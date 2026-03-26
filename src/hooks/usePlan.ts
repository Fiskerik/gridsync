import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlanType = "free" | "starter" | "growth";

export interface Subscription {
  id: string;
  plan: PlanType;
  started_at: string;
  ends_at: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  trial_used: boolean;
}

export const PLAN_LIMITS = {
  free: { maxProducts: 20, scheduledJobs: false, bulkPriceRules: false, label: "Free" },
  starter: { maxProducts: 500, scheduledJobs: false, bulkPriceRules: false, label: "Starter — $19/mo" },
  growth: { maxProducts: Infinity, scheduledJobs: true, bulkPriceRules: true, label: "Growth — $39/mo" },
} as const;

export function usePlan() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (data) {
      setSubscription({
        id: data.id,
        plan: data.plan as PlanType,
        started_at: data.started_at,
        ends_at: data.ends_at,
        trial_started_at: data.trial_started_at,
        trial_ends_at: data.trial_ends_at,
        trial_used: data.trial_used,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSubscription(); }, [fetchSubscription]);

  const plan = subscription?.plan ?? "free";
  const limits = PLAN_LIMITS[plan];

  const isTrialing = subscription?.trial_ends_at
    ? new Date(subscription.trial_ends_at) > new Date()
    : false;

  const canUseTrial = subscription ? !subscription.trial_used : true;

  const startTrial = useCallback(async (targetPlan: PlanType) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    const { error } = await supabase
      .from("subscriptions")
      .update({
        plan: targetPlan,
        trial_started_at: new Date().toISOString(),
        trial_ends_at: trialEnd.toISOString(),
        trial_used: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", session.user.id);

    if (!error) {
      await fetchSubscription();
      return true;
    }
    return false;
  }, [fetchSubscription]);

  return {
    subscription,
    plan,
    limits,
    loading,
    isTrialing,
    canUseTrial,
    startTrial,
    refetch: fetchSubscription,
  };
}
