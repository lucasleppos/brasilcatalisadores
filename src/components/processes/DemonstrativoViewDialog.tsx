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

interface SettingsRow {
  pt_price: number;
  pd_price: number;
  rh_price: number;
  usd_to_brl: number;
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
  const [settings, setSettings] = useState<SettingsRow | null>(null);
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

        const [itemsRes, labRes, settingsRes] = await Promise.all([
          supabase.from("purchase_items").select("*").eq("purchase_id", purchase.id),
          supabase.from("lab_results").select("purchase_item_id,versao,pt_ppm,pd_ppm,rh_ppm").eq("purchase_id", purchase.id),
          supabase.from("settings").select("pt_price,pd_price,rh_price,usd_to_brl").limit(1).single(),
        ]);

        const rawItems: RawItem[] = (itemsRes.data as any[]) || [];
        const rawLab: LabRow[] = (labRes.data as any[]) || [];

        // fetch catalog parts
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
        setSettings((settingsRes.data as any) || null);
        setCatalogParts(partsMap);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [open, purchase.id, purchase.totalBrl]);

  const isCeramico = purchase.materialFlow === "ceramico";

  // Match edge-function totals: prefer conferencia items
  const conferenceItems = items.filter(i => i.category === "conferencia");
  const itemsForTotal = conferenceItems.length > 0 ? conferenceItems : items;
  const calculatedTotal = itemsForTotal.reduce((acc, i) => acc + (Number(i.total_value) || 0), 0);
  const effectiveTotal = Math.max(calculatedTotal, Number(demo?.valorTotal) || 0);
  const totalPecas = itemsForTotal.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0);
  const totalWeightKg = itemsForTotal.reduce((acc, i) => acc + (Number(i.weight) || 0), 0);

  const catalogFixedItems = items.filter(i => i.pricing_source === "catalogo");
  const calcItems = items.filter(i => i.pricing_source === "calculadora");
  const regularItems = items.filter(i => !i.pricing_source);
  const hasSacolaBlocks = catalogFixedItems.length > 0 || calcItems.length > 0;

  // Lab map per calc item (average across versoes)
  const labAgg: Record<string, { pt: number; pd: number; rh: number; n: number }> = {};
  labRows.forEach(lr => {
    if (!lr.purchase_item_id) return;
    const a = labAgg[lr.purchase_item_id] || { pt: 0, pd: 0, rh: 0, n: 0 };
    a.pt += Number(lr.pt_ppm) || 0;
    a.pd += Number(lr.pd_ppm) || 0;
    a.rh += Number(lr.rh_ppm) || 0;
    a.n += 1;
    labAgg[lr.purchase_item_id] = a;
  });
  const labMap: Record<string, { pt: number; pd: number; rh: number }> = {};
  Object.entries(labAgg).forEach(([k, v]) => {
    if (v.n > 0) labMap[k] = { pt: v.pt / v.n, pd: v.pd / v.n, rh: v.rh / v.n };
  });

  // General lab (cerâmico) = average of purchase-level rows (no purchase_item_id)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Demonstrativo de Valores</DialogTitle>
          <DialogDescription className="text-center">
            {demo ? `Versão ${demo.versao}` : "Prévia dos valores do demonstrativo"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-b py-3">
              <div><span className="font-semibold">Nº Pedido:</span> {purchase.purchaseNumber}</div>
              <div><span className="font-semibold">Data:</span> {new Date(purchase.date).toLocaleDateString("pt-BR")}</div>
              <div><span className="font-semibold">Fornecedor:</span> {purchase.supplierName}</div>
              <div><span className="font-semibold">Fluxo:</span> {isCeramico ? "Cerâmico" : "Peças"}</div>
              <div><span className="font-semibold">Comprador:</span> {purchase.buyer || "—"}</div>
              <div><span className="font-semibold">Boleto Syge:</span> {purchase.erpNumber || "—"}</div>
            </div>

            {/* Sacola: catálogo fixo */}
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

            {/* Sacola: calculadora */}
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

            {/* Demais itens */}
            {regularItems.length > 0 && (
              <div>
                {hasSacolaBlocks && <p className="font-semibold mb-1">Demais Itens</p>}
                <table className="w-full text-xs border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-1 text-left">#</th>
                      <th className="p-1 text-left">Tipo</th>
                      <th className="p-1 text-left">Qtd/Peso</th>
                      <th className="p-1 text-left">Valor Unit.</th>
                      <th className="p-1 text-left">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regularItems.map((it, i) => {
                      const calcResult = it.calc_result;
                      const calcInput = it.calc_input;
                      let qtyWeight = "—";
                      if (it.item_type === "peca") {
                        qtyWeight = `${it.quantity || 0} pç`;
                      } else if (it.item_type === "peca_sacola" && !calcInput) {
                        qtyWeight = `${it.quantity || 0} pç`;
                        if (it.weight) qtyWeight += ` / ${fmtNum(Number(it.weight), 4)} kg`;
                      } else if (calcInput) {
                        const net = (Number(calcInput.grossWeight) || 0) - (Number(calcInput.tare) || 0);
                        qtyWeight = `${fmtNum(net, 4)} kg`;
                      } else if (it.weight) {
                        qtyWeight = `${fmtNum(Number(it.weight), 4)} kg`;
                      }

                      let unitVal = "—";
                      let totalVal: string = "—";
                      if (it.item_type === "peca" || (it.item_type === "peca_sacola" && !calcResult)) {
                        const tv = Number(it.total_value) || 0;
                        const qty = it.quantity || 1;
                        unitVal = tv > 0 ? fmtBrl(tv / qty) : "—";
                        totalVal = tv > 0 ? fmtBrl(tv) : "Pendente";
                      } else if (calcResult) {
                        totalVal = calcResult.finalValueBrl ? fmtBrl(Number(calcResult.finalValueBrl)) : "Pendente";
                      }
                      return (
                        <tr key={it.id} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                          <td className="p-1">{i + 1}</td>
                          <td className="p-1">{typeLabel(it)}</td>
                          <td className="p-1">{qtyWeight}</td>
                          <td className="p-1">{unitVal}</td>
                          <td className="p-1">{totalVal}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Análise laboratorial (cerâmico) */}
            {isCeramico && generalAvg && (
              <div className="border-t pt-3">
                <p className="font-semibold mb-1">Análise Laboratorial</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div><span className="font-semibold">Platina (Pt):</span> {fmtNum(generalAvg.pt, 2)} ppm</div>
                  <div><span className="font-semibold">Paládio (Pd):</span> {fmtNum(generalAvg.pd, 2)} ppm</div>
                  <div><span className="font-semibold">Ródio (Rh):</span> {fmtNum(generalAvg.rh, 2)} ppm</div>
                  <div><span className="font-semibold">Versão análise:</span> v{generalLatestVersao}</div>
                </div>
                {settings && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">Cotações utilizadas:</p>
                    <p>Pt: USD {fmtNum(settings.pt_price, 2)} | Pd: USD {fmtNum(settings.pd_price, 2)} | Rh: USD {fmtNum(settings.rh_price, 2)}</p>
                    <p>Câmbio: {fmtBrl(settings.usd_to_brl)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Conferência de peso */}
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

            {/* Resumo */}
            <div className="border-t pt-3 grid grid-cols-2 gap-4 text-xs">
              <div><span className="font-semibold">Total de peças:</span> {totalPecas}</div>
              <div><span className="font-semibold">Peso total:</span> {fmtNum(totalWeightKg, 4)} kg</div>
            </div>

            {/* Valor total */}
            <div className="border-t pt-3 flex items-center justify-between">
              <span className="text-lg font-bold">VALOR TOTAL:</span>
              <span className="text-lg font-bold">{fmtBrl(effectiveTotal)}</span>
            </div>

            {purchase.notes && (
              <div className="border-t pt-3 text-xs italic text-muted-foreground">
                Obs: {purchase.notes}
              </div>
            )}

            <div className="text-[10px] text-muted-foreground pt-2">
              {demo && <p>Envio em: {new Date(demo.enviadoEm).toLocaleString("pt-BR")}</p>}
              <p>Visualizado em: {new Date().toLocaleString("pt-BR")}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
