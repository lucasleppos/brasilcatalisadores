
-- Allow operacional and laboratorio to update purchases (for status advancement)
DROP POLICY IF EXISTS "Buyers and admins can update purchases" ON public.purchases;
CREATE POLICY "Authorized roles can update purchases"
ON public.purchases
FOR UPDATE
TO authenticated
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'comprador'::app_role, 'operacional'::app_role, 'laboratorio'::app_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'comprador'::app_role, 'operacional'::app_role, 'laboratorio'::app_role]));

-- Allow laboratorio to update purchase_items (for PPM entry)
DROP POLICY IF EXISTS "Buyers and admins can update purchase_items" ON public.purchase_items;
CREATE POLICY "Authorized roles can update purchase_items"
ON public.purchase_items
FOR UPDATE
TO authenticated
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'comprador'::app_role, 'laboratorio'::app_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role, 'comprador'::app_role, 'laboratorio'::app_role]));
