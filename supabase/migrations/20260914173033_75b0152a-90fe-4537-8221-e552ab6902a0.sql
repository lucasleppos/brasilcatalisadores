CREATE OR REPLACE FUNCTION public.generate_purchase_number()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  today_date TEXT;
  next_num INTEGER;
BEGIN
  today_date := to_char(now(), 'DDMMYY');
  PERFORM pg_advisory_xact_lock(hashtext('purchase_number_' || today_date));
  SELECT COALESCE(MAX(NULLIF(regexp_replace(split_part(purchase_number, '-', 2), '\D', '', 'g'), '')::int), 0) + 1
  INTO next_num
  FROM public.purchases
  WHERE purchase_number LIKE today_date || '-%';
  RETURN today_date || '-' || LPAD(next_num::TEXT, 2, '0');
END;
$function$;

CREATE UNIQUE INDEX IF NOT EXISTS purchases_purchase_number_unique
  ON public.purchases (purchase_number)
  WHERE created_at > '2026-09-14 18:00:00+00';