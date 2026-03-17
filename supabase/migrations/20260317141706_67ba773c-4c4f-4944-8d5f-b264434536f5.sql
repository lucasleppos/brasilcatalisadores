
-- Stage Evidence table
CREATE TABLE public.stage_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  stage text NOT NULL,
  task_key text NOT NULL,
  data_type text NOT NULL, -- photo, weight, note
  value_numeric numeric,
  value_text text,
  file_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stage_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read stage_evidence"
  ON public.stage_evidence FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Can insert stage_evidence"
  ON public.stage_evidence FOR INSERT TO authenticated
  WITH CHECK (user_can_do(auth.uid(), 'processos', 'advance_stage'));

CREATE POLICY "Can update stage_evidence"
  ON public.stage_evidence FOR UPDATE TO authenticated
  USING (user_can_do(auth.uid(), 'processos', 'advance_stage'))
  WITH CHECK (user_can_do(auth.uid(), 'processos', 'advance_stage'));

CREATE POLICY "Can delete stage_evidence"
  ON public.stage_evidence FOR DELETE TO authenticated
  USING (user_can_do(auth.uid(), 'processos', 'advance_stage'));

CREATE INDEX idx_stage_evidence_purchase ON public.stage_evidence(purchase_id, stage);

-- Lab Analyses table (3 individual analyses -> average)
CREATE TABLE public.lab_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  lab_result_id uuid REFERENCES public.lab_results(id) ON DELETE SET NULL,
  analysis_number integer NOT NULL CHECK (analysis_number BETWEEN 1 AND 3),
  pt_ppm numeric NOT NULL DEFAULT 0,
  pd_ppm numeric NOT NULL DEFAULT 0,
  rh_ppm numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (purchase_id, analysis_number, lab_result_id)
);

ALTER TABLE public.lab_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read lab_analyses"
  ON public.lab_analyses FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Can insert lab_analyses"
  ON public.lab_analyses FOR INSERT TO authenticated
  WITH CHECK (user_can_do(auth.uid(), 'processos', 'advance_stage'));

CREATE POLICY "Can update lab_analyses"
  ON public.lab_analyses FOR UPDATE TO authenticated
  USING (user_can_do(auth.uid(), 'processos', 'advance_stage'))
  WITH CHECK (user_can_do(auth.uid(), 'processos', 'advance_stage'));

CREATE POLICY "Can delete lab_analyses"
  ON public.lab_analyses FOR DELETE TO authenticated
  USING (user_can_do(auth.uid(), 'processos', 'advance_stage'));

CREATE INDEX idx_lab_analyses_purchase ON public.lab_analyses(purchase_id);

-- Storage bucket for stage photos
INSERT INTO storage.buckets (id, name, public) VALUES ('stage-photos', 'stage-photos', true);

CREATE POLICY "Anyone can view stage photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'stage-photos');

CREATE POLICY "Authenticated can upload stage photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stage-photos');

CREATE POLICY "Authenticated can delete stage photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'stage-photos');
