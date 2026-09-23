CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_catalog_parts_code_trgm ON public.catalog_parts USING gin (code gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_catalog_parts_reference_trgm ON public.catalog_parts USING gin (reference gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_catalog_parts_brand_trgm ON public.catalog_parts USING gin (brand gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_catalog_parts_vehicle_trgm ON public.catalog_parts USING gin (vehicle gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_bag_items_bag_id ON public.bag_items (bag_id);
CREATE INDEX IF NOT EXISTS idx_bag_items_purchase_id ON public.bag_items (purchase_id);
CREATE INDEX IF NOT EXISTS idx_bag_item_history_bag_id ON public.bag_item_history (bag_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_purchase_id ON public.lab_results (purchase_id);
CREATE INDEX IF NOT EXISTS idx_stage_evidence_purchase_task ON public.stage_evidence (purchase_id, task_key);

DO $do$
DECLARE
  p RECORD;
  new_qual TEXT;
  new_check TEXT;
  sql TEXT;
BEGIN
  FOR p IN
    SELECT tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        COALESCE(qual, '') ~ '(has_role|has_any_module_access|user_can_do|get_user_role)\(' OR
        COALESCE(with_check, '') ~ '(has_role|has_any_module_access|user_can_do|get_user_role)\('
      )
  LOOP
    -- Skip policies that reference row columns: a scalar subquery would become correlated.
    IF COALESCE(p.qual, '') ~* '\m(user_id|created_by|branch_id|role_name)\M'
       OR COALESCE(p.with_check, '') ~* '\m(user_id|created_by|branch_id|role_name)\M' THEN
      CONTINUE;
    END IF;

    new_qual := CASE WHEN p.qual IS NULL THEN NULL ELSE '(SELECT ' || p.qual || ')' END;
    new_check := CASE WHEN p.with_check IS NULL THEN NULL ELSE '(SELECT ' || p.with_check || ')' END;

    sql := format('ALTER POLICY %I ON public.%I', p.policyname, p.tablename);
    IF new_qual IS NOT NULL THEN
      sql := sql || ' USING (' || new_qual || ')';
    END IF;
    IF new_check IS NOT NULL THEN
      sql := sql || ' WITH CHECK (' || new_check || ')';
    END IF;
    EXECUTE sql;
  END LOOP;
END
$do$;

ANALYZE public.catalog_parts;
ANALYZE public.purchase_items;
ANALYZE public.purchases;