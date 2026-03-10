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
