-- Create purchases table
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_number TEXT NOT NULL,
  erp_number TEXT DEFAULT '',
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  supplier_id TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Recebimento',
  total_brl NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  status_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create purchase items table
CREATE TABLE public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  quantity INTEGER,
  total_value NUMERIC,
  weight NUMERIC,
  calc_input JSONB,
  calc_result JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (permissive for now, no auth yet)
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

-- Public access policies (will be tightened when auth is added)
CREATE POLICY "Allow all access to purchases" ON public.purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to purchase_items" ON public.purchase_items FOR ALL USING (true) WITH CHECK (true);

-- Function to generate purchase number (date + daily order)
CREATE OR REPLACE FUNCTION public.generate_purchase_number()
RETURNS TEXT AS $$
DECLARE
  today_date TEXT;
  daily_count INTEGER;
BEGIN
  today_date := to_char(now(), 'DD/MM/YYYY');
  SELECT COUNT(*) + 1 INTO daily_count
  FROM public.purchases
  WHERE date::date = CURRENT_DATE;
  RETURN today_date || ' - ' || LPAD(daily_count::TEXT, 2, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Index for date-based queries
CREATE INDEX idx_purchases_date ON public.purchases(date);
CREATE INDEX idx_purchase_items_purchase_id ON public.purchase_items(purchase_id);