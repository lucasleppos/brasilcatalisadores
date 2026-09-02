DROP POLICY IF EXISTS "Can insert purchase_items" ON public.purchase_items;
CREATE POLICY "Can insert purchase_items"
ON public.purchase_items FOR INSERT
TO authenticated
WITH CHECK (
  public.user_can_do(auth.uid(), 'compras', 'create')
  OR public.user_can_do(auth.uid(), 'processos', 'advance_stage')
);

DROP POLICY IF EXISTS "Can delete purchase_items" ON public.purchase_items;
CREATE POLICY "Can delete purchase_items"
ON public.purchase_items FOR DELETE
TO authenticated
USING (
  public.user_can_do(auth.uid(), 'compras', 'delete')
  OR public.user_can_do(auth.uid(), 'processos', 'advance_stage')
);