-- Helper: module access check
CREATE OR REPLACE FUNCTION public.has_any_module_access(_user_id uuid, _modules text[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.permissions p ON p.role_name = ur.role
    CROSS JOIN LATERAL unnest(_modules) AS m(name)
    WHERE ur.user_id = _user_id
      AND (p.permissions->'modules'->m.name->>'access')::boolean = true
  )
$$;

REVOKE ALL ON FUNCTION public.has_any_module_access(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_module_access(uuid, text[]) TO authenticated, service_role;

-- purchases
DROP POLICY IF EXISTS "Authenticated can read purchases" ON public.purchases;
CREATE POLICY "Role-based read purchases" ON public.purchases FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR has_any_module_access(auth.uid(), ARRAY['compras','processos','bags','relatorios','concluidos']));

-- purchase_items
DROP POLICY IF EXISTS "Authenticated can read purchase_items" ON public.purchase_items;
CREATE POLICY "Role-based read purchase_items" ON public.purchase_items FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR has_any_module_access(auth.uid(), ARRAY['compras','processos','bags','relatorios','concluidos']));

-- demonstrativos
DROP POLICY IF EXISTS "Authenticated can read demonstrativos" ON public.demonstrativos;
CREATE POLICY "Role-based read demonstrativos" ON public.demonstrativos FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR has_any_module_access(auth.uid(), ARRAY['compras','processos','relatorios','concluidos']));

-- stage_evidence
DROP POLICY IF EXISTS "Authenticated can read stage_evidence" ON public.stage_evidence;
CREATE POLICY "Role-based read stage_evidence" ON public.stage_evidence FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR has_any_module_access(auth.uid(), ARRAY['compras','processos','relatorios','concluidos']));

-- lab tables
DROP POLICY IF EXISTS "Authenticated can read lab_results" ON public.lab_results;
CREATE POLICY "Role-based read lab_results" ON public.lab_results FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR has_any_module_access(auth.uid(), ARRAY['compras','processos','bags','relatorios','concluidos']));

DROP POLICY IF EXISTS "Authenticated can read lab_analyses" ON public.lab_analyses;
CREATE POLICY "Role-based read lab_analyses" ON public.lab_analyses FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR has_any_module_access(auth.uid(), ARRAY['compras','processos','bags','relatorios','concluidos']));

DROP POLICY IF EXISTS "Authenticated can read lab_result_history" ON public.lab_result_history;
CREATE POLICY "Role-based read lab_result_history" ON public.lab_result_history FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR has_any_module_access(auth.uid(), ARRAY['compras','processos','relatorios','concluidos']));

DROP POLICY IF EXISTS "Authenticated can insert lab_result_history" ON public.lab_result_history;
CREATE POLICY "Stage operators can insert lab_result_history" ON public.lab_result_history FOR INSERT TO authenticated
WITH CHECK (
  (changed_by IS NULL OR changed_by = auth.uid())
  AND (has_role(auth.uid(), 'super_admin') OR user_can_do(auth.uid(), 'processos', 'advance_stage'))
);

-- price_override_log
DROP POLICY IF EXISTS "Authenticated can view price overrides" ON public.price_override_log;
CREATE POLICY "Role-based read price overrides" ON public.price_override_log FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'super_admin')
  OR created_by = auth.uid()
  OR has_any_module_access(auth.uid(), ARRAY['compras','processos','relatorios'])
);

-- bags / bag_items
DROP POLICY IF EXISTS "Authenticated can read bags" ON public.bags;
CREATE POLICY "Role-based read bags" ON public.bags FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR has_any_module_access(auth.uid(), ARRAY['bags','processos','compras','relatorios','concluidos']));

DROP POLICY IF EXISTS "Authenticated can read bag_items" ON public.bag_items;
CREATE POLICY "Role-based read bag_items" ON public.bag_items FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR has_any_module_access(auth.uid(), ARRAY['bags','processos','compras','relatorios','concluidos']));

-- suppliers
DROP POLICY IF EXISTS "Authenticated can read suppliers" ON public.suppliers;
CREATE POLICY "Role-based read suppliers" ON public.suppliers FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR has_any_module_access(auth.uid(), ARRAY['fornecedores','compras','processos','bags','relatorios','concluidos']));

-- catalog
DROP POLICY IF EXISTS "Authenticated can read catalog_groups" ON public.catalog_groups;
CREATE POLICY "Role-based read catalog_groups" ON public.catalog_groups FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR has_any_module_access(auth.uid(), ARRAY['catalogo','compras','processos','calculadora','relatorios']));

DROP POLICY IF EXISTS "Authenticated can read catalog_parts" ON public.catalog_parts;
CREATE POLICY "Role-based read catalog_parts" ON public.catalog_parts FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR has_any_module_access(auth.uid(), ARRAY['catalogo','compras','processos','calculadora','relatorios']));

-- simulation_history
DROP POLICY IF EXISTS "Authenticated can read simulations" ON public.simulation_history;
CREATE POLICY "Role-based read simulations" ON public.simulation_history FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR has_any_module_access(auth.uid(), ARRAY['calculadora','relatorios']));

-- settings
DROP POLICY IF EXISTS "Authenticated can read settings" ON public.settings;
CREATE POLICY "Role-based read settings" ON public.settings FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR has_any_module_access(auth.uid(), ARRAY['configuracoes','calculadora','compras','processos','bags','relatorios','concluidos']));

-- permissions
DROP POLICY IF EXISTS "Authenticated can read permissions" ON public.permissions;
CREATE POLICY "Read own role or manage permissions" ON public.permissions FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'super_admin')
  OR user_can_do(auth.uid(), 'permissoes', 'access')
  OR user_can_do(auth.uid(), 'usuarios', 'access')
  OR role_name = get_user_role(auth.uid())
);

-- storage: restrict stage-photos reads
DROP POLICY IF EXISTS "Anyone can view stage photos" ON storage.objects;
CREATE POLICY "Authorised users can view stage photos" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'stage-photos'
  AND (has_role(auth.uid(), 'super_admin') OR has_any_module_access(auth.uid(), ARRAY['compras','processos','relatorios','concluidos']))
);

-- lock down internal definer functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_can_do(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_bag_number() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_purchase_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_do(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_bag_number() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_purchase_number() TO authenticated, service_role;