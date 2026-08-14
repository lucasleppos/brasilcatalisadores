import { useState, useEffect } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle2, Save, Loader2, AlertTriangle, Minus, ArrowDownToLine, Undo2, PackageX, Printer } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Purchase, advanceStage, EXCLUDED_CATEGORY } from "@/lib/purchases";
import { toast } from "sonner";
import { fmtNum, parseNum } from "@/lib/utils";
import PartSearch from "@/components/catalog/PartSearch";
import { CatalogPart } from "@/lib/catalog";
import { weightCheck, marginColor, WEIGHT_MARGIN_PCT } from "@/lib/sacola-validation";
import { printLabelSheet, LabelData } from "./CeramicoLabelPrint";
import { buildLabelCodeDisplay } from "@/lib/labels";

const LABEL_COPIES = 3;


interface ConferenciaPiece {
  id?: string;
  /** Número fixo da peça, mantido em todas as etapas */
  seq: number;
  code: string;
  reference: string | null;
  catalogPartId: string;
  /** Peso unitário registrado (catálogo para peça fechada, pesado para sacola) */
  unitWeight: number;
  /** Peso cadastrado no catálogo (referência de comparação) */
  catalogWeight: number;
  quantity: number;
  /** Separada do fluxo de sacola (irá para nova compra de cerâmico) */
  excluded?: boolean;
}


interface SacolaConferenciaPanelProps {
  purchase: Purchase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export default function SacolaConferenciaPanel({ purchase, open, onOpenChange, onCompleted }: SacolaConferenciaPanelProps) {
  const [pieces, setPieces] = useState<ConferenciaPiece[]>([]);
  const [qty, setQty] = useState("1");
  const [weighed, setWeighed] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedPart, setSelectedPart] = useState<CatalogPart | null>(null);
  const [returnedQtyStr, setReturnedQtyStr] = useState("0");
  const [returnedReason, setReturnedReason] = useState("");
  


  const isSacola = purchase.items.some(i => i.itemType === "peca_sacola") || purchase.materialFlow === "sacola";
  const itemType: "peca" | "peca_sacola" = isSacola ? "peca_sacola" : "peca";
  const showReturns = !isSacola && purchase.materialFlow !== "ceramico";
  const returnedQty = showReturns ? Math.max(0, Math.floor(parseNum(returnedQtyStr) || 0)) : 0;

  useEffect(() => {
    if (!open) return;
    loadExistingPieces();
    loadReturns();
  }, [open, purchase.id]);

  const loadReturns = async () => {
    const { data } = await supabase
      .from("stage_evidence")
      .select("task_key, value_numeric, value_text")
      .eq("purchase_id", purchase.id)
      .in("task_key", ["qtd_devolvida", "motivo_devolucao"]);
    const q = (data || []).find(d => d.task_key === "qtd_devolvida");
    const r = (data || []).find(d => d.task_key === "motivo_devolucao");
    setReturnedQtyStr(q?.value_numeric != null ? String(Number(q.value_numeric)) : "0");
    setReturnedReason(r?.value_text || "");
  };

  const persistReturns = async () => {
    await supabase
      .from("stage_evidence")
      .delete()
      .eq("purchase_id", purchase.id)
      .in("task_key", ["qtd_devolvida", "motivo_devolucao"]);
    if (returnedQty > 0) {
      await supabase.from("stage_evidence").insert([
        {
          purchase_id: purchase.id, stage: "conferencia", task_key: "qtd_devolvida",
          data_type: "number", value_numeric: returnedQty,
        },
        {
          purchase_id: purchase.id, stage: "conferencia", task_key: "motivo_devolucao",
          data_type: "text", value_text: returnedReason.trim(),
        },
      ]);
    }
  };

  const loadExistingPieces = async () => {
    const { data } = await supabase
      .from("purchase_items")
      .select("id, item_type, weight, quantity, catalog_part_id, category, seq, created_at")
      .order("created_at", { ascending: true })
      .eq("purchase_id", purchase.id)
      .eq("item_type", itemType)
      .in("category", ["conferencia", EXCLUDED_CATEGORY]);

    const rows = (data || []).filter(d => d.catalog_part_id);
    if (rows.length === 0) {
      setPieces([]);
      return;
    }

    const catalogIds = rows.map(d => d.catalog_part_id!);
    const catalogMap: Record<string, { code: string; reference: string; weight: number }> = {};
    const { data: parts } = await supabase
      .from("catalog_parts")
      .select("id, code, reference, weight")
      .in("id", catalogIds);
    (parts || []).forEach(p => { catalogMap[p.id] = { code: p.code, reference: p.reference, weight: Number(p.weight) || 0 }; });

    let fallbackSeq = 0;
    setPieces(rows.map(d => {
      const q = Math.max(1, Number(d.quantity) || 1);
      const info = catalogMap[d.catalog_part_id!];
      fallbackSeq += 1;
      return {
        id: d.id,
        seq: Number((d as { seq?: number | null }).seq) || fallbackSeq,
        code: info?.code || "",
        reference: info?.reference || null,
        catalogPartId: d.catalog_part_id!,
        unitWeight: (Number(d.weight) || 0) / q,
        catalogWeight: info?.weight || 0,
        quantity: q,
        excluded: d.category === EXCLUDED_CATEGORY,
      };
    }));
  };


