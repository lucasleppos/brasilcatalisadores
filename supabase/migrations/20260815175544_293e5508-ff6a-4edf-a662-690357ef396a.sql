-- 1. branches
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  contact_person text DEFAULT '',
  phone text DEFAULT '',
  has_local_stock boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role-based read branches" ON public.branches FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR has_any_module_access(auth.uid(), ARRAY['filiais','compras','processos','relatorios']));

CREATE POLICY "Can insert branches" ON public.branches FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin') OR user_can_do(auth.uid(), 'filiais', 'create'));

CREATE POLICY "Can update branches" ON public.branches FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR user_can_do(auth.uid(), 'filiais', 'edit'))
WITH CHECK (has_role(auth.uid(), 'super_admin') OR user_can_do(auth.uid(), 'filiais', 'edit'));

CREATE POLICY "Can delete branches" ON public.branches FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

INSERT INTO public.branches (name, code, has_local_stock) VALUES
  ('Bahia', 'BA', true),
  ('Minas Gerais', 'MG', true),
  ('Rio de Janeiro', 'RJ', true),
  ('Jaboatão dos Guararapes', 'JAB', false),
  ('Fortaleza', 'FOR', false),
  ('Teresina', 'TER', false),
  ('Goiânia', 'GYN', false),
  ('Ribeirão Preto', 'RP', false),
  ('Curitiba', 'CTB', false),
  ('Portão', 'PRT', false),
  ('Palhoça', 'PLH', false),
  ('Manaus', 'MAN', false),
  ('Belém', 'BEL', false),
  ('Ibiporã', 'IBP', false)
ON CONFLICT (code) DO NOTHING;

