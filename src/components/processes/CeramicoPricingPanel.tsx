import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Calculator, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Purchase, batchUpdateItemPricing, advanceStage } from "@/lib/purchases";
import { calculate, CalculatorInput, CalculatorResult } from "@/lib/calculator";
import { loadSettings, Settings } from "@/lib/settings";
import { toast } from "sonner";
import { fmtNum, fmtBrl } from "@/lib/utils";

interface LotPricing {
  itemId: string;
  category: string;
  weight: number;
  ptPpm: number;
  pdPpm: number;
  rhPpm: number;
  calcInput: CalculatorInput | null;
  calcResult: CalculatorResult | null;
  totalValue: number;
}

interface CeramicoPricingPanelProps {
  purchase: Purchase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export default function CeramicoPricingPanel({ purchase, open, onOpenChange, onCompleted }: CeramicoPricingPanelProps) {
  const [lots, setLots] = useState<LotPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [supplierMargin, setSupplierMargin] = useState(15);

  useEffect(() => {
    if (!open) return;
    loadData();
  }, [open, purchase.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsData, { data: items }, { data: labResults }, { data: supplier }] = await Promise.all([
        loadSettings(),
        supabase
          .from("purchase_items")
          .select("id, weight, weight_loss, category, total_value, calc_input, calc_result")
          .eq("purchase_id", purchase.id)
          .eq("category", "conferencia"),
        supabase
          .from("lab_results")
          .select("purchase_item_id, pt_ppm, pd_ppm, rh_ppm")
          .eq("purchase_id", purchase.id)
          .not("purchase_item_id", "is", null),
        supabase
          .from("suppliers")
          .select("margin")
          .eq("id", purchase.supplierId)
          .single(),
      ]);

      setSettings(settingsData);
      const margin = Number(supplier?.margin) || 15;
      setSupplierMargin(margin);

      if (!items || items.length === 0) {
        setLots([]);
        setLoading(false);
        return;
      }

      // Build lab PPM map by purchase_item_id
      const labMap: Record<string, { pt: number; pd: number; rh: number }> = {};
      (labResults || []).forEach(lr => {
        if (lr.purchase_item_id) {
          labMap[lr.purchase_item_id] = {
            pt: Number(lr.pt_ppm) || 0,
            pd: Number(lr.pd_ppm) || 0,
            rh: Number(lr.rh_ppm) || 0,
          };
        }
      });

      // Calculate for each lot
      const calculatedLots: LotPricing[] = items.map(item => {
        const lr = labMap[item.id];
        const grossW = Number(item.weight) || 0;
        const tareW = Number(item.weight_loss) || 0;
        const weight = Math.max(0, grossW - tareW);

        // If already calculated, use existing
        if (item.calc_result && item.total_value && Number(item.total_value) > 0) {
          return {
            itemId: item.id,
            category: item.category || "Lote",
            weight,
            ptPpm: lr?.pt || 0,
            pdPpm: lr?.pd || 0,
            rhPpm: lr?.rh || 0,
            calcInput: item.calc_input as unknown as CalculatorInput,
            calcResult: item.calc_result as unknown as CalculatorResult,
            totalValue: Number(item.total_value),
          };
        }

        // Calculate using engine
        if (lr && weight > 0) {
          const input: CalculatorInput = {
            grossWeight: weight,
            tare: 0,
            materialType: "comum",
            ptPpm: lr.pt,
            pdPpm: lr.pd,
            rhPpm: lr.rh,
            clientDiscount: margin,
            entryType: "grupo",
            manualPrice: null,
            customPt: null,
            customPd: null,
            customRh: null,
          };
          const result = calculate(input, settingsData);
          return {
            itemId: item.id,
            category: item.category || "Lote",
            weight,
            ptPpm: lr.pt,
            pdPpm: lr.pd,
            rhPpm: lr.rh,
            calcInput: input,
            calcResult: result,
            totalValue: result.finalValueBrl,
          };
        }

        return {
          itemId: item.id,
          category: item.category || "Lote",
          weight,
          ptPpm: lr?.pt || 0,
          pdPpm: lr?.pd || 0,
          rhPpm: lr?.rh || 0,
          calcInput: null,
          calcResult: null,
          totalValue: 0,
        };
      });

      setLots(calculatedLots);
    } finally {
      setLoading(false);
    }
  };

  const recalculate = () => {
    if (!settings) return;
    setLots(prev => prev.map(lot => {
      if (lot.ptPpm === 0 && lot.pdPpm === 0 && lot.rhPpm === 0) return lot;
      if (lot.weight <= 0) return lot;

      const input: CalculatorInput = {
        grossWeight: lot.weight,
        tare: 0,
        materialType: "comum",
        ptPpm: lot.ptPpm,
        pdPpm: lot.pdPpm,
        rhPpm: lot.rhPpm,
        clientDiscount: supplierMargin,
        entryType: "grupo",
        manualPrice: null,
        customPt: null,
        customPd: null,
        customRh: null,
      };
      const result = calculate(input, settings);
      return {
        ...lot,
        calcInput: input,
        calcResult: result,
        totalValue: result.finalValueBrl,
      };
    }));
    toast.success("Valores recalculados");
  };

