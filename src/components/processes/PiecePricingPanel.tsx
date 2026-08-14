import QtyCheckBadge from "@/components/processes/QtyCheckBadge";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, ChevronRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Purchase, getConferenciaItems, getOriginalItems, batchUpdateItemPricing } from "@/lib/purchases";
import { calculate, CalculatorInput, CalculatorResult } from "@/lib/calculator";
import { loadSettings, Settings } from "@/lib/settings";
import { fmtBrl, fmtNum } from "@/lib/utils";

interface PiecePricingPanelProps {
  purchase: Purchase;
  onCompleted: () => void;
}

interface CatalogInfo {
  weight: number;
  ptPpm: number;
  pdPpm: number;
  rhPpm: number;
}

const parseNum = (v: string) => {
  const n = parseFloat((v || "").replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};
const toStr = (n: number) => (n > 0 ? n.toFixed(2).replace(".", ",") : "");
const fmtWeight = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

export default function PiecePricingPanel({ purchase, onCompleted }: PiecePricingPanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [margin, setMargin] = useState(15);
  const [catalog, setCatalog] = useState<Record<string, CatalogInfo>>({});
  const [calcUnit, setCalcUnit] = useState<Record<string, number>>({});
  const [calcData, setCalcData] = useState<Record<string, { input: CalculatorInput; result: CalculatorResult }>>({});
  const [unitValues, setUnitValues] = useState<Record<string, string>>({});

  const items = useMemo(() => {
    const conf = getConferenciaItems(purchase).filter(i => i.itemType === "peca" || i.itemType === "peca_sacola");
    if (conf.length > 0) return conf;
    return getOriginalItems(purchase).filter(i => i.itemType === "peca" || i.itemType === "peca_sacola");
  }, [purchase]);

  const totalQty = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
  const totalWeight = items.reduce((sum, i) => sum + (i.weight || 0), 0);

  const labelOf = (item: typeof items[number], idx: number) =>
    item.catalogPartCode || item.category || `Item ${idx + 1}`;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const partIds = Array.from(new Set(items.map(i => i.catalogPartId).filter(Boolean))) as string[];
      const [settingsData, supplierRes, partsRes] = await Promise.all([
        loadSettings(),
        supabase.from("suppliers").select("margin, margin_pecas").eq("id", purchase.supplierId).maybeSingle(),
        partIds.length
          ? supabase.from("catalog_parts").select("id, weight, pt_ppm, pd_ppm, rh_ppm").in("id", partIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const sup: any = supplierRes && "data" in supplierRes ? supplierRes.data : null;
      const marginPecas = Number(sup?.margin_pecas ?? sup?.margin) || 15;
      setSettings(settingsData);
      setMargin(marginPecas);

      const cat: Record<string, CatalogInfo> = {};
      ((partsRes as any).data || []).forEach((p: any) => {
        cat[p.id] = {
          weight: Number(p.weight) || 0,
          ptPpm: Number(p.pt_ppm) || 0,
          pdPpm: Number(p.pd_ppm) || 0,
          rhPpm: Number(p.rh_ppm) || 0,
        };
      });
      setCatalog(cat);

      const units: Record<string, number> = {};
      const datas: Record<string, { input: CalculatorInput; result: CalculatorResult }> = {};
      items.forEach(item => {
        const qty = item.quantity || 1;
        const info = item.catalogPartId ? cat[item.catalogPartId] : undefined;
        const grossWeight = (item.weight || 0) > 0 ? item.weight || 0 : (info?.weight || 0) * qty;
        if (!info || grossWeight <= 0) {
          units[item.id] = 0;
          return;
        }
        const input: CalculatorInput = {
          grossWeight,
          tare: 0,
          materialType: "comum",
          ptPpm: info.ptPpm,
          pdPpm: info.pdPpm,
          rhPpm: info.rhPpm,
          clientDiscount: marginPecas,
          entryType: "peca_fechada",
          manualPrice: null,
          customPt: null,
          customPd: null,
          customRh: null,
        };
        const result = calculate(input, settingsData);
        units[item.id] = result.finalValueBrl / qty;
        datas[item.id] = { input, result };
      });
      setCalcUnit(units);
      setCalcData(datas);

      // Valor exibido: já salvo no item → senão o calculado pelo catálogo
      const initial: Record<string, string> = {};
      items.forEach(item => {
        const qty = item.quantity || 1;
        const saved = (item.totalValue || 0) / qty;
        initial[item.id] = toStr(saved > 0 ? saved : units[item.id] || 0);
      });
      setUnitValues(initial);
    } finally {
      setLoading(false);
    }
  }, [items, purchase.id, purchase.supplierId]);

  useEffect(() => {
    if (!open) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, purchase.id]);

  const recalcAll = () => {
    const next: Record<string, string> = {};
    items.forEach(i => (next[i.id] = toStr(calcUnit[i.id] || 0)));
    setUnitValues(next);
    toast.success("Valores recalculados pelas cotações atuais");
  };

  const isManual = (itemId: string) => {
    const typed = parseNum(unitValues[itemId] || "");
    const calc = calcUnit[itemId] || 0;
    return typed > 0 && Math.abs(typed - calc) > 0.005;
  };

  const computedTotal = items.reduce((sum, i) => sum + parseNum(unitValues[i.id] || "") * (i.quantity || 1), 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const item of items) {
        const qty = item.quantity || 1;
        const unit = parseNum(unitValues[item.id] || "");
        const cd = calcData[item.id];
        await supabase
          .from("purchase_items")
          .update({
            total_value: unit * qty,
            pricing_source: isManual(item.id) ? "manual" : "catalogo",
            calc_input: (cd?.input as any) ?? null,
            calc_result: (cd?.result as any) ?? null,
          })
          .eq("id", item.id);
      }
      await batchUpdateItemPricing(purchase.id, []);

      toast.success("Precificação salva");
      setOpen(false);
      onCompleted();
    } catch {
      toast.error("Erro ao salvar precificação");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-2 pt-1 border-t border-border/40">
        <Button variant="outline" className="w-full justify-between h-10" onClick={() => setOpen(true)}>
          <span className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Precificar Peças Conferidas
          </span>
          <span className="flex items-center gap-2">
            {items.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {totalQty} peças · {fmtBrl(purchase.totalBrl)}
              </Badge>
            )}
            <ChevronRight className="h-4 w-4" />
          </span>
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-full w-screen h-[100dvh] rounded-none sm:w-auto sm:max-w-5xl sm:h-auto sm:max-h-[90vh] sm:rounded-lg flex flex-col p-0 gap-0">
          <DialogHeader className="px-3 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-3 shrink-0 text-left">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg">Precificação de Peças</DialogTitle>
                <DialogDescription className="text-[11px] sm:text-xs mt-1 break-words">
                  Pedido {purchase.purchaseNumber} · {purchase.supplierName} — cálculo automático pelo catálogo (Pt/Pd/Rh) com margem de peças de {fmtNum(margin, 2)}%
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <QtyCheckBadge purchase={purchase} />
                <Button size="sm" variant="outline" onClick={recalcAll} disabled={loading}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Recalcular
                </Button>
                {items.length > 0 && <Badge className="text-sm px-3 py-1">{totalQty} peças</Badge>}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col border-t border-border">
            <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 border-b border-border bg-muted/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <div className="col-span-4">Peça</div>
              <div className="col-span-2 text-right">Qtd / Peso</div>
              <div className="col-span-2 text-right">Calculado unit.</div>
              <div className="col-span-2 text-right">Valor unit. (R$)</div>
              <div className="col-span-2 text-right">Subtotal</div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              {loading ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-xs">Calculando...</div>
              ) : items.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-xs">Nenhuma peça conferida encontrada</div>
              ) : (
                <div className="divide-y divide-border">
                  {items.map((item, idx) => {
                    const qty = item.quantity || 1;
                    const unit = parseNum(unitValues[item.id] || "");
                    const info = item.catalogPartId ? catalog[item.catalogPartId] : undefined;
                    const valueInput = (
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={unitValues[item.id] ?? ""}
                        onChange={(e) =>
                          setUnitValues(prev => ({ ...prev, [item.id]: e.target.value.replace(/[^0-9.,]/g, "") }))
                        }
                        placeholder="0,00"
                        className="h-9 text-right"
                      />
                    );
                    const identity = (
                      <>
                        <p className="text-sm font-medium truncate">
                          <span className="text-muted-foreground text-xs mr-1">Código:</span>
                          {labelOf(item, idx)}
                        </p>
                        {item.catalogPartRef && (
                          <p className="text-xs text-muted-foreground truncate">Referência: {item.catalogPartRef}</p>
                        )}
                        {info && (
                          <p className="text-[11px] text-muted-foreground">
                            Pt {fmtNum(info.ptPpm, 0)} · Pd {fmtNum(info.pdPpm, 0)} · Rh {fmtNum(info.rhPpm, 0)} ppm · margem {fmtNum(margin, 2)}%
                          </p>
                        )}
                      </>
                    );
                    return (
                      <div key={item.id} className="px-3 py-3 sm:px-4 sm:py-2.5">
                        {/* Mobile: cartão */}
                        <div className="sm:hidden space-y-2">
                          <div className="min-w-0">{identity}</div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">Qtd</p>
                              <p className="text-sm font-medium">{qty} un</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Peso</p>
                              <p className="text-sm font-medium">{fmtWeight(item.weight || 0)} kg</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Calculado unit.</p>
                              <p className="text-sm">{fmtBrl(calcUnit[item.id] || 0)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Subtotal</p>
                              <p className="text-sm font-semibold">{fmtBrl(unit * qty)}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Valor unit. (R$)</p>
                            {valueInput}
                          </div>
                        </div>

                        {/* Desktop: tabela */}
                        <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-4 min-w-0">{identity}</div>
                          <div className="col-span-2 text-right">
                            <p className="text-sm font-medium">{qty} un</p>
                            <p className="text-xs text-muted-foreground">{fmtWeight(item.weight || 0)} kg</p>
                          </div>
                          <div className="col-span-2 text-right text-sm text-muted-foreground">
                            {fmtBrl(calcUnit[item.id] || 0)}
                          </div>
                          <div className="col-span-2">{valueInput}</div>
                          <div className="col-span-2 text-right text-sm font-semibold">{fmtBrl(unit * qty)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="px-3 py-3 sm:px-4 border-t border-border bg-muted/20 space-y-1 shrink-0">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Total de peças: {totalQty} un</span>
                  <span>Peso total: {fmtWeight(totalWeight)} kg</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Valor total</span>
                  <span className="text-lg font-bold">{fmtBrl(computedTotal)}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-3 py-3 sm:px-6 sm:py-4 border-t border-border shrink-0 flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setOpen(false)}>Fechar</Button>
            <Button className="w-full sm:w-auto" disabled={saving || loading || items.length === 0} onClick={handleSave}>Salvar precificação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
