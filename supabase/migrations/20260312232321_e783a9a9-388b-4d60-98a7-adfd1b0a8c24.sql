
-- Create catalog_groups table
CREATE TABLE public.catalog_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  margin numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read catalog_groups" ON public.catalog_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Can insert catalog_groups" ON public.catalog_groups FOR INSERT TO authenticated WITH CHECK (user_can_do(auth.uid(), 'catalogo', 'create'));
CREATE POLICY "Can update catalog_groups" ON public.catalog_groups FOR UPDATE TO authenticated USING (user_can_do(auth.uid(), 'catalogo', 'edit')) WITH CHECK (user_can_do(auth.uid(), 'catalogo', 'edit'));
CREATE POLICY "Can delete catalog_groups" ON public.catalog_groups FOR DELETE TO authenticated USING (user_can_do(auth.uid(), 'catalogo', 'delete'));

-- Create catalog_parts table
CREATE TABLE public.catalog_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL DEFAULT '',
  reference text NOT NULL DEFAULT '',
  brand text NOT NULL DEFAULT '',
  vehicle text NOT NULL DEFAULT '',
  weight numeric NOT NULL DEFAULT 0,
  pt_ppm numeric NOT NULL DEFAULT 0,
  pd_ppm numeric NOT NULL DEFAULT 0,
  rh_ppm numeric NOT NULL DEFAULT 0,
  group_id uuid REFERENCES public.catalog_groups(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read catalog_parts" ON public.catalog_parts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Can insert catalog_parts" ON public.catalog_parts FOR INSERT TO authenticated WITH CHECK (user_can_do(auth.uid(), 'catalogo', 'create'));
CREATE POLICY "Can update catalog_parts" ON public.catalog_parts FOR UPDATE TO authenticated USING (user_can_do(auth.uid(), 'catalogo', 'edit')) WITH CHECK (user_can_do(auth.uid(), 'catalogo', 'edit'));
CREATE POLICY "Can delete catalog_parts" ON public.catalog_parts FOR DELETE TO authenticated USING (user_can_do(auth.uid(), 'catalogo', 'delete'));

-- Add columns to purchase_items
ALTER TABLE public.purchase_items ADD COLUMN catalog_part_id uuid REFERENCES public.catalog_parts(id) ON DELETE SET NULL;
ALTER TABLE public.purchase_items ADD COLUMN weight_real numeric;
ALTER TABLE public.purchase_items ADD COLUMN weight_loss numeric;
