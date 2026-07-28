import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Purchase, PurchaseQuoteItem, getConferenciaItems, getOriginalItems } from "@/lib/purchases";
import { fmtBrl, fmtNum } from "@/lib/utils";
import { Loader2, PackageOpen } from "lucide-react";

interface Props {
  purchase: Purchase;
}

interface AllocationInfo {
  bagNumber: string;
  bagLabel: string;
  weight: number;
  paidValue: number;
  allocatedAt: string;
}

export default function CompletedDetailRow({ purchase }: Props) {
  const [loading, setLoading] = useState(true);
  const [allocations, setAllocations] = useState<Record<string, AllocationInfo>>({});
  const [groupNames, setGroupNames] = useState<Record<string, string>>({});

  const isCeramico = purchase.materialFlow === "ceramico";
  const confItems = getConferenciaItems(purchase);
  const items: PurchaseQuoteItem[] = confItems.length > 0 ? confItems : getOriginalItems(purchase);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: bagItems }, { data: evid }] = await Promise.all([
        supabase
          .from("bag_items")
          .select("purchase_item_id, weight, paid_value, allocated_at, bags(bag_number, bag_label)")
          .eq("purchase_id", purchase.id),
        supabase
          .from("stage_evidence")
          .select("task_key, value_text")
          .eq("purchase_id", purchase.id)
          .like("task_key", "lote_cat_%"),
      ]);
      if (cancelled) return;

      const allocMap: Record<string, AllocationInfo> = {};
      (bagItems || []).forEach((bi: any) => {
        allocMap[bi.purchase_item_id] = {
          bagNumber: bi.bags?.bag_number || "—",
          bagLabel: bi.bags?.bag_label || "",
          weight: Number(bi.weight) || 0,
          paidValue: Number(bi.paid_value) || 0,
          allocatedAt: bi.allocated_at,
        };
      });

      const names: Record<string, string> = {};
      (evid || []).forEach((e: any) => {
        names[e.task_key.replace("lote_cat_", "")] = e.value_text || "";
      });

      setAllocations(allocMap);
      setGroupNames(names);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [purchase.id]);

  function itemLabel(item: PurchaseQuoteItem, index: number) {
    if (isCeramico) {
      return groupNames[item.id] || `Grupo ${String(index + 1).padStart(2, "0")}`;
    }
    const num = item.seq ?? index + 1;
    const code = item.catalogPartCode;
    const ref = item.catalogPartRef;
    if (code || ref) {
      return `#${num} · ` + [code ? `Cód. ${code}` : null, ref ? `Ref. ${ref}` : null].filter(Boolean).join(" · ");
    }
    return `Item ${item.seq ?? index + 1}`;
  }

  function itemValue(item: PurchaseQuoteItem) {
    const alloc = allocations[item.id];
    if (alloc && alloc.paidValue > 0) return alloc.paidValue;
    if (item.totalValue) return item.totalValue;
    return item.result?.finalValueBrl || 0;
  }

  const totalQty = items.reduce((s, i) => s + (i.quantity || 1), 0);
  const totalWeight = items.reduce((s, i) => {
    const alloc = allocations[i.id];
    return s + (alloc ? alloc.weight : i.weight || 0);
  }, 0);
  const totalValue = items.reduce((s, i) => s + itemValue(i), 0);
  const bagNumbers = [...new Set(Object.values(allocations).map(a => a.bagNumber))];

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando detalhamento...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <PackageOpen className="h-3.5 w-3.5" /> Nenhum material detalhado para esta compra.
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Detalhamento dos materiais
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="p-1.5 text-left font-medium">{isCeramico ? "Grupo" : "Material"}</th>
              {!isCeramico && <th className="p-1.5 text-right font-medium">Qtd</th>}
              {isCeramico && <th className="p-1.5 text-right font-medium">Peso bruto</th>}
              {isCeramico && <th className="p-1.5 text-right font-medium">Tara</th>}
              <th className="p-1.5 text-right font-medium">{isCeramico ? "Peso líquido" : "Peso alocado"}</th>
              <th className="p-1.5 text-right font-medium">Valor</th>
              <th className="p-1.5 text-left font-medium">Bag</th>
              <th className="p-1.5 text-left font-medium">Alocado em</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const alloc = allocations[item.id];
              const bruto = item.weight || 0;
              const tara = item.weightLoss || 0;
              const liquido = alloc ? alloc.weight : Math.max(0, bruto - tara);
              return (
                <tr key={item.id} className="border-b border-border/50 last:border-0">
                  <td className="p-1.5 font-medium">{itemLabel(item, idx)}</td>
                  {!isCeramico && <td className="p-1.5 text-right">{item.quantity || 1} un</td>}
                  {isCeramico && <td className="p-1.5 text-right">{fmtNum(bruto, 3)} kg</td>}
                  {isCeramico && <td className="p-1.5 text-right">{fmtNum(tara, 3)} kg</td>}
                  <td className="p-1.5 text-right">{fmtNum(liquido, 3)} kg</td>
                  <td className="p-1.5 text-right font-semibold">{fmtBrl(itemValue(item))}</td>
                  <td className="p-1.5">
                    {alloc ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-300 bg-emerald-500/10 text-[10px] text-emerald-700"
                        title={alloc.bagLabel}
                      >
                        {alloc.bagNumber}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-300 bg-amber-500/10 text-[10px] text-amber-700">
                        Aguardando alocação
                      </Badge>
                    )}
                  </td>
                  <td className="p-1.5 text-muted-foreground">
                    {alloc ? new Date(alloc.allocatedAt).toLocaleDateString("pt-BR") : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t font-semibold">
              <td className="p-1.5">Total</td>
              {!isCeramico && <td className="p-1.5 text-right">{totalQty} un</td>}
              {isCeramico && <td className="p-1.5" />}
              {isCeramico && <td className="p-1.5" />}
              <td className="p-1.5 text-right">{fmtNum(totalWeight, 3)} kg</td>
              <td className="p-1.5 text-right">{fmtBrl(totalValue)}</td>
              <td className="p-1.5 text-[10px] font-normal text-muted-foreground" colSpan={2}>
                {bagNumbers.length > 0 ? `Bags: ${bagNumbers.join(", ")}` : "Sem bag alocado"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