-- 2. branch_transfers
CREATE TABLE IF NOT EXISTS public.branch_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'aberto',
  sent_at timestamptz,
  received_at timestamptz,
  notes text DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branch_transfers_branch_id ON public.branch_transfers(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_status ON public.branch_transfers(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.branch_transfers TO authenticated;
GRANT ALL ON public.branch_transfers TO service_role;

ALTER TABLE public.branch_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role-based read branch_transfers" ON public.branch_transfers FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR has_any_module_access(auth.uid(), ARRAY['filiais','compras','processos','relatorios']));

CREATE POLICY "Can insert branch_transfers" ON public.branch_transfers FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin') OR user_can_do(auth.uid(), 'filiais', 'create'));

CREATE POLICY "Can update branch_transfers" ON public.branch_transfers FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR user_can_do(auth.uid(), 'filiais', 'edit'))
WITH CHECK (has_role(auth.uid(), 'super_admin') OR user_can_do(auth.uid(), 'filiais', 'edit'));

CREATE POLICY "Can delete branch_transfers" ON public.branch_transfers FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

-- 3. purchases: novas colunas
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS declared_value_brl numeric,
  ADD COLUMN IF NOT EXISTS transfer_batch_id uuid REFERENCES public.branch_transfers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_pedido_number text;

COMMENT ON COLUMN public.purchases.branch_id IS 'Filial de origem (nulo = compra direta da matriz)';
COMMENT ON COLUMN public.purchases.declared_value_brl IS 'Valor declarado pela filial na conferência do pedido — travado, nunca recalculado';
COMMENT ON COLUMN public.purchases.transfer_batch_id IS 'Lote de transferência físico (branch_transfers)';
COMMENT ON COLUMN public.purchases.source_pedido_number IS 'Número do pedido original importado do PDF';

CREATE INDEX IF NOT EXISTS idx_purchases_branch_id ON public.purchases(branch_id);
CREATE INDEX IF NOT EXISTS idx_purchases_transfer_batch_id ON public.purchases(transfer_batch_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON public.purchases(supplier_id);

-- 4. branch_ledger_entries
CREATE TABLE IF NOT EXISTS public.branch_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  purchase_id uuid REFERENCES public.purchases(id) ON DELETE SET NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('credito', 'debito')),
  amount_brl numeric NOT NULL CHECK (amount_brl > 0),
  reason text NOT NULL,
  weight_declared numeric,
  weight_real numeric,
  value_declared numeric,
  value_real numeric,
  settlement_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branch_ledger_branch_id ON public.branch_ledger_entries(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_ledger_purchase_id ON public.branch_ledger_entries(purchase_id);
CREATE INDEX IF NOT EXISTS idx_branch_ledger_settlement_id ON public.branch_ledger_entries(settlement_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.branch_ledger_entries TO authenticated;
GRANT ALL ON public.branch_ledger_entries TO service_role;

ALTER TABLE public.branch_ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role-based read branch_ledger_entries" ON public.branch_ledger_entries FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR user_can_do(auth.uid(), 'filiais', 'ledger'));

CREATE POLICY "Can insert branch_ledger_entries" ON public.branch_ledger_entries FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin') OR user_can_do(auth.uid(), 'filiais', 'ledger'));

CREATE POLICY "Can update branch_ledger_entries" ON public.branch_ledger_entries FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR user_can_do(auth.uid(), 'filiais', 'ledger'))
WITH CHECK (has_role(auth.uid(), 'super_admin') OR user_can_do(auth.uid(), 'filiais', 'ledger'));

CREATE POLICY "Can delete branch_ledger_entries" ON public.branch_ledger_entries FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

-- 5. branch_settlements
CREATE TABLE IF NOT EXISTS public.branch_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_brl numeric NOT NULL DEFAULT 0,
  closed_by uuid,
  closed_at timestamptz NOT NULL DEFAULT now(),
  notes text DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_branch_settlements_branch_id ON public.branch_settlements(branch_id);

ALTER TABLE public.branch_ledger_entries
  ADD CONSTRAINT branch_ledger_entries_settlement_id_fkey
  FOREIGN KEY (settlement_id) REFERENCES public.branch_settlements(id) ON DELETE SET NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.branch_settlements TO authenticated;
GRANT ALL ON public.branch_settlements TO service_role;

ALTER TABLE public.branch_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role-based read branch_settlements" ON public.branch_settlements FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR user_can_do(auth.uid(), 'filiais', 'ledger'));

CREATE POLICY "Can insert branch_settlements" ON public.branch_settlements FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin') OR user_can_do(auth.uid(), 'filiais', 'settle'));

CREATE POLICY "Can update branch_settlements" ON public.branch_settlements FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR user_can_do(auth.uid(), 'filiais', 'settle'))
WITH CHECK (has_role(auth.uid(), 'super_admin') OR user_can_do(auth.uid(), 'filiais', 'settle'));

CREATE POLICY "Can delete branch_settlements" ON public.branch_settlements FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

-- 6. view de saldo
CREATE OR REPLACE VIEW public.branch_ledger_balance
WITH (security_invoker = true) AS
SELECT
  branch_id,
  SUM(CASE WHEN entry_type = 'credito' THEN amount_brl ELSE -amount_brl END) AS balance_brl,
  COUNT(*) AS open_entries
FROM public.branch_ledger_entries
WHERE settlement_id IS NULL
GROUP BY branch_id;

GRANT SELECT ON public.branch_ledger_balance TO authenticated;
GRANT ALL ON public.branch_ledger_balance TO service_role;

-- 7. módulo 'filiais' nas permissões
UPDATE public.permissions
SET permissions = jsonb_set(
  permissions, '{modules,filiais}',
  '{"access":true,"actions":{"create":true,"edit":true,"delete":true,"ledger":true,"settle":true},"hidden_fields":[]}'::jsonb
)
WHERE role_name IN ('super_admin', 'admin');

UPDATE public.permissions
SET permissions = jsonb_set(
  permissions, '{modules,filiais}',
  '{"access":true,"actions":{"create":true,"edit":true,"delete":false,"ledger":false,"settle":false},"hidden_fields":[]}'::jsonb
)
WHERE role_name = 'comprador';

UPDATE public.permissions
SET permissions = jsonb_set(
  permissions, '{modules,filiais}',
  '{"access":true,"actions":{"create":false,"edit":true,"delete":false,"ledger":false,"settle":false},"hidden_fields":[]}'::jsonb
)
WHERE role_name = 'operacional';

UPDATE public.permissions
SET permissions = jsonb_set(
  permissions, '{modules,filiais}',
  '{"access":false,"actions":{},"hidden_fields":[]}'::jsonb
)
WHERE role_name IN ('laboratorio', 'visualizador');