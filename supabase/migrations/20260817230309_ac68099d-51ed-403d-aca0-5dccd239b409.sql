ALTER TABLE public.purchase_items
  ADD COLUMN IF NOT EXISTS part_code text,
  ADD COLUMN IF NOT EXISTS part_reference text,
  ADD COLUMN IF NOT EXISTS part_vehicle text,
  ADD COLUMN IF NOT EXISTS pedido_number text;