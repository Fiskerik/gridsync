
CREATE TABLE public.scheduled_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  action_type text NOT NULL DEFAULT 'price_percent',
  action_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  product_ids uuid[] NOT NULL DEFAULT '{}',
  scheduled_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  executed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scheduled jobs"
  ON public.scheduled_jobs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scheduled jobs"
  ON public.scheduled_jobs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled jobs"
  ON public.scheduled_jobs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheduled jobs"
  ON public.scheduled_jobs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_scheduled_jobs_user_id ON public.scheduled_jobs(user_id);
CREATE INDEX idx_scheduled_jobs_status ON public.scheduled_jobs(status);
CREATE INDEX idx_scheduled_jobs_scheduled_at ON public.scheduled_jobs(scheduled_at);
