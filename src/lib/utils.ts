import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formata número no padrão brasileiro (vírgula decimal) */
export const fmtNum = (n: number, decimals = 2) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** Formata valor em Reais: R$ 1.234,56 */
export const fmtBrl = (n: number) => `R$ ${fmtNum(n, 2)}`;

/** Formata porcentagem no padrão brasileiro: 15% / 15,5% (decimais só quando necessário) */
export const fmtPct = (n: number, decimals = 1) => {
  const v = Number.isFinite(n) ? n : 0;
  const isInt = Math.abs(v - Math.round(v)) < 1e-9;
  return `${fmtNum(v, isInt ? 0 : decimals)}%`;
};

/** Formata porcentagem com casas fixas: 15,0% */
export const fmtPctFixed = (n: number, decimals = 1) => `${fmtNum(Number.isFinite(n) ? n : 0, decimals)}%`;

/** Formata peso em kg no padrão brasileiro */
export const fmtKg = (n: number, decimals = 2) => `${fmtNum(Number.isFinite(n) ? n : 0, decimals)} kg`;

/** Converte string com vírgula decimal para número */
export const parseNum = (s: string) => parseFloat(s.replace(",", ".")) || 0;

/**
 * Converte margem lida de planilha para escala de porcentagem.
 * Células formatadas como % no Excel chegam como fração (0,03 = 3%).
 */
export const normalizePct = (n: number) => {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n < 1 ? n * 100 : n;
};
