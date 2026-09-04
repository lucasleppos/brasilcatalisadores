import { supabase } from "@/integrations/supabase/client";
import { normalizeName } from "@/lib/buyer-scope";

/** Um perfil de acesso é de comprador quando o nome do perfil contém "comprador". */
export const isBuyerRole = (role?: string | null) =>
  normalizeName(role).includes("comprador");

/**
 * Lista oficial de compradores: nomes vinculados aos usuários cujo perfil é de
 * comprador (profiles.buyer_names) ou, na falta deles, o nome completo do usuário.
 * Nenhum dado é alterado — a lista é apenas para seleção.
 */
export async function loadBuyerOptions(): Promise<string[]> {
  const res = await supabase.functions.invoke("manage-user", { body: { action: "list" } });
  const users = (res.data?.users || []) as Array<{
    full_name?: string | null;
    role?: string | null;
    buyer_names?: string[] | null;
  }>;

  const seen = new Map<string, string>();
  users.filter((u) => isBuyerRole(u.role)).forEach((u) => {
    const names = (u.buyer_names || []).map((n) => (n || "").trim()).filter(Boolean);
    const list = names.length ? names : [(u.full_name || "").trim()].filter(Boolean);
    list.forEach((n) => {
      const key = normalizeName(n);
      if (key && !seen.has(key)) seen.set(key, n);
    });
  });

  return [...seen.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
