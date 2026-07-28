import { useEffect, useState } from "react";
import { Purchase, getConferenciaItems, getOriginalItems } from "@/lib/purchases";
import { loadEvidences } from "@/lib/stage-tasks";
import { fmtNum } from "@/lib/utils";
import { Scale } from "lucide-react";

interface Props {
  purchase: Purchase;
  /** bump to force reload after a new weight is registered */
  refreshKey?: number;
}

/**
 * Resumo de perda do processo de Peças: conferido → cerâmica extraída (corte) → pós-trituração.
 */
export default function PecasLossSummary({ purchase, refreshKey = 0 }: Props) {
  const [cutWeight, setCutWeight] = useState<number | null>(null);
  const [tritWeight, setTritWeight] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const evs = await loadEvidences(purchase.id);
      if (!active) return;
      const last = (key: string) => {
        const found = evs.filter(e => e.taskKey === key && e.valueNumeric != null);
        return found.length ? Number(found[found.length - 1].valueNumeric) : null;
      };
      setCutWeight(last("weight_ceramica_extraida"));
      setTritWeight(last("weight_pos_trituracao"));
    })();
    return () => { active = false; };
  }, [purchase.id, refreshKey]);

  const conf = getConferenciaItems(purchase);
  let confWeight = conf.reduce((s, i) => s + (i.weight || 0), 0);
  if (confWeight === 0) confWeight = getOriginalItems(purchase).reduce((s, i) => s + (i.weight || 0), 0);

  const rows: { label: string; value: number }[] = [];
  if (confWeight > 0) rows.push({ label: "Peso conferido (peças)", value: confWeight });
  if (cutWeight != null) rows.push({ label: "Cerâmica extraída (corte)", value: cutWeight });
  if (tritWeight != null) rows.push({ label: "Peso após trituração", value: tritWeight });

  const cutLoss = confWeight > 0 && cutWeight != null ? confWeight - cutWeight : null;
  const tritLoss = cutWeight != null && tritWeight != null ? cutWeight - tritWeight : null;
  const base = confWeight > 0 ? confWeight : cutWeight;
  const finalW = tritWeight ?? cutWeight;
  const totalLoss = base != null && finalW != null ? base - finalW : null;
  const totalPct = totalLoss != null && base ? (totalLoss / base) * 100 : null;

  if (rows.length === 0) return null;

  return (
    <div className="rounded-md border border-border/60 bg-muted/30 p-2 space-y-1">
      <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
        <Scale className="h-3 w-3" /> Perda do processo
      </p>
      {rows.map(r => (
        <div key={r.label} className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">{r.label}</span>
          <span className="font-medium tabular-nums">{fmtNum(r.value, 4)} kg</span>
        </div>
      ))}
      {cutLoss != null && (
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Perda no corte</span>
          <span className="tabular-nums">{fmtNum(cutLoss, 4)} kg</span>
        </div>
      )}
      {tritLoss != null && (
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Perda na trituração</span>
          <span className="tabular-nums">{fmtNum(tritLoss, 4)} kg</span>
        </div>
      )}
      {totalLoss != null && (
        <div className="flex justify-between text-[10px] pt-1 border-t border-border/50">
          <span className="font-medium">Perda total</span>
          <span className="font-semibold tabular-nums">
            {fmtNum(totalLoss, 4)} kg{totalPct != null ? ` (${fmtNum(totalPct, 2)}%)` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
