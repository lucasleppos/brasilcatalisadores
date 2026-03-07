
-- =============================================
-- Dynamic Permission System Migration
-- =============================================

-- 1. Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text UNIQUE NOT NULL,
  label text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Seed 6 default permission profiles
INSERT INTO public.permissions (role_name, label, is_default, permissions) VALUES
('super_admin', 'Super Admin', true, '{"modules":{"dashboard":{"access":true},"compras":{"access":true,"actions":{"create":true,"edit":true,"delete":true},"hidden_fields":[]},"fornecedores":{"access":true,"actions":{"create":true,"edit":true,"delete":true,"import":true},"hidden_fields":[]},"processos":{"access":true,"actions":{"advance_stage":true},"hidden_fields":[]},"bags":{"access":true,"actions":{"create":true,"edit":true,"delete":true},"hidden_fields":[]},"relatorios":{"access":true},"calculadora":{"access":true},"configuracoes":{"access":true},"usuarios":{"access":true,"actions":{"create":true,"edit":true,"delete":true},"hidden_fields":[]},"permissoes":{"access":true}}}'),
('admin', 'Admin', true, '{"modules":{"dashboard":{"access":true},"compras":{"access":true,"actions":{"create":true,"edit":true,"delete":true},"hidden_fields":[]},"fornecedores":{"access":true,"actions":{"create":true,"edit":true,"delete":true,"import":true},"hidden_fields":[]},"processos":{"access":true,"actions":{"advance_stage":true},"hidden_fields":[]},"bags":{"access":true,"actions":{"create":true,"edit":true,"delete":true},"hidden_fields":[]},"relatorios":{"access":true},"calculadora":{"access":true},"configuracoes":{"access":false},"usuarios":{"access":false},"permissoes":{"access":false}}}'),
('comprador', 'Comprador', true, '{"modules":{"dashboard":{"access":true},"compras":{"access":true,"actions":{"create":true,"edit":true,"delete":true},"hidden_fields":[]},"fornecedores":{"access":true,"actions":{"create":true,"edit":true,"delete":true,"import":true},"hidden_fields":[]},"processos":{"access":true,"actions":{"advance_stage":false},"hidden_fields":[]},"bags":{"access":true,"actions":{"create":true,"edit":true,"delete":true},"hidden_fields":[]},"relatorios":{"access":false},"calculadora":{"access":true},"configuracoes":{"access":false},"usuarios":{"access":false},"permissoes":{"access":false}}}'),
('operacional', 'Operacional', true, '{"modules":{"dashboard":{"access":true},"compras":{"access":false},"fornecedores":{"access":false},"processos":{"access":true,"actions":{"advance_stage":true},"hidden_fields":[]},"bags":{"access":true,"actions":{"create":true,"edit":true,"delete":true},"hidden_fields":[]},"relatorios":{"access":false},"calculadora":{"access":true},"configuracoes":{"access":false},"usuarios":{"access":false},"permissoes":{"access":false}}}'),
('laboratorio', 'Laboratório', true, '{"modules":{"dashboard":{"access":true},"compras":{"access":false},"fornecedores":{"access":false},"processos":{"access":true,"actions":{"advance_stage":true},"hidden_fields":[]},"bags":{"access":false},"relatorios":{"access":false},"calculadora":{"access":true},"configuracoes":{"access":false},"usuarios":{"access":false},"permissoes":{"access":false}}}'),
('visualizador', 'Visualizador', true, '{"modules":{"dashboard":{"access":true},"compras":{"access":false},"fornecedores":{"access":false},"processos":{"access":false},"bags":{"access":false},"relatorios":{"access":false},"calculadora":{"access":true},"configuracoes":{"access":false},"usuarios":{"access":false},"permissoes":{"access":false}}}');

-- 3. Drop ALL RLS policies that reference app_role enum
DROP POLICY IF EXISTS "Ops and admins can insert bag_items" ON public.bag_items;
DROP POLICY IF EXISTS "Ops and admins can update bag_items" ON public.bag_items;
DROP POLICY IF EXISTS "Ops and admins can delete bag_items" ON public.bag_items;
DROP POLICY IF EXISTS "Ops and admins can insert bags" ON public.bags;
DROP POLICY IF EXISTS "Ops and admins can update bags" ON public.bags;
DROP POLICY IF EXISTS "Ops and admins can delete bags" ON public.bags;
DROP POLICY IF EXISTS "Super admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Buyers and admins can insert purchase_items" ON public.purchase_items;
DROP POLICY IF EXISTS "Buyers and admins can delete purchase_items" ON public.purchase_items;
DROP POLICY IF EXISTS "Authorized roles can update purchase_items" ON public.purchase_items;
DROP POLICY IF EXISTS "Buyers and admins can insert purchases" ON public.purchases;
DROP POLICY IF EXISTS "Buyers and admins can delete purchases" ON public.purchases;
DROP POLICY IF EXISTS "Authorized roles can update purchases" ON public.purchases;
DROP POLICY IF EXISTS "Super admin can update settings" ON public.settings;
DROP POLICY IF EXISTS "Super admin can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Super admin can delete settings" ON public.settings;
DROP POLICY IF EXISTS "Buyers and admins can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Buyers and admins can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Buyers and admins can delete suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Super admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can delete roles" ON public.user_roles;

-- 4. Drop functions that use app_role
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

-- 5. Alter user_roles.role from enum to text
ALTER TABLE public.user_roles ALTER COLUMN role TYPE text USING role::text;

-- 6. Drop the enum
DROP TYPE IF EXISTS public.app_role;

