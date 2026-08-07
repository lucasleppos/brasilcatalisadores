import { Purchase, getQtyCheck } from "@/lib/purchases";
import { fmtNum } from "@/lib/utils";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

/**
 * Confronto declarado × conferido, exibido no cabeçalho dos cards de cada etapa
 * para confirmar as quantidades ao longo de todo o fluxo.
 */
export default function QtyCheckBadge({ purchase }: { purchase: Purchase }) {
  const check = getQtyCheck(purchase);
  if (!check.applicable) return null;

  const dec = check.unit === "kg" ? 3 : 0;
  const label = `${fmtNum(check.conferred, dec)} / ${fmtNum(check.target, dec)} ${check.unit} conferidos`;

  return (
    <div
      className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] ${
        check.matches
          ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20"
          : "border-destructive/40 bg-destructive/5 text-destructive"
      }`}
    >
      {check.matches ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      <span className="font-medium">{label}</span>
      {check.excluded > 0 && (
        <span className="text-muted-foreground">
          · {fmtNum(check.excluded, dec)} {check.unit} fora do fluxo
        </span>
      )}
      {!check.matches && <span>· divergência com o declarado</span>}
    </div>
  );
}
