
-- =============================================
-- Replace permissive RLS policies with role-based ones
-- =============================================

-- PURCHASES
DROP POLICY IF EXISTS "Allow all access to purchases" ON public.purchases;
CREATE POLICY "Authenticated can read purchases" ON public.purchases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Buyers and admins can insert purchases" ON public.purchases FOR INSERT TO authenticated WITH CHECK (public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'comprador'));
CREATE POLICY "Buyers and admins can update purchases" ON public.purchases FOR UPDATE TO authenticated USING (public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'comprador')) WITH CHECK (public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'comprador'));
CREATE POLICY "Buyers and admins can delete purchases" ON public.purchases FOR DELETE TO authenticated USING (public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'comprador'));

-- PURCHASE_ITEMS
DROP POLICY IF EXISTS "Allow all access to purchase_items" ON public.purchase_items;
CREATE POLICY "Authenticated can read purchase_items" ON public.purchase_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Buyers and admins can insert purchase_items" ON public.purchase_items FOR INSERT TO authenticated WITH CHECK (public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'comprador'));
CREATE POLICY "Buyers and admins can update purchase_items" ON public.purchase_items FOR UPDATE TO authenticated USING (public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'comprador')) WITH CHECK (public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'comprador'));
CREATE POLICY "Buyers and admins can delete purchase_items" ON public.purchase_items FOR DELETE TO authenticated USING (public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'comprador'));

-- SUPPLIERS
DROP POLICY IF EXISTS "Allow all access to suppliers" ON public.suppliers;
CREATE POLICY "Authenticated can read suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Buyers and admins can insert suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'comprador'));
CREATE POLICY "Buyers and admins can update suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'comprador')) WITH CHECK (public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'comprador'));
CREATE POLICY "Buyers and admins can delete suppliers" ON public.suppliers FOR DELETE TO authenticated USING (public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'comprador'));

-- BAGS
DROP POLICY IF EXISTS "Allow all access to bags" ON public.bags;
CREATE POLICY "Authenticated can read bags" ON public.bags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ops and admins can insert bags" ON public.bags FOR INSERT TO authenticated WITH CHECK (public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'operacional', 'comprador'));
CREATE POLICY "Ops and admins can update bags" ON public.bags FOR UPDATE TO authenticated USING (public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'operacional', 'comprador')) WITH CHECK (public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'operacional', 'comprador'));
CREATE POLICY "Ops and admins can delete bags" ON public.bags FOR DELETE TO authenticated USING (public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'operacional', 'comprador'));

-- BAG_ITEMS
DROP POLICY IF EXISTS "Allow all access to bag_items" ON public.bag_items;
CREATE POLICY "Authenticated can read bag_items" ON public.bag_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ops and admins can insert bag_items" ON public.bag_items FOR INSERT TO authenticated WITH CHECK (public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'operacional', 'comprador'));
CREATE POLICY "Ops and admins can update bag_items" ON public.bag_items FOR UPDATE TO authenticated USING (public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'operacional', 'comprador')) WITH CHECK (public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'operacional', 'comprador'));
CREATE POLICY "Ops and admins can delete bag_items" ON public.bag_items FOR DELETE TO authenticated USING (public.get_user_role(auth.uid()) IN ('super_admin', 'admin', 'operacional', 'comprador'));

-- SETTINGS
DROP POLICY IF EXISTS "Allow all access to settings" ON public.settings;
CREATE POLICY "Authenticated can read settings" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin can update settings" ON public.settings FOR UPDATE TO authenticated USING (public.get_user_role(auth.uid()) = 'super_admin') WITH CHECK (public.get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "Super admin can insert settings" ON public.settings FOR INSERT TO authenticated WITH CHECK (public.get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "Super admin can delete settings" ON public.settings FOR DELETE TO authenticated USING (public.get_user_role(auth.uid()) = 'super_admin');

-- SIMULATION_HISTORY (calculator available to all authenticated users)
DROP POLICY IF EXISTS "Allow all access to simulation_history" ON public.simulation_history;
CREATE POLICY "Authenticated can read simulations" ON public.simulation_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert simulations" ON public.simulation_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete simulations" ON public.simulation_history FOR DELETE TO authenticated USING (true);