  const nextSeq = (list: ConferenciaPiece[]) =>
    list.reduce((m, p) => Math.max(m, p.seq || 0), 0) + 1;

  const handlePartSelect = (part: CatalogPart) => {
    setSelectedPart(part);
    setQty("1");
    setWeighed("");
  };

  const handleAdd = () => {
    if (!selectedPart) { toast.error("Selecione uma peça do catálogo"); return; }
    const catalogWeight = Number(selectedPart.weight) || 0;

    if (isSacola) {
      const w = parseNum(weighed);
      if (!w || w <= 0) { toast.error("Informe o peso pesado da peça"); return; }
      // Cada peça em sacola é uma linha própria (pesagem individual)
      setPieces(prev => [...prev, {
        seq: nextSeq(prev),
        code: selectedPart.code || selectedPart.reference,
        reference: selectedPart.reference,
        catalogPartId: selectedPart.id,
        unitWeight: w,
        catalogWeight,
        quantity: 1,
      }]);
      setSelectedPart(null);
      setWeighed("");
      return;
    }

    const q = parseInt(qty, 10);
    if (isNaN(q) || q < 1) { toast.error("Informe a quantidade"); return; }

    setPieces(prev => {
      const idx = prev.findIndex(p => p.catalogPartId === selectedPart.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + q };
        return next;
      }
      return [...prev, {
        seq: nextSeq(prev),
        code: selectedPart.code || selectedPart.reference,
        reference: selectedPart.reference,
        catalogPartId: selectedPart.id,
        unitWeight: catalogWeight,
        catalogWeight,
        quantity: q,
      }];
    });

