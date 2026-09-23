CREATE TABLE public.hedges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  pt_price numeric NOT NULL,
  pd_price numeric NOT NULL,
  rh_price numeric NOT NULL,
  usd_to_brl numeric NOT NULL,
  pt_oz_contracted numeric NOT NULL DEFAULT 0,
  pd_oz_contracted numeric NOT NULL DEFAULT 0,
  rh_oz_contracted numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hedges TO authenticated;
GRANT ALL ON public.hedges TO service_role;
ALTER TABLE public.hedges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hedges read" ON public.hedges FOR SELECT TO authenticated USING (true);
CREATE POLICY "hedges insert" ON public.hedges FOR INSERT TO authenticated WITH CHECK ((SELECT public.user_can_do((SELECT auth.uid()), 'configuracoes')));
CREATE POLICY "hedges update" ON public.hedges FOR UPDATE TO authenticated USING ((SELECT public.user_can_do((SELECT auth.uid()), 'configuracoes')));
CREATE POLICY "hedges delete" ON public.hedges FOR DELETE TO authenticated USING ((SELECT public.user_can_do((SELECT auth.uid()), 'configuracoes')));

CREATE OR REPLACE FUNCTION public.hedges_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.end_date IS NOT NULL AND NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'Data de fim anterior à data de início';
  END IF;
  IF TG_OP = 'INSERT' THEN
    UPDATE public.hedges SET end_date = NEW.start_date - 1
    WHERE end_date IS NULL AND start_date < NEW.start_date;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.hedges h WHERE h.id <> NEW.id
      AND daterange(h.start_date, COALESCE(h.end_date, 'infinity'::date), '[]')
       && daterange(NEW.start_date, COALESCE(NEW.end_date, 'infinity'::date), '[]')
  ) THEN
    RAISE EXCEPTION 'Já existe um hedge vigente nesse período';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_hedges_validate BEFORE INSERT OR UPDATE ON public.hedges
FOR EACH ROW EXECUTE FUNCTION public.hedges_validate();

ALTER TABLE public.purchases ADD COLUMN hedge_id uuid REFERENCES public.hedges(id);

CREATE OR REPLACE FUNCTION public.purchases_assign_hedge()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.hedge_id IS NULL THEN
    SELECT id INTO NEW.hedge_id FROM public.hedges
    WHERE start_date <= (COALESCE(NEW.date, now()) AT TIME ZONE 'America/Sao_Paulo')::date
      AND (end_date IS NULL OR end_date >= (COALESCE(NEW.date, now()) AT TIME ZONE 'America/Sao_Paulo')::date)
    ORDER BY start_date DESC LIMIT 1;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.purchases_assign_hedge() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_purchases_assign_hedge BEFORE INSERT ON public.purchases
FOR EACH ROW EXECUTE FUNCTION public.purchases_assign_hedge();

CREATE TABLE public.hedge_consumption (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hedge_id uuid NOT NULL REFERENCES public.hedges(id),
  purchase_id uuid NOT NULL UNIQUE REFERENCES public.purchases(id) ON DELETE CASCADE,
  pt_oz numeric NOT NULL DEFAULT 0,
  pd_oz numeric NOT NULL DEFAULT 0,
  rh_oz numeric NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hedge_consumption TO authenticated;
GRANT ALL ON public.hedge_consumption TO service_role;
ALTER TABLE public.hedge_consumption ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hc read" ON public.hedge_consumption FOR SELECT TO authenticated USING (true);
CREATE POLICY "hc insert" ON public.hedge_consumption FOR INSERT TO authenticated WITH CHECK ((SELECT public.user_can_do((SELECT auth.uid()), 'processos')));
CREATE POLICY "hc update" ON public.hedge_consumption FOR UPDATE TO authenticated USING ((SELECT public.user_can_do((SELECT auth.uid()), 'processos')));
CREATE POLICY "hc delete" ON public.hedge_consumption FOR DELETE TO authenticated USING ((SELECT public.user_can_do((SELECT auth.uid()), 'processos')));

CREATE TABLE public.hedge_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  from_hedge_id uuid REFERENCES public.hedges(id),
  to_hedge_id uuid NOT NULL REFERENCES public.hedges(id),
  justification text NOT NULL,
  changed_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.hedge_change_log TO authenticated;
GRANT ALL ON public.hedge_change_log TO service_role;
ALTER TABLE public.hedge_change_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hcl read" ON public.hedge_change_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "hcl insert" ON public.hedge_change_log FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.user_can_do((SELECT auth.uid()), 'processos', 'trocar_hedge')) AND length(trim(justification)) >= 5);

INSERT INTO public.hedges (name, start_date, end_date, pt_price, pd_price, rh_price, usd_to_brl)
VALUES ('Hedge 1', '2026-09-02', '2026-09-11', 1750, 1265, 8950, 5.15),
       ('Hedge 2', '2026-09-12', NULL, 1777, 1297, 9300, 5.11);