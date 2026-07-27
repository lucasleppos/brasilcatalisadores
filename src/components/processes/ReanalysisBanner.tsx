import { useEffect, useState } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ContestInfo, Purchase } from "@/lib/purchases";
import { fmtNum } from "@/lib/utils";

interface GroupSummary {
  id: string;
  category: string;
  gross: number;
  tare: number;
  net: number;
  pt: number | null;
  pd: number | null;
  rh: number | null;
}

interface Props {
  purchase: Purchase;
  contest: ContestInfo;
}

export default function ReanalysisBanner({ purchase, contest }: Props) {
  const [groups, setGroups] = useState<GroupSummary[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: items } = await supabase
        .from("purchase_items")
        .select("id, weight, weight_loss")
        .eq("purchase_id", purchase.id)
        .eq("item_type", "ceramico")
        .eq("category", "conferencia");

      if (!items || items.length === 0) {
        if (active) setGroups([]);
        return;
      }

      const [{ data: evidence }, { data: labResults }] = await Promise.all([
        supabase
          .from("stage_evidence")
          .select("task_key, value_text")
          .eq("purchase_id", purchase.id)
          .eq("stage", "conferencia_ceramico"),
        supabase
          .from("lab_results")
          .select("purchase_item_id, pt_ppm, pd_ppm, rh_ppm")
          .eq("purchase_id", purchase.id)
          .not("purchase_item_id", "is", null),
      ]);

      const catMap: Record<string, string> = {};
      (evidence || []).forEach(e => {
        if (e.task_key.startsWith("lote_cat_")) {
          catMap[e.task_key.replace("lote_cat_", "")] = e.value_text || "";
        }
      });

      const byItem: Record<string, { pt: number; pd: number; rh: number }[]> = {};
      (labResults || []).forEach(lr => {
        if (!lr.purchase_item_id) return;
        (byItem[lr.purchase_item_id] ||= []).push({
          pt: Number(lr.pt_ppm) || 0,
          pd: Number(lr.pd_ppm) || 0,
          rh: Number(lr.rh_ppm) || 0,
        });
      });

      const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

      if (!active) return;
      setGroups(
        items.map(it => {
          const gross = Number(it.weight) || 0;
          const tare = Number(it.weight_loss) || 0;
          const rows = byItem[it.id] || [];
          return {
            id: it.id,
            category: catMap[it.id] || "Grupo",
            gross,
            tare,
            net: Math.max(0, gross - tare),
            pt: avg(rows.map(r => r.pt)),
            pd: avg(rows.map(r => r.pd)),
            rh: avg(rows.map(r => r.rh)),
          };
        })
      );
    };
    load();
    return () => {
      active = false;
    };
  }, [purchase.id]);

  return (
    <div className="rounded-md border border-reanalysis-border bg-reanalysis/60 p-2.5 space-y-2">
      <div className="flex items-center gap-1.5">
        <RotateCcw className="h-3.5 w-3.5 text-reanalysis-foreground shrink-0" />
        <p className="text-[11px] font-bold tracking-wide text-reanalysis-foreground">
          EM REAMOSTRAGEM E REANÁLISE
        </p>
      </div>

      <div className="flex items-start gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-reanalysis-foreground shrink-0 mt-0.5" />
        <div className="text-[11px] text-reanalysis-foreground space-y-0.5">
          <p>
            <span className="font-semibold">Motivo da contestação:</span> {contest.motivo || "—"}
          </p>
          <p className="opacity-80">
            {new Date(contest.date).toLocaleString("pt-BR")} · Devolvido para: {contest.destino}
          </p>
        </div>
      </div>

      {groups.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-reanalysis-foreground/80 uppercase">
            Dados já registrados
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] text-reanalysis-foreground">
              <thead>
                <tr className="text-left opacity-70">
                  <th className="pr-2 font-medium">Grupo</th>
                  <th className="pr-2 font-medium text-right">Bruto</th>
                  <th className="pr-2 font-medium text-right">Tara</th>
                  <th className="pr-2 font-medium text-right">Líquido</th>
                  <th className="pr-2 font-medium text-right">Pt</th>
                  <th className="pr-2 font-medium text-right">Pd</th>
                  <th className="font-medium text-right">Rh</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(g => (
                  <tr key={g.id} className="border-t border-reanalysis-border/60">
                    <td className="pr-2 py-0.5 truncate max-w-[90px]">{g.category}</td>
                    <td className="pr-2 py-0.5 text-right">{fmtNum(g.gross, 3)}</td>
                    <td className="pr-2 py-0.5 text-right">{fmtNum(g.tare, 3)}</td>
                    <td className="pr-2 py-0.5 text-right font-semibold">{fmtNum(g.net, 3)}</td>
                    <td className="pr-2 py-0.5 text-right">{g.pt != null ? fmtNum(g.pt, 0) : "—"}</td>
                    <td className="pr-2 py-0.5 text-right">{g.pd != null ? fmtNum(g.pd, 0) : "—"}</td>
                    <td className="py-0.5 text-right">{g.rh != null ? fmtNum(g.rh, 0) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-reanalysis-foreground/80">
            Você pode alterar pesos, grupos, fotos e análises nas etapas antes de seguir para a aprovação.
          </p>
        </div>
      )}
    </div>
  );
}
