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
 * Pesagens do processo de Peças: conferido → após corte → após trituração.
 * Sem cálculo de perdas (isso fica para o relatório).
 */
export default function PecasLossSummary({ purchase, refreshKey = 0 }: Props) {
  const [weights, setWeights] = useState<Record<string, number | null>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      const evs = await loadEvidences(purchase.id);
      if (!active) return;
      const last = (key: string) => {
        const found = evs.filter(e => e.taskKey === key && e.valueNumeric != null);
        return found.length ? Number(found[found.length - 1].valueNumeric) : null;
      };
      setWeights({
        cutLegacy: last("weight_ceramica_extraida"),
        cutFlex: last("weight_flex_extraido"),
        cutCarbono: last("weight_carbono_extraido"),
        tritLegacy: last("weight_pos_trituracao"),
        tritFlex: last("weight_flex_trituracao"),
        tritCarbono: last("weight_carbono_trituracao"),
      });
    })();
    return () => { active = false; };
  }, [purchase.id, refreshKey]);

  const conf = getConferenciaItems(purchase);
  let confWeight = conf.reduce((s, i) => s + (i.weight || 0), 0);
  if (confWeight === 0) confWeight = getOriginalItems(purchase).reduce((s, i) => s + (i.weight || 0), 0);

  const rows: { label: string; value: number | null }[] = [
    { label: "Peso conferido (peças)", value: confWeight > 0 ? confWeight : null },
  ];

  if (weights.cutFlex != null || weights.cutCarbono != null || weights.cutLegacy == null) {
    rows.push({ label: "Peso Real Flex extraído", value: weights.cutFlex ?? null });
    rows.push({ label: "Peso Real Carbono extraído", value: weights.cutCarbono ?? null });
  } else {
    rows.push({ label: "Peso após corte (cerâmica extraída)", value: weights.cutLegacy });
  }

  if (weights.tritFlex != null || weights.tritCarbono != null || weights.tritLegacy == null) {
    rows.push({ label: "Peso Flex após trituração", value: weights.tritFlex ?? null });
    rows.push({ label: "Peso Carbono após trituração", value: weights.tritCarbono ?? null });
  } else {
    rows.push({ label: "Peso após trituração", value: weights.tritLegacy });
  }


  if (rows.every(r => r.value == null)) return null;

  return (
    <div className="rounded-md border border-border/60 bg-muted/30 p-2 space-y-1">
      <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
        <Scale className="h-3 w-3" /> Pesagens do processo
      </p>
      {rows.map(r => (
        <div key={r.label} className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">{r.label}</span>
          {r.value != null ? (
            <span className="font-medium tabular-nums">{fmtNum(r.value, 4)} kg</span>
          ) : (
            <span className="text-muted-foreground/60">— pendente —</span>
          )}
        </div>
      ))}
    </div>
  );
}
