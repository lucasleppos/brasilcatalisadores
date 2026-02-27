
-- Create bags table
CREATE TABLE public.bags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bag_number text NOT NULL,
  bag_label text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Aberto',
  material_type text NOT NULL DEFAULT 'medio',
  buyer text NOT NULL DEFAULT '',
  total_weight numeric NOT NULL DEFAULT 0,
  max_weight numeric NOT NULL DEFAULT 1000,
  total_paid_brl numeric NOT NULL DEFAULT 0,
  refiner_pt_ppm numeric,
  refiner_pd_ppm numeric,
  refiner_rh_ppm numeric,
  refiner_total_value numeric,
  provisional_pt_ppm numeric,
  provisional_pd_ppm numeric,
  provisional_rh_ppm numeric,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

-- Create bag_items table
CREATE TABLE public.bag_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bag_id uuid NOT NULL REFERENCES public.bags(id) ON DELETE CASCADE,
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  purchase_item_id text NOT NULL DEFAULT '',
  weight numeric NOT NULL DEFAULT 0,
  paid_value numeric NOT NULL DEFAULT 0,
  estimated_pt_ppm numeric NOT NULL DEFAULT 0,
  estimated_pd_ppm numeric NOT NULL DEFAULT 0,
  estimated_rh_ppm numeric NOT NULL DEFAULT 0,
  supplier_name text NOT NULL DEFAULT '',
  allocated_at timestamptz NOT NULL DEFAULT now()
);

-- Add location and transfer_status to purchases
ALTER TABLE public.purchases ADD COLUMN location text NOT NULL DEFAULT 'matriz';
ALTER TABLE public.purchases ADD COLUMN transfer_status text;

-- RLS for bags
ALTER TABLE public.bags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to bags" ON public.bags FOR ALL USING (true) WITH CHECK (true);

-- RLS for bag_items
ALTER TABLE public.bag_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to bag_items" ON public.bag_items FOR ALL USING (true) WITH CHECK (true);

-- Generate bag number function
CREATE OR REPLACE FUNCTION public.generate_bag_number()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(REPLACE(bag_number, 'BAG-', '') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.bags;
  RETURN 'BAG-' || LPAD(next_num::TEXT, 3, '0');
END;
$function$;
