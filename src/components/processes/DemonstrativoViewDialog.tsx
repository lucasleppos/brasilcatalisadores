import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Purchase } from "@/lib/purchases";
import { loadDemonstrativos, createDemonstrativo, Demonstrativo } from "@/lib/demonstrativos";
import { fmtNum, fmtBrl } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: Purchase;
}

interface RawItem {
  id: string;
  item_type: string;
  quantity: number | null;
  weight: number | null;
  weight_loss: number | null;
  total_value: number | null;
  category: string | null;
  pricing_source: string | null;
  catalog_part_id: string | null;
  calc_input: any;
  calc_result: any;
}

interface LabRow {
  purchase_item_id: string | null;
  versao: number;
  pt_ppm: number;
  pd_ppm: number;
  rh_ppm: number;
}

const typeLabels: Record<string, string> = {
  peca: "Peça",
  peca_sacola: "Peça em Sacola",
  ceramico: "Cerâmico",
};

export default function DemonstrativoViewDialog({ open, onOpenChange, purchase }: Props) {
  const [loading, setLoading] = useState(false);
  const [demo, setDemo] = useState<Demonstrativo | null>(null);
  const [items, setItems] = useState<RawItem[]>([]);
  const [labRows, setLabRows] = useState<LabRow[]>([]);
  const [catalogParts, setCatalogParts] = useState<Record<string, { code: string; reference: string }>>({});

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        let demos = await loadDemonstrativos(purchase.id);
        if (demos.length === 0) {
          await createDemonstrativo(purchase.id, purchase.totalBrl);
          demos = await loadDemonstrativos(purchase.id);
        }
        const latest = demos[demos.length - 1] || null;

        const [itemsRes, labRes] = await Promise.all([
          supabase.from("purchase_items").select("*").eq("purchase_id", purchase.id),
          supabase.from("lab_results").select("purchase_item_id,versao,pt_ppm,pd_ppm,rh_ppm").eq("purchase_id", purchase.id),
        ]);

        const rawItems: RawItem[] = (itemsRes.data as any[]) || [];
        const rawLab: LabRow[] = (labRes.data as any[]) || [];

        const partIds = [...new Set(rawItems.filter(i => i.catalog_part_id).map(i => i.catalog_part_id as string))];
        const partsMap: Record<string, { code: string; reference: string }> = {};
        if (partIds.length > 0) {
          const { data: cps } = await supabase.from("catalog_parts").select("id,code,reference").in("id", partIds);
          (cps || []).forEach((cp: any) => { partsMap[cp.id] = { code: cp.code, reference: cp.reference }; });
        }

        if (cancelled) return;
        setDemo(latest);
        setItems(rawItems);
        setLabRows(rawLab);
        setCatalogParts(partsMap);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [open, purchase.id, purchase.totalBrl]);

  const isCeramico = purchase.materialFlow === "ceramico";

  const conferenceItems = items.filter(i => i.category === "conferencia");
  const itemsForTotal = conferenceItems.length > 0 ? conferenceItems : items;
  const calculatedTotal = itemsForTotal.reduce((acc, i) => acc + (Number(i.total_value) || 0), 0);
  const effectiveTotal = Math.max(calculatedTotal, Number(demo?.valorTotal) || 0);
  const totalPecas = itemsForTotal.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0);
  const totalGrupos = itemsForTotal.length;
  const totalBrutoKg = itemsForTotal.reduce((acc, i) => acc + weights(i).bruto, 0);
  const totalLiquidoKg = itemsForTotal.reduce((acc, i) => acc + weights(i).liquido, 0);

  const catalogFixedItems = items.filter(i => i.pricing_source === "catalogo");
  const calcItems = items.filter(i => i.pricing_source === "calculadora");
  const regularItems = items.filter(i => !i.pricing_source);
  const hasSacolaBlocks = catalogFixedItems.length > 0 || calcItems.length > 0;

  // Lab map per item (average across versoes) + latest versao per item
  const labAgg: Record<string, { pt: number; pd: number; rh: number; n: number; maxV: number }> = {};
  labRows.forEach(lr => {
    if (!lr.purchase_item_id) return;
    const a = labAgg[lr.purchase_item_id] || { pt: 0, pd: 0, rh: 0, n: 0, maxV: 0 };
    a.pt += Number(lr.pt_ppm) || 0;
    a.pd += Number(lr.pd_ppm) || 0;
    a.rh += Number(lr.rh_ppm) || 0;
    a.n += 1;
    a.maxV = Math.max(a.maxV, Number(lr.versao) || 0);
    labAgg[lr.purchase_item_id] = a;
  });
  const labMap: Record<string, { pt: number; pd: number; rh: number; versao: number }> = {};
  Object.entries(labAgg).forEach(([k, v]) => {
    if (v.n > 0) labMap[k] = { pt: v.pt / v.n, pd: v.pd / v.n, rh: v.rh / v.n, versao: v.maxV };
  });

  const generalLab = labRows.filter(l => !l.purchase_item_id);
  const generalLatestVersao = generalLab.reduce((m, l) => Math.max(m, l.versao || 0), 0);
  const generalAvg = generalLab.length > 0 ? {
    pt: generalLab.reduce((s, l) => s + Number(l.pt_ppm), 0) / generalLab.length,
    pd: generalLab.reduce((s, l) => s + Number(l.pd_ppm), 0) / generalLab.length,
    rh: generalLab.reduce((s, l) => s + Number(l.rh_ppm), 0) / generalLab.length,
  } : null;

  function partLabel(catalogPartId: string | null) {
    if (!catalogPartId) return "Manual";
    const cp = catalogParts[catalogPartId];
    return cp ? (cp.code || cp.reference) : "Manual";
  }

  function typeLabel(item: RawItem) {
    const cp = item.catalog_part_id ? catalogParts[item.catalog_part_id] : null;
    return cp ? (cp.code || cp.reference || typeLabels[item.item_type] || item.item_type) : (typeLabels[item.item_type] || item.item_type);
  }

  function weights(item: RawItem) {
    const calcInput = item.calc_input || {};
    const bruto = Number(calcInput.grossWeight) || Number(item.weight) || 0;
    const tara = Number(calcInput.tare) || Number(item.weight_loss) || 0;
    const liquido = Math.max(0, bruto - tara);
    return { bruto, tara, liquido };
  }

  // Cerâmico: aggregated final average per group (average across versions per purchase_item_id).
  // Match to current items when possible; fall back to generic "Grupo N" labels for orphan groups.
  const currentItemIds = new Set(itemsForTotal.map(i => i.id));
  const matchedGroupRows = isCeramico
    ? itemsForTotal
        .filter(i => labAgg[i.id])
        .map(i => {
          const a = labAgg[i.id];
          return { key: i.id, label: typeLabel(i), pt: a.pt / a.n, pd: a.pd / a.n, rh: a.rh / a.n };
        })
    : [];
  const orphanGroupIds = Object.keys(labAgg).filter(id => !currentItemIds.has(id)).sort();
  const orphanGroupRows = isCeramico
    ? orphanGroupIds.map((id, idx) => {
        const a = labAgg[id];
        return {
          key: id,
          label: `Grupo ${matchedGroupRows.length + idx + 1}`,
          pt: a.pt / a.n,
          pd: a.pd / a.n,
          rh: a.rh / a.n,
        };
      })
    : [];
  const groupAvgRows = [...matchedGroupRows, ...orphanGroupRows];
  const hasAnyLab = isCeramico && (groupAvgRows.length > 0 || !!generalAvg);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Demonstrativo de Valores</DialogTitle>
          <DialogDescription className="text-center">
            Prévia dos valores do demonstrativo
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-b py-3">
              <div><span className="font-semibold">Nº Pedido:</span> {purchase.purchaseNumber}</div>
              <div><span className="font-semibold">Data:</span> {new Date(purchase.date).toLocaleDateString("pt-BR")}</div>
              <div><span className="font-semibold">Fornecedor:</span> {purchase.supplierName}</div>
              <div><span className="font-semibold">Fluxo:</span> {isCeramico ? "Cerâmico" : "Peças"}</div>
              <div><span className="font-semibold">Comprador:</span> {purchase.buyer || "—"}</div>
              <div><span className="font-semibold">Boleto Syge:</span> {purchase.erpNumber || "—"}</div>
            </div>

            {catalogFixedItems.length > 0 && (
              <div>
                <p className="font-semibold mb-1">Peças — Preço Fixo (Catálogo)</p>
                <table className="w-full text-xs border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-1 text-left">#</th>
                      <th className="p-1 text-left">Peça</th>
                      <th className="p-1 text-left">Peso</th>
                      <th className="p-1 text-left">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalogFixedItems.map((it, i) => (
                      <tr key={it.id} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                        <td className="p-1">{i + 1}</td>
                        <td className="p-1">{partLabel(it.catalog_part_id)}</td>
                        <td className="p-1">{it.weight ? `${fmtNum(Number(it.weight), 4)} kg` : "—"}</td>
                        <td className="p-1">{Number(it.total_value) > 0 ? fmtBrl(Number(it.total_value)) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {calcItems.length > 0 && (
              <div>
                <p className="font-semibold mb-1">Peças — Preço Calculado (PPM Lab)</p>
                <table className="w-full text-xs border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-1 text-left">#</th>
                      <th className="p-1 text-left">Peça</th>
                      <th className="p-1 text-left">Peso</th>
                      <th className="p-1 text-left">Pt</th>
                      <th className="p-1 text-left">Pd</th>
                      <th className="p-1 text-left">Rh</th>
                      <th className="p-1 text-left">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calcItems.map((it, i) => {
                      const lab = labMap[it.id] || { pt: 0, pd: 0, rh: 0 };
                      return (
                        <tr key={it.id} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                          <td className="p-1">{i + 1}</td>
                          <td className="p-1">{partLabel(it.catalog_part_id)}</td>
                          <td className="p-1">{it.weight ? `${fmtNum(Number(it.weight), 4)} kg` : "—"}</td>
                          <td className="p-1">{fmtNum(lab.pt, 0)}</td>
                          <td className="p-1">{fmtNum(lab.pd, 0)}</td>
                          <td className="p-1">{fmtNum(lab.rh, 0)}</td>
                          <td className="p-1">{Number(it.total_value) > 0 ? fmtBrl(Number(it.total_value)) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {regularItems.length > 0 && (
              <div>
                {hasSacolaBlocks && <p className="font-semibold mb-1">Demais Itens</p>}
                <table className="w-full text-xs border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-1 text-left">#</th>
                      <th className="p-1 text-left">Tipo</th>
                      <th className="p-1 text-left">{isCeramico ? "Pesos" : "Qtd/Peso"}</th>
                      <th className="p-1 text-left">Valor Unit.</th>
                      <th className="p-1 text-left">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regularItems.map((it, i) => {
                      const calcResult = it.calc_result;
                      const calcInput = it.calc_input;
                      const w = weights(it);

                      let qtyWeight: React.ReactNode = "—";
                      if (isCeramico) {
                        qtyWeight = (
                          <div className="leading-tight">
                            <div>Bruto: {fmtNum(w.bruto, 4)} kg</div>
                            <div>Tara: {fmtNum(w.tara, 4)} kg</div>
                            <div>Líquido: {fmtNum(w.liquido, 4)} kg</div>
                          </div>
                        );
                      } else if (it.item_type === "peca") {
                        qtyWeight = `${it.quantity || 0} pç`;
                      } else if (it.item_type === "peca_sacola" && !calcInput) {
                        qtyWeight = `${it.quantity || 0} pç${it.weight ? ` / ${fmtNum(Number(it.weight), 4)} kg` : ""}`;
                      } else if (calcInput) {
                        qtyWeight = `${fmtNum(w.liquido, 4)} kg`;
                      } else if (it.weight) {
                        qtyWeight = `${fmtNum(Number(it.weight), 4)} kg`;
                      }

                      let unitVal = "—";
                      let totalVal: string = "—";
                      const tv = Number(it.total_value) || 0;
                      if (isCeramico) {
                        totalVal = tv > 0 ? fmtBrl(tv) : (calcResult?.finalValueBrl ? fmtBrl(Number(calcResult.finalValueBrl)) : "Pendente");
                        const totalNum = tv > 0 ? tv : Number(calcResult?.finalValueBrl) || 0;
                        if (totalNum > 0 && w.liquido > 0) {
                          unitVal = `${fmtBrl(totalNum / w.liquido)}/kg`;
                        }
                      } else if (it.item_type === "peca" || (it.item_type === "peca_sacola" && !calcResult)) {
                        const qty = it.quantity || 1;
                        unitVal = tv > 0 ? fmtBrl(tv / qty) : "—";
                        totalVal = tv > 0 ? fmtBrl(tv) : "Pendente";
                      } else if (calcResult) {
                        totalVal = calcResult.finalValueBrl ? fmtBrl(Number(calcResult.finalValueBrl)) : "Pendente";
                      }
                      return (
                        <tr key={it.id} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                          <td className="p-1 align-top">{i + 1}</td>
                          <td className="p-1 align-top">{typeLabel(it)}</td>
                          <td className="p-1 align-top">{qtyWeight}</td>
                          <td className="p-1 align-top">{unitVal}</td>
                          <td className="p-1 align-top">{totalVal}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {hasAnyLab && (
              <div className="border-t pt-3">
                <p className="font-semibold mb-1">Análise Laboratorial</p>
                {groupAvgRows.length > 0 ? (
                  <table className="w-full text-xs border">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-1 text-left">Grupo</th>
                        <th className="p-1 text-left">Pt (ppm)</th>
                        <th className="p-1 text-left">Pd (ppm)</th>
                        <th className="p-1 text-left">Rh (ppm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupAvgRows.map((r, i) => (
                        <tr key={r.key} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                          <td className="p-1">{r.label}</td>
                          <td className="p-1">{fmtNum(r.pt, 0)}</td>
                          <td className="p-1">{fmtNum(r.pd, 0)}</td>
                          <td className="p-1">{fmtNum(r.rh, 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : generalAvg && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div><span className="font-semibold">Pt:</span> {fmtNum(generalAvg.pt, 0)} ppm</div>
                    <div><span className="font-semibold">Pd:</span> {fmtNum(generalAvg.pd, 0)} ppm</div>
                    <div><span className="font-semibold">Rh:</span> {fmtNum(generalAvg.rh, 0)} ppm</div>
                    <div><span className="font-semibold">Versão:</span> v{generalLatestVersao}</div>
                  </div>
                )}
              </div>
            )}

            {(purchase.weightDeclared != null || purchase.weightReal != null) && (
              <div className="border-t pt-3">
                <p className="font-semibold mb-1">Conferência de Peso</p>
                <div className="text-xs space-y-0.5">
                  {purchase.weightDeclared != null && <p>Peso Declarado: {fmtNum(Number(purchase.weightDeclared), 4)} kg</p>}
                  {purchase.weightReal != null && <p>Peso Real: {fmtNum(Number(purchase.weightReal), 4)} kg</p>}
                  {purchase.weightLoss != null && Math.abs(Number(purchase.weightLoss)) > 0 && (
                    <p>Diferença: {fmtNum(Math.abs(Number(purchase.weightLoss)), 4)} kg {Number(purchase.weightLoss) > 0 ? "(perda)" : "(ganho)"}</p>
                  )}
                </div>
              </div>
            )}

            <div className="border-t pt-3 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-semibold">{isCeramico ? "Total de grupos:" : "Total de peças:"}</span>{" "}
                {isCeramico ? totalGrupos : totalPecas}
              </div>
              <div className="space-y-0.5">
                <div><span className="font-semibold">Peso bruto total:</span> {fmtNum(totalBrutoKg, 4)} kg</div>
                <div><span className="font-semibold">Peso líquido total:</span> {fmtNum(totalLiquidoKg, 4)} kg</div>
              </div>
            </div>

            <div className="border-t pt-3 flex items-center justify-between">
              <span className="text-lg font-bold">VALOR TOTAL:</span>
              <span className="text-lg font-bold">{fmtBrl(effectiveTotal)}</span>
            </div>

            {purchase.notes && (
              <div className="border-t pt-3 text-xs italic text-muted-foreground">
                Obs: {purchase.notes}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
