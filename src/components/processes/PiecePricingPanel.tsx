import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, ChevronRight, RefreshCw, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/lib/permissions";
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

interface OverrideRow {
  id: string;
  purchase_item_id: string;
  item_label: string;
  calculated_unit_value: number;
  new_unit_value: number;
  quantity: number;
  justification: string;
  status: string;
  created_at: string;
}

const parseNum = (v: string) => {
  const n = parseFloat((v || "").replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};
const toStr = (n: number) => (n > 0 ? n.toFixed(2).replace(".", ",") : "");
const fmtWeight = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

export default function PiecePricingPanel({ purchase, onCompleted }: PiecePricingPanelProps) {
  const { user } = useAuth();
  const { canDo } = usePermissions();
  const canApprove = canDo("compras", "aprovar_preco") || canDo("permissoes", "access");

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [margin, setMargin] = useState(15);
  const [catalog, setCatalog] = useState<Record<string, CatalogInfo>>({});
  const [calcUnit, setCalcUnit] = useState<Record<string, number>>({});
  const [calcData, setCalcData] = useState<Record<string, { input: CalculatorInput; result: CalculatorResult }>>({});
  const [unitValues, setUnitValues] = useState<Record<string, string>>({});
  const [justifications, setJustifications] = useState<Record<string, string>>({});
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);

  const items = useMemo(() => {
    const conf = getConferenciaItems(purchase).filter(i => i.itemType === "peca" || i.itemType === "peca_sacola");
    if (conf.length > 0) return conf;
    return getOriginalItems(purchase).filter(i => i.itemType === "peca" || i.itemType === "peca_sacola");
  }, [purchase]);

  const totalQty = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
  const totalWeight = items.reduce((sum, i) => sum + (i.weight || 0), 0);

  const labelOf = (item: typeof items[number], idx: number) =>
    item.catalogPartCode || item.category || `Item ${idx + 1}`;

  const loadOverrides = useCallback(async () => {
    const { data } = await supabase
      .from("price_override_log")
      .select("*")
      .eq("purchase_id", purchase.id)
      .order("created_at", { ascending: false });
    setOverrides((data || []) as OverrideRow[]);
  }, [purchase.id]);

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

      const { data: ovs } = await supabase
        .from("price_override_log")
        .select("*")
        .eq("purchase_id", purchase.id)
        .order("created_at", { ascending: false });
      const list = (ovs || []) as OverrideRow[];
      setOverrides(list);

      // Valor exibido: salvo (se houver) → override aprovado → calculado
      const initial: Record<string, string> = {};
      items.forEach(item => {
        const qty = item.quantity || 1;
        const approved = list.find(o => o.purchase_item_id === item.id && o.status === "aprovado");
        const saved = (item.totalValue || 0) / qty;
        initial[item.id] = toStr(approved ? Number(approved.new_unit_value) : saved > 0 ? saved : units[item.id] || 0);
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
    setJustifications({});
    toast.success("Valores recalculados pelas cotações atuais");
  };

  const isDiverged = (itemId: string) => {
    const typed = parseNum(unitValues[itemId] || "");
    const calc = calcUnit[itemId] || 0;
    return typed > 0 && Math.abs(typed - calc) > 0.005;
  };

  const pendingFor = (itemId: string) => overrides.find(o => o.purchase_item_id === itemId && o.status === "pendente");
  const approvedFor = (itemId: string) => overrides.find(o => o.purchase_item_id === itemId && o.status === "aprovado");

  /** Valor efetivamente gravado: só usa o manual se já aprovado */
  const effectiveUnit = (itemId: string) => {
    const approved = approvedFor(itemId);
    if (approved) return Number(approved.new_unit_value);
    return calcUnit[itemId] || 0;
  };

  const computedTotal = items.reduce((sum, i) => sum + parseNum(unitValues[i.id] || "") * (i.quantity || 1), 0);
  const savedTotal = items.reduce((sum, i) => sum + effectiveUnit(i.id) * (i.quantity || 1), 0);

  const handleSave = async () => {
    // Alterações manuais precisam de justificativa e viram solicitação de aprovação
    const newOverrides = items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => {
        if (!isDiverged(item.id)) return false;
        const approved = approvedFor(item.id);
        if (approved && Math.abs(Number(approved.new_unit_value) - parseNum(unitValues[item.id] || "")) < 0.005) return false;
        return true;
      });

    const missingJust = newOverrides.filter(({ item }) => (justifications[item.id] || "").trim().length < 10);
    if (missingJust.length > 0) {
      toast.error("Informe a justificativa (mín. 10 caracteres) para os valores alterados manualmente");
      return;
    }

    setSaving(true);
    try {
      if (newOverrides.length > 0) {
        await supabase.from("price_override_log").insert(
          newOverrides.map(({ item, idx }) => ({
            purchase_id: purchase.id,
            purchase_item_id: item.id,
            item_label: labelOf(item, idx),
            calculated_unit_value: calcUnit[item.id] || 0,
            new_unit_value: parseNum(unitValues[item.id] || ""),
            quantity: item.quantity || 1,
            justification: (justifications[item.id] || "").trim(),
            status: "pendente",
            created_by: user?.id ?? null,
          }))
        );
      }

      // Grava valores efetivos (calculado, ou manual já aprovado)
      for (const item of items) {
        const qty = item.quantity || 1;
        const unit = effectiveUnit(item.id);
        const cd = calcData[item.id];
        await supabase
          .from("purchase_items")
          .update({
            total_value: unit * qty,
            pricing_source: approvedFor(item.id) ? "calculadora" : "catalogo",
            calc_input: (cd?.input as any) ?? null,
            calc_result: (cd?.result as any) ?? null,
          })
          .eq("id", item.id);
      }
      await batchUpdateItemPricing(purchase.id, []);

      if (newOverrides.length > 0) {
        toast.success("Precificação salva. Alterações manuais enviadas para aprovação da gestão.");
      } else {
        toast.success("Precificação salva");
      }
      setJustifications({});
      await loadOverrides();
      setOpen(false);
      onCompleted();
    } catch {
      toast.error("Erro ao salvar precificação");
    } finally {
      setSaving(false);
    }
  };

  const reviewOverride = async (id: string, status: "aprovado" | "rejeitado") => {
    const { error } = await supabase
      .from("price_override_log")
      .update({ status, reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Sem permissão para aprovar alterações de preço");
      return;
    }
    toast.success(status === "aprovado" ? "Alteração aprovada" : "Alteração rejeitada");
    await loadData();
  };

  const pendingCount = overrides.filter(o => o.status === "pendente").length;

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
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-lg">Precificação de Peças</DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  Pedido {purchase.purchaseNumber} · {purchase.supplierName} — cálculo automático pelo catálogo (Pt/Pd/Rh) com margem de peças de {fmtNum(margin, 2)}%
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={recalcAll} disabled={loading}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Recalcular
                </Button>
                {items.length > 0 && <Badge className="text-sm px-3 py-1">{totalQty} peças</Badge>}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col border-t border-border">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-border bg-muted/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <div className="col-span-4">Peça</div>
              <div className="col-span-2 text-right">Qtd / Peso</div>
              <div className="col-span-2 text-right">Calculado unit.</div>
              <div className="col-span-2 text-right">Valor unit. (R$)</div>
              <div className="col-span-2 text-right">Subtotal</div>
            </div>

            <ScrollArea className="flex-1">
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
                    const pending = pendingFor(item.id);
                    const diverged = isDiverged(item.id);
                    return (
                      <div key={item.id} className="px-4 py-2.5 space-y-2">
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-4 min-w-0">
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
                          </div>
                          <div className="col-span-2 text-right">
                            <p className="text-sm font-medium">{qty} un</p>
                            <p className="text-xs text-muted-foreground">{fmtWeight(item.weight || 0)} kg</p>
                          </div>
                          <div className="col-span-2 text-right text-sm text-muted-foreground">
                            {fmtBrl(calcUnit[item.id] || 0)}
                          </div>
                          <div className="col-span-2">
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
                          </div>
                          <div className="col-span-2 text-right text-sm font-semibold">{fmtBrl(unit * qty)}</div>
                        </div>

                        {pending && (
                          <div className="flex items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
                            <p className="text-[11px] text-amber-800">
                              Valor ajustado para {fmtBrl(Number(pending.new_unit_value))} — aguardando aprovação · {pending.justification}
                            </p>
                            {canApprove && (
                              <div className="flex gap-1 shrink-0">
                                <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => reviewOverride(pending.id, "aprovado")}>
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => reviewOverride(pending.id, "rejeitado")}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {diverged && !pending && (
                          <Textarea
                            value={justifications[item.id] ?? ""}
                            onChange={(e) => setJustifications(prev => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="Justificativa da alteração manual (mín. 10 caracteres) — será enviada para aprovação"
                            className="text-xs min-h-[52px]"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {overrides.length > 0 && (
              <div className="px-4 py-2 border-t border-border max-h-32 overflow-auto">
                <p className="text-[11px] font-semibold uppercase text-muted-foreground mb-1">Histórico de alterações de valor</p>
                <div className="space-y-1">
                  {overrides.map(o => (
                    <p key={o.id} className="text-[11px] text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("pt-BR")} · {o.item_label}: {fmtBrl(Number(o.calculated_unit_value))} → {fmtBrl(Number(o.new_unit_value))} · {o.status} · {o.justification}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {items.length > 0 && (
              <div className="px-4 py-3 border-t border-border bg-muted/20 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Total de peças: {totalQty} un</span>
                  <span>Peso total: {fmtWeight(totalWeight)} kg</span>
                </div>
                {Math.abs(computedTotal - savedTotal) > 0.01 && (
                  <div className="flex justify-between text-xs text-amber-700">
                    <span>Valor a ser gravado (sem ajustes pendentes)</span>
                    <span>{fmtBrl(savedTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Valor total</span>
                  <span className="text-lg font-bold">{fmtBrl(computedTotal)}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border">
            {pendingCount > 0 && (
              <span className="text-xs text-amber-700 mr-auto self-center">
                {pendingCount} alteração(ões) aguardando aprovação
              </span>
            )}
            <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
            <Button disabled={saving || loading || items.length === 0} onClick={handleSave}>Salvar precificação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
