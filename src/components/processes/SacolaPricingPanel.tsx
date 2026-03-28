import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Scale, Loader2, CheckCircle2, Save, AlertTriangle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Purchase, batchUpdateItemPricing } from "@/lib/purchases";
import { toast } from "sonner";
import { fmtNum, fmtBrl } from "@/lib/utils";

interface PricingPiece {
  itemId: string;
  code: string;
  reference: string | null;
  weight: number;
  catalogPartId: string | null;
  // Catalog PPMs
  catPt: number;
  catPd: number;
  catRh: number;
  // Lab PPMs
  labPt: number;
  labPd: number;
  labRh: number;
  // Manual values
  valueCatalog: string;
  valueCalc: string;
  // Selection
  pricingSource: "catalogo" | "calculadora" | null;
}

function pctDiff(cat: number, lab: number): { value: number; label: string; color: string } {
  if (cat === 0) return { value: 0, label: "—", color: "text-muted-foreground" };
  const diff = ((lab - cat) / cat) * 100;
  return {
    value: diff,
    label: `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`,
    color: diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-muted-foreground",
  };
}

function valuePctDiff(valCat: string, valCalc: string): { label: string; color: string } {
  const c = parseFloat(valCat.replace(",", "."));
  const l = parseFloat(valCalc.replace(",", "."));
  if (isNaN(c) || isNaN(l) || c === 0) return { label: "—", color: "text-muted-foreground" };
  const diff = ((l - c) / c) * 100;
  return {
    label: `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`,
    color: diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-muted-foreground",
  };
}

type FilterType = "all" | "pending" | "defined";

interface SacolaPricingPanelProps {
  purchase: Purchase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export default function SacolaPricingPanel({ purchase, open, onOpenChange, onCompleted }: SacolaPricingPanelProps) {
  const [pieces, setPieces] = useState<PricingPiece[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    if (!open) return;
    loadData();
  }, [open, purchase.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load conferencia items
      const { data: items } = await supabase
        .from("purchase_items")
        .select("id, weight, catalog_part_id, category, total_value, pricing_source")
        .eq("purchase_id", purchase.id)
        .eq("item_type", "peca_sacola")
        .eq("category", "conferencia");

      if (!items || items.length === 0) {
        setPieces([]);
        setLoading(false);
        return;
      }

      // Fetch catalog parts
      const catalogIds = [...new Set(items.filter(i => i.catalog_part_id).map(i => i.catalog_part_id!))];
      let catalogMap: Record<string, { code: string; reference: string; ptPpm: number; pdPpm: number; rhPpm: number }> = {};
      if (catalogIds.length > 0) {
        const { data: parts } = await supabase
          .from("catalog_parts")
          .select("id, code, reference, pt_ppm, pd_ppm, rh_ppm")
          .in("id", catalogIds);
        (parts || []).forEach(p => {
          catalogMap[p.id] = {
            code: p.code,
            reference: p.reference,
            ptPpm: Number(p.pt_ppm) || 0,
            pdPpm: Number(p.pd_ppm) || 0,
            rhPpm: Number(p.rh_ppm) || 0,
          };
        });
      }

      // Fetch lab results by purchase_item_id
      const { data: labResults } = await supabase
        .from("lab_results")
        .select("purchase_item_id, pt_ppm, pd_ppm, rh_ppm")
        .eq("purchase_id", purchase.id)
        .not("purchase_item_id", "is", null);

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

      setPieces(items.map(item => {
        const cp = item.catalog_part_id ? catalogMap[item.catalog_part_id] : null;
        const lr = labMap[item.id];
        const existingSource = (item as any).pricing_source as string | null;
        const existingValue = Number(item.total_value) || 0;

        return {
          itemId: item.id,
          code: cp ? cp.code : "Manual",
          reference: cp ? cp.reference : null,
          weight: Number(item.weight) || 0,
          catalogPartId: item.catalog_part_id,
          catPt: cp?.ptPpm || 0,
          catPd: cp?.pdPpm || 0,
          catRh: cp?.rhPpm || 0,
          labPt: lr?.pt || 0,
          labPd: lr?.pd || 0,
          labRh: lr?.rh || 0,
          valueCatalog: existingSource === "catalogo" && existingValue > 0 ? String(existingValue) : "",
          valueCalc: existingSource === "calculadora" && existingValue > 0 ? String(existingValue) : "",
          pricingSource: (existingSource as "catalogo" | "calculadora") || null,
        };
      }));
    } finally {
      setLoading(false);
    }
  };

  const updatePiece = (index: number, updates: Partial<PricingPiece>) => {
    setPieces(prev => prev.map((p, i) => i === index ? { ...p, ...updates } : p));
  };

