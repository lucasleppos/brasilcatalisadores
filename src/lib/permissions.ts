import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ModulePermission {
  access: boolean;
  actions?: Record<string, boolean>;
  hidden_fields?: string[];
}

export interface PermissionConfig {
  modules: Record<string, ModulePermission>;
}

export interface PermissionProfile {
  id: string;
  role_name: string;
  label: string;
  is_default: boolean;
  permissions: PermissionConfig;
  created_at: string;
}

export const MODULE_DEFINITIONS: Record<string, {
  label: string;
  actions: { key: string; label: string }[];
  fields: { key: string; label: string }[];
}> = {
  dashboard: { label: "Dashboard", actions: [], fields: [] },
  compras: {
    label: "Compras",
    actions: [
      { key: "create", label: "Criar" },
      { key: "edit", label: "Editar" },
      { key: "delete", label: "Excluir" },
    ],
    fields: [
      { key: "total_brl", label: "Valor Total (R$)" },
      { key: "erp_number", label: "Nº ERP / Boleto" },
    ],
  },
  fornecedores: {
    label: "Fornecedores",
    actions: [
      { key: "create", label: "Criar" },
      { key: "edit", label: "Editar" },
      { key: "delete", label: "Excluir" },
      { key: "import", label: "Importar Excel" },
    ],
    fields: [
      { key: "margin", label: "Margem %" },
      { key: "document", label: "CNPJ/CPF" },
      { key: "email", label: "E-mail" },
    ],
  },
  processos: {
    label: "Processos",
    actions: [
      { key: "advance_stage", label: "Avançar Etapa" },
    ],
    fields: [],
  },
  bags: {
    label: "Bags",
    actions: [
      { key: "create", label: "Criar" },
      { key: "edit", label: "Editar" },
      { key: "delete", label: "Excluir" },
    ],
    fields: [
      { key: "total_paid_brl", label: "Total Pago (R$)" },
      { key: "refiner_total_value", label: "Valor Refinadora" },
    ],
  },
  concluidos: {
    label: "Concluídos",
    actions: [],
    fields: [],
  },
  catalogo: {
    label: "Catálogo",
    actions: [
      { key: "create", label: "Criar" },
      { key: "edit", label: "Editar" },
      { key: "delete", label: "Excluir" },
      { key: "import", label: "Importar Excel" },
    ],
    fields: [],
  },
  relatorios: { label: "Relatórios", actions: [], fields: [] },
  calculadora: { label: "Calculadora", actions: [], fields: [] },
  configuracoes: { label: "Configurações", actions: [], fields: [] },
  usuarios: {
    label: "Usuários",
    actions: [
      { key: "create", label: "Criar/Convidar" },
      { key: "edit", label: "Editar" },
      { key: "delete", label: "Excluir" },
    ],
    fields: [],
  },
  permissoes: { label: "Permissões", actions: [], fields: [] },
};

export function usePermissions() {
  const { role } = useAuth();

  const { data: permissionProfile, isLoading } = useQuery({
    queryKey: ["permissions", role, "v2"],
    queryFn: async () => {
      if (!role) return null;
      const { data } = await supabase
        .from("permissions" as any)
        .select("*")
        .eq("role_name", role)
        .maybeSingle();
      return data as unknown as PermissionProfile | null;
    },
    enabled: !!role,
    staleTime: 5 * 60 * 1000,
  });

  const canAccess = (module: string): boolean => {
    if (!permissionProfile) return false;
    return permissionProfile.permissions?.modules?.[module]?.access ?? false;
  };

  const canDo = (module: string, action: string): boolean => {
    if (!permissionProfile) return false;
    const mod = permissionProfile.permissions?.modules?.[module];
    if (!mod?.access) return false;
    if (action === "access") return true;
    return mod.actions?.[action] ?? false;
  };

  const isFieldHidden = (module: string, field: string): boolean => {
    if (!permissionProfile) return false;
    const mod = permissionProfile.permissions?.modules?.[module];
    return mod?.hidden_fields?.includes(field) ?? false;
  };

  return {
    permissionProfile,
    canAccess,
    canDo,
    isFieldHidden,
    loading: isLoading && !!role,
  };
}

export async function loadPermissionProfiles(): Promise<PermissionProfile[]> {
  const { data } = await supabase
    .from("permissions" as any)
    .select("*")
    .order("is_default", { ascending: false })
    .order("label");
  return (data as unknown as PermissionProfile[]) || [];
}

export async function savePermissionProfile(
  profile: Partial<PermissionProfile> & { role_name: string; label: string; permissions: PermissionConfig }
): Promise<boolean> {
  if (profile.id) {
    const { error } = await supabase
      .from("permissions" as any)
      .update({
        label: profile.label,
        permissions: profile.permissions as any,
      })
      .eq("id", profile.id);
    return !error;
  } else {
    const { error } = await supabase
      .from("permissions" as any)
      .insert({
        role_name: profile.role_name,
        label: profile.label,
        is_default: false,
        permissions: profile.permissions as any,
      });
    return !error;
  }
}

export async function deletePermissionProfile(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("permissions" as any)
    .delete()
    .eq("id", id);
  return !error;
}
