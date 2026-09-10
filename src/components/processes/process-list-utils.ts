import { Purchase, isSacolaFlow } from "@/lib/purchases";

/** Tempo decorrido desde a última mudança de etapa, em formato curto (agora/12h/8d). */
export function timeSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "agora";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/** Dias inteiros desde a última mudança de etapa. */
export function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export function flowBadge(p: Purchase): { label: string; className: string; name: string } {
  if (p.materialFlow === "ceramico")
    return { label: "CE", className: "bg-amber-100 text-amber-800", name: "Cerâmico" };
  if (isSacolaFlow(p))
    return { label: "SA", className: "bg-emerald-100 text-emerald-800", name: "Sacola" };
  return { label: "PC", className: "bg-sky-100 text-sky-800", name: "Peças" };
}

export function purchaseWeight(p: Purchase): number {
  if (p.weightReal) return p.weightReal;
  if (p.bulkWeight) return p.bulkWeight;
  if (p.weightDeclared) return p.weightDeclared;
  return p.items.reduce((s, i) => s + (i.weight || 0) * (i.quantity || 1), 0);
}

export function lastChangeDate(p: Purchase): string {
  const last = p.statusHistory[p.statusHistory.length - 1];
  return last?.date || p.date;
}
