ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS margin_pecas numeric NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS margin_ceramico numeric NOT NULL DEFAULT 15;

UPDATE public.suppliers SET margin_pecas = margin, margin_ceramico = margin;

CREATE TABLE IF NOT EXISTS public.price_override_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id uuid NOT NULL,
  purchase_item_id uuid NOT NULL,
  item_label text NOT NULL DEFAULT '',
  calculated_unit_value numeric NOT NULL DEFAULT 0,
  new_unit_value numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  justification text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  created_by uuid,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_override_log TO authenticated;
GRANT ALL ON public.price_override_log TO service_role;

ALTER TABLE public.price_override_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view price overrides"
  ON public.price_override_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can create price overrides"
  ON public.price_override_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Approvers can review price overrides"
  ON public.price_override_log FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.user_can_do(auth.uid(), 'compras', 'aprovar_preco'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.user_can_do(auth.uid(), 'compras', 'aprovar_preco'));

CREATE INDEX IF NOT EXISTS idx_price_override_purchase ON public.price_override_log(purchase_id);