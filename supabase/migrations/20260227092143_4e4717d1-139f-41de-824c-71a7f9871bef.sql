
-- Suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  document TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  branch TEXT NOT NULL DEFAULT '',
  buyer TEXT NOT NULL DEFAULT '',
  margin NUMERIC NOT NULL DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);

-- Settings table (single row)
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pt_price NUMERIC NOT NULL DEFAULT 950,
  pd_price NUMERIC NOT NULL DEFAULT 950,
  rh_price NUMERIC NOT NULL DEFAULT 4500,
  usd_to_brl NUMERIC NOT NULL DEFAULT 5.0,
  operational_cost NUMERIC NOT NULL DEFAULT 0.50,
  logistic_cost NUMERIC NOT NULL DEFAULT 0.30,
  treatment_fee NUMERIC NOT NULL DEFAULT 1.50,
  refining_pt NUMERIC NOT NULL DEFAULT 15,
  refining_pd NUMERIC NOT NULL DEFAULT 15,
  refining_rh NUMERIC NOT NULL DEFAULT 25,
  lease_pt NUMERIC NOT NULL DEFAULT 6,
  lease_pd NUMERIC NOT NULL DEFAULT 4,
  lease_rh NUMERIC NOT NULL DEFAULT 6,
  lease_days NUMERIC NOT NULL DEFAULT 120,
  lease_base NUMERIC NOT NULL DEFAULT 360,
  recovery_pt NUMERIC NOT NULL DEFAULT 97.5,
  recovery_pd NUMERIC NOT NULL DEFAULT 97.5,
  recovery_rh NUMERIC NOT NULL DEFAULT 92.5,
  moisture_discount NUMERIC NOT NULL DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- Insert default settings row
INSERT INTO public.settings (id) VALUES (gen_random_uuid());