-- 7. Add FK from user_roles.role to permissions.role_name
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_permissions_fkey
  FOREIGN KEY (role) REFERENCES public.permissions(role_name) ON UPDATE CASCADE ON DELETE RESTRICT;

-- 8. Recreate functions with text types
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.user_can_do(_user_id uuid, _module text, _action text DEFAULT 'access')
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.permissions p ON p.role_name = ur.role
    WHERE ur.user_id = _user_id
    AND (p.permissions->'modules'->_module->>'access')::boolean = true
    AND (
      _action = 'access'
      OR COALESCE((p.permissions->'modules'->_module->'actions'->>_action)::boolean, false) = true
    )
  )
$$;

-- 9. Recreate all RLS policies using user_can_do
CREATE POLICY "Can insert bag_items" ON public.bag_items FOR INSERT TO authenticated
  WITH CHECK (user_can_do(auth.uid(), 'bags', 'create'));
CREATE POLICY "Can update bag_items" ON public.bag_items FOR UPDATE TO authenticated
  USING (user_can_do(auth.uid(), 'bags', 'edit'))
  WITH CHECK (user_can_do(auth.uid(), 'bags', 'edit'));
CREATE POLICY "Can delete bag_items" ON public.bag_items FOR DELETE TO authenticated
  USING (user_can_do(auth.uid(), 'bags', 'delete'));

CREATE POLICY "Can insert bags" ON public.bags FOR INSERT TO authenticated
  WITH CHECK (user_can_do(auth.uid(), 'bags', 'create'));
CREATE POLICY "Can update bags" ON public.bags FOR UPDATE TO authenticated
  USING (user_can_do(auth.uid(), 'bags', 'edit'))
  WITH CHECK (user_can_do(auth.uid(), 'bags', 'edit'));
CREATE POLICY "Can delete bags" ON public.bags FOR DELETE TO authenticated
  USING (user_can_do(auth.uid(), 'bags', 'delete'));

CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (user_can_do(auth.uid(), 'usuarios', 'access'));
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_can_do(auth.uid(), 'usuarios', 'create'));

CREATE POLICY "Can insert purchase_items" ON public.purchase_items FOR INSERT TO authenticated
  WITH CHECK (user_can_do(auth.uid(), 'compras', 'create'));
CREATE POLICY "Can update purchase_items" ON public.purchase_items FOR UPDATE TO authenticated
  USING (user_can_do(auth.uid(), 'compras', 'edit') OR user_can_do(auth.uid(), 'processos', 'advance_stage'))
  WITH CHECK (user_can_do(auth.uid(), 'compras', 'edit') OR user_can_do(auth.uid(), 'processos', 'advance_stage'));
CREATE POLICY "Can delete purchase_items" ON public.purchase_items FOR DELETE TO authenticated
  USING (user_can_do(auth.uid(), 'compras', 'delete'));

CREATE POLICY "Can insert purchases" ON public.purchases FOR INSERT TO authenticated
  WITH CHECK (user_can_do(auth.uid(), 'compras', 'create'));
CREATE POLICY "Can update purchases" ON public.purchases FOR UPDATE TO authenticated
  USING (user_can_do(auth.uid(), 'compras', 'edit') OR user_can_do(auth.uid(), 'processos', 'advance_stage'))
  WITH CHECK (user_can_do(auth.uid(), 'compras', 'edit') OR user_can_do(auth.uid(), 'processos', 'advance_stage'));
CREATE POLICY "Can delete purchases" ON public.purchases FOR DELETE TO authenticated
  USING (user_can_do(auth.uid(), 'compras', 'delete'));

CREATE POLICY "Can update settings" ON public.settings FOR UPDATE TO authenticated
  USING (user_can_do(auth.uid(), 'configuracoes', 'access'))
  WITH CHECK (user_can_do(auth.uid(), 'configuracoes', 'access'));
CREATE POLICY "Can insert settings" ON public.settings FOR INSERT TO authenticated
  WITH CHECK (user_can_do(auth.uid(), 'configuracoes', 'access'));
CREATE POLICY "Can delete settings" ON public.settings FOR DELETE TO authenticated
  USING (user_can_do(auth.uid(), 'configuracoes', 'access'));

CREATE POLICY "Can insert suppliers" ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (user_can_do(auth.uid(), 'fornecedores', 'create'));
CREATE POLICY "Can update suppliers" ON public.suppliers FOR UPDATE TO authenticated
  USING (user_can_do(auth.uid(), 'fornecedores', 'edit'))
  WITH CHECK (user_can_do(auth.uid(), 'fornecedores', 'edit'));
CREATE POLICY "Can delete suppliers" ON public.suppliers FOR DELETE TO authenticated
  USING (user_can_do(auth.uid(), 'fornecedores', 'delete'));

CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_can_do(auth.uid(), 'usuarios', 'access'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (user_can_do(auth.uid(), 'usuarios', 'create'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (user_can_do(auth.uid(), 'usuarios', 'edit'))
  WITH CHECK (user_can_do(auth.uid(), 'usuarios', 'edit'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (user_can_do(auth.uid(), 'usuarios', 'delete'));

-- 10. Enable RLS on permissions table
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read permissions" ON public.permissions FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Can manage permissions" ON public.permissions FOR INSERT TO authenticated
  WITH CHECK (user_can_do(auth.uid(), 'permissoes', 'access'));
CREATE POLICY "Can update permissions" ON public.permissions FOR UPDATE TO authenticated
  USING (user_can_do(auth.uid(), 'permissoes', 'access'))
  WITH CHECK (user_can_do(auth.uid(), 'permissoes', 'access'));
CREATE POLICY "Can delete permissions" ON public.permissions FOR DELETE TO authenticated
  USING (user_can_do(auth.uid(), 'permissoes', 'access'));