  const totalValue = useMemo(() => lots.reduce((s, l) => s + l.totalValue, 0), [lots]);
  const totalWeight = useMemo(() => lots.reduce((s, l) => s + l.weight, 0), [lots]);
  const allCalculated = lots.length > 0 && lots.every(l => l.calcResult !== null);

  const handleConfirm = async () => {
    if (!allCalculated) {
      toast.error("Existem lotes sem cálculo. Verifique os dados do laboratório.");
      return;
    }

    setSaving(true);
    try {
      // Save calc_input, calc_result, total_value for each lot
      for (const lot of lots) {
        await supabase
          .from("purchase_items")
          .update({
            calc_input: lot.calcInput as any,
            calc_result: lot.calcResult as any,
            total_value: lot.totalValue,
            pricing_source: "calculadora",
          })
          .eq("id", lot.itemId);
      }

      // Update purchase total_brl
      await supabase
        .from("purchases")
        .update({ total_brl: totalValue })
        .eq("id", purchase.id);

      // Advance to next stage automatically
      await advanceStage(purchase.id, purchase.status);

      toast.success("Precificação cerâmica confirmada");
      onOpenChange(false);
      onCompleted();
    } catch {
      toast.error("Erro ao salvar precificação");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5" />
            Precificação — Cerâmico
          </DialogTitle>
          <div className="flex items-center justify-between mt-2">
            <div className="text-sm text-muted-foreground space-x-3">
              <span className="font-semibold text-foreground">{purchase.supplierName}</span>
              <span className="font-mono">{purchase.purchaseNumber}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>Margem fornecedor: <strong className="text-foreground">{fmtNum(supplierMargin, 1)}%</strong></span>
            <span>{lots.length} lotes</span>
            <span>{fmtNum(totalWeight, 3)} kg</span>
          </div>
        </DialogHeader>

        {/* Lots list */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : lots.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              Nenhum lote conferido encontrado.
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {lots.map((lot, idx) => (
                <div
                  key={lot.itemId}
                  className={`rounded-lg border p-4 ${lot.calcResult ? "border-border bg-background" : "border-amber-300 bg-amber-500/5"}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold">#{idx + 1} — {lot.category === "conferencia" ? `Lote ${idx + 1}` : lot.category}</p>
                      <p className="text-xs text-muted-foreground">{fmtNum(lot.weight, 3)} kg</p>
                    </div>
                    {lot.calcResult ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-300">
                        Calculado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300">
                        Sem cálculo
                      </Badge>
                    )}
                  </div>

                  {/* PPMs */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-2 rounded-md bg-muted/40">
                      <p className="text-[10px] text-muted-foreground">Pt (ppm)</p>
                      <p className="text-sm font-semibold">{fmtNum(lot.ptPpm, 0)}</p>
                    </div>
                    <div className="text-center p-2 rounded-md bg-muted/40">
                      <p className="text-[10px] text-muted-foreground">Pd (ppm)</p>
                      <p className="text-sm font-semibold">{fmtNum(lot.pdPpm, 0)}</p>
                    </div>
                    <div className="text-center p-2 rounded-md bg-muted/40">
                      <p className="text-[10px] text-muted-foreground">Rh (ppm)</p>
                      <p className="text-sm font-semibold">{fmtNum(lot.rhPpm, 0)}</p>
                    </div>
                  </div>

                  {/* Calculation details */}
                  {lot.calcResult && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs border-t border-border/40 pt-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor bruto USD:</span>
                        <span>$ {fmtNum(lot.calcResult.grossMetalValueUsd, 2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Deduções USD:</span>
                        <span className="text-red-600">-$ {fmtNum(lot.calcResult.totalDeductions, 2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor líquido USD:</span>
                        <span>$ {fmtNum(lot.calcResult.netValueUsd, 2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Desconto ({fmtNum(supplierMargin, 1)}%):</span>
                        <span className="text-red-600">-$ {fmtNum(lot.calcResult.clientDiscountValue, 2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Total value */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
                    <span className="text-sm font-medium text-muted-foreground">Valor calculado:</span>
                    <span className="text-lg font-bold text-foreground">
                      {lot.totalValue > 0 ? fmtBrl(lot.totalValue) : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">TOTAL:</span>
            <span className="text-xl font-bold">{fmtBrl(totalValue)}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={recalculate}
              disabled={loading || saving}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Recalcular
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleConfirm}
              disabled={loading || saving || !allCalculated}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
              Confirmar Precificação
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
