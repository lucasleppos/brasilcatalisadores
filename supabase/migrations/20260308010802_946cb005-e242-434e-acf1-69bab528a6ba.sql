
-- Create demonstrativos table
CREATE TABLE public.demonstrativos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  versao INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pendente',
  valor_total NUMERIC NOT NULL DEFAULT 0,
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  respondido_em TIMESTAMPTZ,
  motivo_contestacao TEXT,
  created_by UUID
);

-- Create lab_results table
CREATE TABLE public.lab_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  versao INT NOT NULL DEFAULT 1,
  pt_ppm NUMERIC NOT NULL DEFAULT 0,
  pd_ppm NUMERIC NOT NULL DEFAULT 0,
  rh_ppm NUMERIC NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add new columns to purchases
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS material_flow TEXT,
  ADD COLUMN IF NOT EXISTS buyer TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS weight_declared NUMERIC,
  ADD COLUMN IF NOT EXISTS weight_real NUMERIC,
  ADD COLUMN IF NOT EXISTS weight_loss NUMERIC,
  ADD COLUMN IF NOT EXISTS fin_status TEXT,
  ADD COLUMN IF NOT EXISTS op_status TEXT;

-- Enable RLS on new tables
ALTER TABLE public.demonstrativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for demonstrativos
CREATE POLICY "Authenticated can read demonstrativos" ON public.demonstrativos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Can insert demonstrativos" ON public.demonstrativos
  FOR INSERT TO authenticated
  WITH CHECK (user_can_do(auth.uid(), 'compras', 'create') OR user_can_do(auth.uid(), 'processos', 'advance_stage'));

CREATE POLICY "Can update demonstrativos" ON public.demonstrativos
  FOR UPDATE TO authenticated
  USING (user_can_do(auth.uid(), 'compras', 'edit') OR user_can_do(auth.uid(), 'processos', 'advance_stage'))
  WITH CHECK (user_can_do(auth.uid(), 'compras', 'edit') OR user_can_do(auth.uid(), 'processos', 'advance_stage'));

CREATE POLICY "Can delete demonstrativos" ON public.demonstrativos
  FOR DELETE TO authenticated
  USING (user_can_do(auth.uid(), 'compras', 'delete'));

-- RLS policies for lab_results
CREATE POLICY "Authenticated can read lab_results" ON public.lab_results
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Can insert lab_results" ON public.lab_results
  FOR INSERT TO authenticated
  WITH CHECK (user_can_do(auth.uid(), 'processos', 'advance_stage'));

CREATE POLICY "Can update lab_results" ON public.lab_results
  FOR UPDATE TO authenticated
  USING (user_can_do(auth.uid(), 'processos', 'advance_stage'))
  WITH CHECK (user_can_do(auth.uid(), 'processos', 'advance_stage'));

CREATE POLICY "Can delete lab_results" ON public.lab_results
  FOR DELETE TO authenticated
  USING (user_can_do(auth.uid(), 'compras', 'delete'));
