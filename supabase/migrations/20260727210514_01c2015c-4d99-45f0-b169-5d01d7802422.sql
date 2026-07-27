CREATE TABLE public.lab_result_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id uuid NOT NULL,
  purchase_item_id uuid,
  versao integer NOT NULL DEFAULT 1,
  old_pt_ppm numeric,
  old_pd_ppm numeric,
  old_rh_ppm numeric,
  new_pt_ppm numeric,
  new_pd_ppm numeric,
  new_rh_ppm numeric,
  action text NOT NULL DEFAULT 'update',
  changed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.lab_result_history TO authenticated;
GRANT ALL ON public.lab_result_history TO service_role;

ALTER TABLE public.lab_result_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read lab_result_history"
  ON public.lab_result_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert lab_result_history"
  ON public.lab_result_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_lab_result_history_purchase ON public.lab_result_history (purchase_id, purchase_item_id, created_at);