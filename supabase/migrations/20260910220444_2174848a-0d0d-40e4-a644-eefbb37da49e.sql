ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS reference_weight_kg numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reference_pt_ppm numeric NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS reference_pd_ppm numeric NOT NULL DEFAULT 1180,
  ADD COLUMN IF NOT EXISTS reference_rh_ppm numeric NOT NULL DEFAULT 180,
  ADD COLUMN IF NOT EXISTS reference_margin_pct numeric NOT NULL DEFAULT 15;