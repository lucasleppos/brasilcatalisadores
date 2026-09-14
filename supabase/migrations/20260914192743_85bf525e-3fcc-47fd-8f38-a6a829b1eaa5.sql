CREATE TABLE public.bag_item_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bag_id uuid,
  bag_number text NOT NULL DEFAULT '',
  purchase_id uuid,
  purchase_number text NOT NULL DEFAULT '',
  purchase_item_id text NOT NULL DEFAULT '',
  weight numeric NOT NULL DEFAULT 0,
  paid_value numeric NOT NULL DEFAULT 0,
  supplier_name text NOT NULL DEFAULT '',
  action text NOT NULL DEFAULT 'removed',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.bag_item_history TO authenticated;
GRANT ALL ON public.bag_item_history TO service_role;

ALTER TABLE public.bag_item_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver o historico"
  ON public.bag_item_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados podem registrar o historico"
  ON public.bag_item_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Historico nao pode ser alterado"
  ON public.bag_item_history FOR UPDATE TO authenticated USING (false);

CREATE POLICY "Historico nao pode ser apagado"
  ON public.bag_item_history FOR DELETE TO authenticated USING (false);

CREATE INDEX bag_item_history_bag_id_idx ON public.bag_item_history (bag_id);
CREATE INDEX bag_item_history_created_at_idx ON public.bag_item_history (created_at DESC);