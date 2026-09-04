import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

/** Normaliza nome: sem acentos, minúsculo, espaços colapsados */
export function normalizeName(s: string | null | undefined): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Escopo do comprador: quando o usuário tem o perfil "comprador",
 * ele só vê registros cujo comprador esteja entre os nomes vinculados
 * ao seu cadastro (profiles.buyer_names) ou, na falta deles, o próprio nome.
 */
export function useBuyerScope() {
  const { role, profile } = useAuth();
  const isBuyer = role === "comprador";

  const allowed = useMemo(() => {
    const names = (profile?.buyer_names || []).map(normalizeName).filter(Boolean);
    if (names.length) return names;
    const own = normalizeName(profile?.full_name);
    return own ? [own] : [];
  }, [profile?.buyer_names, profile?.full_name]);

  const matchesBuyer = (buyer: string | null | undefined): boolean => {
    if (!isBuyer) return true;
    if (!allowed.length) return false;
    return allowed.includes(normalizeName(buyer));
  };

  /** Filtra uma lista de registros que possuem o campo `buyer` */
  const scopeByBuyer = <T extends { buyer?: string | null }>(rows: T[]): T[] =>
    isBuyer ? rows.filter((r) => matchesBuyer(r.buyer)) : rows;

  return { isBuyer, allowed, matchesBuyer, scopeByBuyer };
}
