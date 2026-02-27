
CREATE TABLE public.simulation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  calc_input JSONB NOT NULL,
  calc_result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.simulation_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to simulation_history" ON public.simulation_history FOR ALL USING (true) WITH CHECK (true);
