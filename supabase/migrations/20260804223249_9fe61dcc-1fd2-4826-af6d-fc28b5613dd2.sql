CREATE OR REPLACE FUNCTION public.generate_purchase_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  today_date TEXT;
  daily_count INTEGER;
BEGIN
  today_date := to_char(now(), 'DDMMYY');
  SELECT COUNT(*) + 1 INTO daily_count
  FROM public.purchases
  WHERE date::date = CURRENT_DATE;
  RETURN today_date || '-' || LPAD(daily_count::TEXT, 2, '0');
END;
$$;

UPDATE public.purchases
SET purchase_number = to_char(to_date(split_part(replace(purchase_number, ' ', ''), '-', 1), 'DD/MM/YYYY'), 'DDMMYY')
  || '-' || split_part(replace(purchase_number, ' ', ''), '-', 2)
WHERE purchase_number ~ '^\d{2}/\d{2}/\d{4}\s*-\s*\d+$';