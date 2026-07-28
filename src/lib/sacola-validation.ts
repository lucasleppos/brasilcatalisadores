/**
 * Regras de validação para "Peça em Sacola".
 *
 * 1) Peso: diferença aceitável de até 3% para MENOS em relação ao catálogo.
 * 2) Análise: diferença aceitável de até 5% para MENOS entre catálogo e laboratório.
 *
 * Se o valor real for MAIOR que o catálogo, paga-se sempre pelo catálogo.
 * Se estiver ABAIXO mas dentro da margem, paga-se pelo catálogo (apenas sinaliza).
 * Se estiver ABAIXO e FORA da margem, paga-se pelo real (peso + PPM da análise).
 */

export const WEIGHT_MARGIN_PCT = 3;
export const ANALYSIS_MARGIN_PCT = 5;

export interface MarginCheck {
  /** Diferença percentual (real - catálogo) / catálogo * 100 */
  diffPct: number;
  /** Existe base de catálogo para comparar */
  hasBase: boolean;
  /** Real está dentro da margem (ou acima do catálogo) */
  withinMargin: boolean;
  /** Deve pagar pelo catálogo */
  useCatalog: boolean;
  label: string;
}

function build(base: number, real: number, marginPct: number): MarginCheck {
  if (!base || base <= 0 || !real || real <= 0) {
    return { diffPct: 0, hasBase: false, withinMargin: true, useCatalog: true, label: "—" };
  }
  const diffPct = ((real - base) / base) * 100;
  const withinMargin = diffPct >= -marginPct;
  return {
    diffPct,
    hasBase: true,
    withinMargin,
    useCatalog: withinMargin,
    label: `${diffPct > 0 ? "+" : ""}${diffPct.toFixed(1).replace(".", ",")}%`,
  };
}

export function weightCheck(catalogWeight: number, realWeight: number): MarginCheck {
  return build(catalogWeight, realWeight, WEIGHT_MARGIN_PCT);
}

export interface Ppms {
  pt: number;
  pd: number;
  rh: number;
}

/** Compara o somatório de PPM do catálogo com o do laboratório */
export function analysisCheck(catalog: Ppms, lab: Ppms): MarginCheck {
  const base = (catalog.pt || 0) + (catalog.pd || 0) + (catalog.rh || 0);
  const real = (lab.pt || 0) + (lab.pd || 0) + (lab.rh || 0);
  return build(base, real, ANALYSIS_MARGIN_PCT);
}

export function marginColor(check: MarginCheck): string {
  if (!check.hasBase) return "text-muted-foreground";
  if (!check.withinMargin) return "text-destructive";
  return check.diffPct >= 0 ? "text-green-600" : "text-amber-600";
}

/** Decide a origem de preço sugerida a partir das duas validações */
export function suggestPricingSource(w: MarginCheck, a: MarginCheck): "catalogo" | "calculadora" {
  return w.useCatalog && a.useCatalog ? "catalogo" : "calculadora";
}

export function decisionReason(w: MarginCheck, a: MarginCheck): string {
  const reasons: string[] = [];
  if (w.hasBase && !w.withinMargin) reasons.push(`Peso ${w.label} (fora de ${WEIGHT_MARGIN_PCT}%)`);
  if (a.hasBase && !a.withinMargin) reasons.push(`Análise ${a.label} (fora de ${ANALYSIS_MARGIN_PCT}%)`);
  if (reasons.length === 0) return "Dentro das margens → pagar pelo catálogo";
  return `${reasons.join(" · ")} → pagar pela análise`;
}