  const definedCount = pieces.filter(p => p.pricingSource !== null).length;
  const totalCount = pieces.length;
  const isComplete = totalCount > 0 && definedCount === totalCount;

  const totalValue = useMemo(() => {
    return pieces.reduce((sum, p) => {
      if (!p.pricingSource) return sum;
      const val = p.pricingSource === "catalogo"
        ? parseFloat(p.valueCatalog.replace(",", "."))
        : parseFloat(p.valueCalc.replace(",", "."));
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [pieces]);

  const filteredPieces = useMemo(() => {
    let result = pieces.map((p, i) => ({ ...p, originalIndex: i }));
    if (filter === "pending") result = result.filter(p => p.pricingSource === null);
    if (filter === "defined") result = result.filter(p => p.pricingSource !== null);
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(p => p.code.toLowerCase().includes(s) || (p.reference || "").toLowerCase().includes(s));
    }
    return result;
  }, [pieces, filter, search]);

  const pendingCount = pieces.filter(p => p.pricingSource === null).length;

  const handleSave = async () => {
    // Just close — data persists in state for next open
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    // Validate all pieces have selection and valid values
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      if (!p.pricingSource) {
        toast.error(`Peça #${i + 1} (${p.code}) não tem preço selecionado`);
        return;
      }
      const val = p.pricingSource === "catalogo"
        ? parseFloat(p.valueCatalog.replace(",", "."))
        : parseFloat(p.valueCalc.replace(",", "."));
      if (isNaN(val) || val <= 0) {
        toast.error(`Peça #${i + 1} (${p.code}): valor inválido`);
        return;
      }
    }

    setSaving(true);
    try {
      const updates = pieces.map(p => ({
        itemId: p.itemId,
        totalValue: p.pricingSource === "catalogo"
          ? parseFloat(p.valueCatalog.replace(",", "."))
          : parseFloat(p.valueCalc.replace(",", ".")),
        pricingSource: p.pricingSource!,
      }));

      await batchUpdateItemPricing(purchase.id, updates);
      toast.success("Precificação confirmada");
      onOpenChange(false);
      onCompleted();
    } catch {
      toast.error("Erro ao salvar precificação");
    } finally {
      setSaving(false);
    }
  };

  const totalWeight = pieces.reduce((s, p) => s + p.weight, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Scale className="h-5 w-5" />
            Comparação Catálogo vs Laboratório
          </DialogTitle>
          <div className="flex items-center justify-between mt-2">
            <div className="text-sm text-muted-foreground space-x-3">
              <span className="font-semibold text-foreground">{purchase.supplierName}</span>
              <span className="font-mono">{purchase.purchaseNumber}</span>
              <span>{totalCount} peças</span>
              <span>{fmtNum(totalWeight, 3)} kg</span>
            </div>
            <Badge className="text-sm px-3 py-1">
              Total: {fmtBrl(totalValue)}
            </Badge>
          </div>
        </DialogHeader>

        {/* Search & Filters */}
        <div className="px-6 pb-3 flex items-center gap-3 border-b border-border">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar peça..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
              className="h-8 text-xs"
            >
              Todas ({totalCount})
            </Button>
            <Button
              size="sm"
              variant={filter === "pending" ? "default" : "outline"}
              onClick={() => setFilter("pending")}
              className="h-8 text-xs"
            >
              Pendentes ({pendingCount})
            </Button>
            <Button
              size="sm"
              variant={filter === "defined" ? "default" : "outline"}
              onClick={() => setFilter("defined")}
              className="h-8 text-xs"
            >
              Definidas ({definedCount})
            </Button>
          </div>
        </div>

        {/* Pieces list */}
        <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPieces.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              {pieces.length === 0 ? "Nenhuma peça conferida encontrada." : "Nenhuma peça encontrada com os filtros atuais."}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredPieces.map((p, displayIdx) => {
                const idx = p.originalIndex;
                const hasCatalog = !!p.catalogPartId;
                const ptDiff = pctDiff(p.catPt, p.labPt);
                const pdDiff = pctDiff(p.catPd, p.labPd);
                const rhDiff = pctDiff(p.catRh, p.labRh);
                const valDiff = valuePctDiff(p.valueCatalog, p.valueCalc);

                return (
                  <div
                    key={p.itemId}
                    className={`px-6 py-3 ${displayIdx % 2 === 0 ? "bg-background" : "bg-muted/20"} ${p.pricingSource === null ? "border-l-2 border-l-amber-400" : "border-l-2 border-l-green-400"}`}
                  >
                    <div className="grid grid-cols-12 gap-4 items-start">
                      {/* Col 1: Piece info */}
                      <div className="col-span-2 space-y-0.5">
                        <p className="text-sm font-mono font-semibold">#{idx + 1} {p.code}</p>
                        {p.reference && <p className="text-xs text-muted-foreground truncate">{p.reference}</p>}
                        <p className="text-xs text-muted-foreground">{fmtNum(p.weight, 3)} kg</p>
                      </div>

                      {/* Col 2: PPM Comparison */}
                      <div className="col-span-4">
                        <div className="grid grid-cols-4 gap-1 text-xs">
                          <div className="font-medium text-muted-foreground"></div>
                          <div className="font-medium text-muted-foreground text-center">Catálogo</div>
                          <div className="font-medium text-muted-foreground text-center">Lab</div>
                          <div className="font-medium text-muted-foreground text-center">Δ%</div>

                          <div className="font-medium">Pt</div>
                          <div className="text-center">{hasCatalog ? fmtNum(p.catPt, 0) : "—"}</div>
                          <div className="text-center">{fmtNum(p.labPt, 0)}</div>
                          <div className={`text-center font-semibold ${ptDiff.color}`}>{hasCatalog ? ptDiff.label : "—"}</div>

                          <div className="font-medium">Pd</div>
                          <div className="text-center">{hasCatalog ? fmtNum(p.catPd, 0) : "—"}</div>
                          <div className="text-center">{fmtNum(p.labPd, 0)}</div>
                          <div className={`text-center font-semibold ${pdDiff.color}`}>{hasCatalog ? pdDiff.label : "—"}</div>

                          <div className="font-medium">Rh</div>
                          <div className="text-center">{hasCatalog ? fmtNum(p.catRh, 0) : "—"}</div>
                          <div className="text-center">{fmtNum(p.labRh, 0)}</div>
                          <div className={`text-center font-semibold ${rhDiff.color}`}>{hasCatalog ? rhDiff.label : "—"}</div>
                        </div>
                      </div>

                      {/* Col 3: Values + Selection */}
                      <div className="col-span-6">
                        <div className="flex items-center gap-3">
                          {/* Catalog value */}
                          <div className="flex-1 space-y-1">
                            <Label className="text-[10px] text-muted-foreground">💰 Catálogo (R$)</Label>
                            <Input
                              inputMode="decimal"
                              value={p.valueCatalog}
                              onChange={e => updatePiece(idx, { valueCatalog: e.target.value.replace(/[^0-9.,]/g, "") })}
                              placeholder="0,00"
                              className="h-8 text-sm"
                              disabled={!hasCatalog}
                            />
                          </div>

                          {/* Calculator value */}
                          <div className="flex-1 space-y-1">
                            <Label className="text-[10px] text-muted-foreground">🧪 Calculadora (R$)</Label>
                            <Input
                              inputMode="decimal"
                              value={p.valueCalc}
                              onChange={e => updatePiece(idx, { valueCalc: e.target.value.replace(/[^0-9.,]/g, "") })}
                              placeholder="0,00"
                              className="h-8 text-sm"
                            />
                          </div>

                          {/* Diff */}
                          <div className="w-14 text-center pt-4">
                            <span className={`text-xs font-semibold ${valDiff.color}`}>{valDiff.label}</span>
                          </div>

                          {/* Radio selection */}
                          <div className="pt-3">
                            <RadioGroup
                              value={p.pricingSource || ""}
                              onValueChange={val => updatePiece(idx, { pricingSource: val as "catalogo" | "calculadora" })}
                              className="flex gap-3"
                            >
                              {hasCatalog && (
                                <div className="flex items-center gap-1.5">
                                  <RadioGroupItem value="catalogo" id={`cat-${p.itemId}`} />
                                  <Label htmlFor={`cat-${p.itemId}`} className="text-xs cursor-pointer">Cat</Label>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5">
                                <RadioGroupItem value="calculadora" id={`calc-${p.itemId}`} />
                                <Label htmlFor={`calc-${p.itemId}`} className="text-xs cursor-pointer">Calc</Label>
                              </div>
                            </RadioGroup>
                          </div>
                        </div>

                        {!hasCatalog && (
                          <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Sem referência no catálogo — apenas calculadora disponível
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border space-y-3">
          <div className="flex items-center gap-3">
            <Progress value={totalCount > 0 ? (definedCount / totalCount) * 100 : 0} className="h-2 flex-1" />
            <span className={`text-xs font-semibold whitespace-nowrap ${isComplete ? "text-green-600" : "text-amber-600"}`}>
              {definedCount}/{totalCount} precificadas
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="text-muted-foreground">Total do Pedido: </span>
              <span className="font-bold text-lg">{fmtBrl(totalValue)}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSave}>
                <Save className="h-4 w-4 mr-1" />
                Salvar e Continuar
              </Button>
              <Button onClick={handleConfirm} disabled={saving || !isComplete}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                Confirmar Precificação
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