    setSelectedPart(null);
    setQty("1");
  };

  const changeQty = (index: number, delta: number) => {
    setPieces(prev => prev.map((p, i) => i === index ? { ...p, quantity: Math.max(1, p.quantity + delta) } : p));
  };

  const changeWeight = (index: number, value: string) => {
    setPieces(prev => prev.map((p, i) => i === index ? { ...p, unitWeight: parseNum(value) } : p));
  };

  const handleRemove = async (index: number) => {
    const piece = pieces[index];
    if (piece.id) {
      await supabase.from("purchase_items").delete().eq("id", piece.id);
    }
    setPieces(prev => prev.filter((_, i) => i !== index));
  };

  const setExcluded = (index: number, value: boolean) => {
    setPieces(prev => prev.map((p, i) => i === index ? { ...p, excluded: value } : p));
  };

  const excludeAllOutOfMargin = () => {
    setPieces(prev => prev.map(p => {
      const c = weightCheck(p.catalogWeight, p.unitWeight);
      return c.hasBase && !c.withinMargin ? { ...p, excluded: true } : p;
    }));
  };

  /** Remove todos os itens do fluxo (inclusive o item marcador criado na compra) e grava os conferidos */
  const persistPieces = async () => {
    await supabase
      .from("purchase_items")
      .delete()
      .eq("purchase_id", purchase.id)
      .in("item_type", ["peca", "peca_sacola"]);

    await supabase.from("purchase_items").insert(
      pieces.map(p => ({
        purchase_id: purchase.id,
        item_type: itemType,
        category: p.excluded ? EXCLUDED_CATEGORY : "conferencia",
        quantity: p.quantity,
        weight: p.unitWeight * p.quantity,
        catalog_part_id: p.catalogPartId,
        seq: p.seq,
      }))
    );
  };

  const handleSave = async () => {
    if (pieces.length === 0) { toast.error("Adicione pelo menos uma peça"); return; }
    if (returnsInvalid) { toast.error(returnsError!); return; }
    setSaving(true);
    try {
      await persistPieces();
      await persistReturns();
      toast.success("Conferência salva");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const activePieces = pieces.filter(p => !p.excluded);
  const excludedPieces = pieces.filter(p => p.excluded);
  const excludedQty = excludedPieces.reduce((s, p) => s + p.quantity, 0);
  const excludedWeight = excludedPieces.reduce((s, p) => s + p.unitWeight * p.quantity, 0);

  // Meta = total de peças declaradas na criação da compra (unidades)
  const baseDeclaredQty = purchase.bulkWeight && purchase.bulkWeight > 0
    ? Math.round(purchase.bulkWeight)
    : purchase.items
        .filter(i => i.itemType === "peca" || i.itemType === "peca_sacola")
        .reduce((s, i) => s + (i.quantity || 1), 0);
  // Peças separadas e devolvidas saem da meta do fluxo
  const declaredQty = Math.max(0, baseDeclaredQty - excludedQty - returnedQty);

  const returnsError = returnedQty > baseDeclaredQty - excludedQty
    ? "Quantidade devolvida maior que o total declarado"
    : returnedQty > 0 && !returnedReason.trim()
      ? "Informe o motivo da devolução"
      : null;
  const returnsInvalid = !!returnsError;

  const totalQty = activePieces.reduce((s, p) => s + p.quantity, 0);
  const totalWeight = activePieces.reduce((s, p) => s + p.unitWeight * p.quantity, 0);
  const totalCatalogWeight = activePieces.reduce((s, p) => s + p.catalogWeight * p.quantity, 0);
  const globalCheck = weightCheck(totalCatalogWeight, totalWeight);
  const outOfMargin = isSacola
    ? activePieces.filter(p => {
        const c = weightCheck(p.catalogWeight, p.unitWeight);
        return c.hasBase && !c.withinMargin;
      }).length
    : 0;
  const isComplete = declaredQty > 0 && totalQty === declaredQty
    && !returnsInvalid
    && (!isSacola || activePieces.every(p => p.unitWeight > 0));

  const handlePrintLabels = async () => {
    if (pieces.length === 0) { toast.error("Adicione pelo menos uma peça"); return; }
    setSaving(true);
    try {
      await persistPieces();
      await persistReturns();
    } catch {
      toast.error("Erro ao salvar antes de imprimir");
      setSaving(false);
      return;
    }
    setSaving(false);

    const code = buildLabelCodeDisplay(purchase.purchaseNumber, purchase.date);
    const base: LabelData = {
      code,
      displayCode: code,
      buyer: purchase.buyer,
      supplierName: purchase.supplierName,
      group: "",
      typeLabel: isSacola ? "Peças em Sacola" : "Peças",
      qtyApproved: totalQty,
      qtyRejected: excludedQty + returnedQty,
    };
    try {
      await printLabelSheet(Array.from({ length: LABEL_COPIES }, () => ({ ...base })));
    } catch {
      toast.error("Erro ao gerar etiquetas");
    }
  };


  const handleFinish = async () => {
    if (activePieces.length === 0) { toast.error("Adicione pelo menos uma peça"); return; }
    if (isSacola && activePieces.some(p => p.unitWeight <= 0)) {
      toast.error("Informe o peso de todas as peças");
      return;
    }
    if (returnsInvalid) { toast.error(returnsError!); return; }
    if (!isComplete) {
      toast.error(`Faltam peças: ${totalQty}/${declaredQty} conferidas`);
      return;
    }
    setSaving(true);
    try {
      await persistPieces();
      await persistReturns();
      await advanceStage(purchase.id, purchase.status);
      toast.success("Conferência encerrada");
      onOpenChange(false);
      onCompleted();
    } catch {
      toast.error("Erro ao encerrar conferência");
    } finally {
      setSaving(false);
    }
  };


  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>

      <DialogContent className="max-w-full w-screen h-[100dvh] rounded-none overflow-y-auto sm:w-auto sm:max-w-lg sm:h-auto sm:max-h-[90vh] sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>{isSacola ? "Conferência — Peça em Sacola" : "Conferência — Peças"}</DialogTitle>
        </DialogHeader>

        {/* Purchase header */}
        <div className="rounded-md border bg-muted/30 p-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">{purchase.supplierName}</span>
            <span className="font-mono text-muted-foreground">{purchase.purchaseNumber}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {excludedQty > 0 || returnedQty > 0
                ? [
                    `${baseDeclaredQty} declaradas`,
                    excludedQty > 0 ? `${excludedQty} separadas` : null,
                    returnedQty > 0 ? `${returnedQty} devolvidas` : null,
                    `${declaredQty} no fluxo`,
                  ].filter(Boolean).join(" · ")
                : `${declaredQty} peças declaradas`}
            </span>
            <span>{fmtNum(totalWeight, 3)} kg conferidos</span>

          </div>
        </div>

        {/* Pieces list */}
        {activePieces.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Peças Conferidas</p>
            {pieces.map((p, i) => {
              if (p.excluded) return null;
              const check = weightCheck(p.catalogWeight, p.unitWeight);
              const outside = check.hasBase && !check.withinMargin;
              return (
                <Card key={p.id || `${p.catalogPartId}-${i}`} className={`border-border/50 ${outside ? "border-destructive/50 bg-destructive/5" : ""}`}>
                  <CardContent className="p-3 flex items-start justify-between gap-2">
                    <div className="space-y-0.5 flex-1">
                      <p className="text-xs font-semibold text-muted-foreground">#{p.seq}</p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Código: </span>
                        <span className="font-mono font-medium">{p.code}</span>
                      </p>
                      <p className="text-xs text-green-700 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Referência: <span className="font-mono">{p.reference || "—"}</span></span>
                      </p>

                      {isSacola ? (
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center gap-2">
                            <Label className="text-[10px] text-muted-foreground w-24">Peso pesado (kg)</Label>
                            <Input
                              inputMode="decimal"
                              value={p.unitWeight ? String(p.unitWeight).replace(".", ",") : ""}
                              onChange={e => changeWeight(i, e.target.value.replace(/[^0-9.,]/g, ""))}
                              className="h-7 w-24 text-sm"
                              placeholder="0,000"
                            />
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Catálogo: {fmtNum(p.catalogWeight, 3)} kg</span>
                            <span className={`font-semibold ${marginColor(check)}`}>Δ {check.label}</span>
                          </div>
                          {outside && (
                            <div className="space-y-1">
                              <Badge variant="outline" className="text-[10px] text-destructive border-destructive/40 bg-destructive/10">
                                <AlertTriangle className="h-3 w-3 mr-1" /> Fora da margem de peso ({WEIGHT_MARGIN_PCT}%)
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-[10px] border-amber-400 text-amber-700 hover:bg-amber-500/10"
                                onClick={() => setExcluded(i, true)}
                              >
                                <ArrowDownToLine className="h-3 w-3 mr-1" /> Separar do fluxo
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Peso unit.: {fmtNum(p.unitWeight, 3)} kg · Total: {fmtNum(p.unitWeight * p.quantity, 3)} kg
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {!isSacola && (
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => changeQty(i, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-semibold">{p.quantity}</span>
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => changeQty(i, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemove(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Peças separadas do fluxo */}
        {excludedPieces.length > 0 && (
          <div className="space-y-2 rounded-md border border-amber-400/50 bg-amber-500/5 p-3">
            <p className="text-xs font-semibold text-amber-700 flex items-center gap-1">
              <PackageX className="h-3.5 w-3.5" />
              Não seguem o fluxo de sacola ({excludedQty} peça(s) · {fmtNum(excludedWeight, 3)} kg)
            </p>
            <p className="text-[11px] text-muted-foreground">
              Registradas nesta compra para histórico. Devem ser incluídas em uma nova compra no fluxo de cerâmico.
            </p>
            {pieces.map((p, i) => {
              if (!p.excluded) return null;
              const check = weightCheck(p.catalogWeight, p.unitWeight);
              return (
                <div key={p.id || `ex-${p.catalogPartId}-${i}`} className="flex items-center justify-between gap-2 rounded border border-amber-400/30 bg-background/60 p-2">
                  <div className="text-xs space-y-0.5">
                    <p className="font-semibold text-muted-foreground">#{p.seq}</p>
                    <p><span className="text-muted-foreground">Código: </span><span className="font-mono font-medium">{p.code}</span></p>
                    <p className="text-muted-foreground">
                      Pesado: {fmtNum(p.unitWeight, 3)} kg · Catálogo: {fmtNum(p.catalogWeight, 3)} kg ·{" "}
                      <span className={`font-semibold ${marginColor(check)}`}>Δ {check.label}</span>
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setExcluded(i, false)}>
                    <Undo2 className="h-3 w-3 mr-1" /> Retornar
                  </Button>
                </div>
              );
            })}
          </div>
        )}



        {/* Add piece form */}
        <div className="space-y-3 rounded-md border p-3">
          <p className="text-xs font-medium text-muted-foreground">Adicionar Peça</p>
          <div className="space-y-1.5">
            <Label className="text-xs">Buscar peça no catálogo</Label>
            <PartSearch onSelect={handlePartSelect} />
            {selectedPart && (
              <div className="rounded-md border bg-muted/30 p-2 space-y-0.5 text-xs">
                <p className="flex items-center gap-1 font-medium text-green-700">
                  <CheckCircle2 className="h-3 w-3" /> Peça selecionada
                </p>
                <p><span className="text-muted-foreground">Código: </span><span className="font-mono">{selectedPart.code || "—"}</span></p>
                <p><span className="text-muted-foreground">Referência: </span><span className="font-mono">{selectedPart.reference || "—"}</span></p>
                <p><span className="text-muted-foreground">Marca/Veículo: </span>{selectedPart.brand} {selectedPart.vehicle}</p>
                <p><span className="text-muted-foreground">Peso catálogo: </span>{fmtNum(selectedPart.weight, 3)} kg</p>
                {isSacola && parseNum(weighed) > 0 && (
                  <p className={`font-semibold ${marginColor(weightCheck(Number(selectedPart.weight) || 0, parseNum(weighed)))}`}>
                    Δ peso: {weightCheck(Number(selectedPart.weight) || 0, parseNum(weighed)).label}
                  </p>
                )}
              </div>
            )}
          </div>

          {isSacola ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Peso pesado (kg)</Label>
              <Input
                inputMode="decimal"
                value={weighed}
                onChange={e => setWeighed(e.target.value.replace(/[^0-9.,]/g, ""))}
                placeholder="0,000"
                className="h-8 text-sm"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs">Quantidade (un)</Label>
              <Input
                inputMode="numeric"
                value={qty}
                onChange={e => setQty(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="1"
                className="h-8 text-sm"
              />
            </div>
          )}

          <Button
            size="sm"
            variant="secondary"
            className="w-full"
            onClick={handleAdd}
            disabled={!selectedPart || (isSacola ? parseNum(weighed) <= 0 : (!qty || parseInt(qty, 10) < 1))}
          >
            <Plus className="h-3 w-3 mr-1" /> Adicionar Peça
          </Button>
          <p className="text-[11px] text-muted-foreground">
            {isSacola
              ? `Cada peça é pesada individualmente e comparada ao peso do catálogo. Tolerância de ${WEIGHT_MARGIN_PCT}% para menos.`
              : "Somente peças do catálogo podem ser incluídas. O peso é carregado automaticamente do cadastro."}
          </p>
        </div>

        {/* Peças devolvidas (somente fluxo de Peças) */}
        {showReturns && (
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <PackageX className="h-3 w-3" /> Peças devolvidas
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Qtd. (un)</Label>
                <Input
                  inputMode="numeric"
                  value={returnedQtyStr}
                  onChange={e => setReturnedQtyStr(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Motivo{returnedQty > 0 ? " *" : ""}</Label>
                <Input
                  value={returnedReason}
                  onChange={e => setReturnedReason(e.target.value)}
                  placeholder="Ex.: peças deformadas"
                  className="h-8 text-sm"
                />
              </div>
            </div>
            {returnsError ? (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {returnsError}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Peças reprovadas na entrada são descontadas do total declarado.
              </p>
            )}
          </div>
        )}



        {/* Summary + Actions */}
        <div className="space-y-3 pt-2 border-t border-border/40">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-semibold">{totalQty} peças | {fmtNum(totalWeight, 3)} kg</span>
          </div>
          {isSacola && pieces.length > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Peso catálogo: {fmtNum(totalCatalogWeight, 3)} kg</span>
              <span className={`font-semibold ${marginColor(globalCheck)}`}>Δ geral {globalCheck.label}</span>
            </div>
          )}
          {isSacola && outOfMargin > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {outOfMargin} peça(s) fora da margem de {WEIGHT_MARGIN_PCT}%
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px] border-amber-400 text-amber-700 hover:bg-amber-500/10"
                onClick={excludeAllOutOfMargin}
              >
                <ArrowDownToLine className="h-3 w-3 mr-1" /> Separar todas do fluxo
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Progress value={declaredQty > 0 ? (totalQty / declaredQty) * 100 : 0} className="h-2 flex-1" />
            <span className={`text-xs font-semibold whitespace-nowrap ${isComplete ? "text-green-600" : "text-amber-600"}`}>
              {totalQty}/{declaredQty} peças
            </span>
          </div>
          {!isComplete && totalQty > 0 && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Confira todas as {declaredQty} peças para encerrar
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={handleSave} disabled={saving || pieces.length === 0}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
              Salvar e Continuar
            </Button>
            <Button variant="outline" onClick={handlePrintLabels} disabled={saving || pieces.length === 0}>
              <Printer className="h-3 w-3 mr-1" />
              Imprimir Etiquetas
            </Button>
          </div>
          <Button className="w-full" onClick={handleFinish} disabled={saving || !isComplete}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
            Encerrar ({totalQty}/{declaredQty})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

