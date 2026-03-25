
-- Create shopify_stores table for multi-store support
CREATE TABLE public.shopify_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shop_domain text NOT NULL,
  store_name text NOT NULL DEFAULT '',
  access_token text NOT NULL,
  scopes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, shop_domain)
);

ALTER TABLE public.shopify_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stores" ON public.shopify_stores FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stores" ON public.shopify_stores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own stores" ON public.shopify_stores FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own stores" ON public.shopify_stores FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add store_id column to products table
ALTER TABLE public.products ADD COLUMN store_id uuid REFERENCES public.shopify_stores(id) ON DELETE CASCADE;
