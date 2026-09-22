import { useState, useEffect } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { getSupplierBranch } from "@/lib/suppliers";
import { buildLabelCodeDisplay } from "@/lib/labels";
import { printSeparatedPiecesReport } from "@/lib/separated-pieces-report";
import { computeSeparatedPieceValues } from "@/lib/separated-pieces-value";

const LABEL_COPIES = 3;

type MaterialKind = "flex" | "carbono";



interface ConferenciaPiece {
  id?: string;
  /** Número fixo da peça, mantido em todas as etapas */
  seq: number;
  code: string;
  reference: string | null;
  catalogPartId?: string;
  /** Peso unitário registrado (catálogo para peça fechada, pesado para sacola) */
  unitWeight: number;
  /** Peso cadastrado no catálogo (referência de comparação) */
  catalogWeight: number;
  quantity: number;
  /** Separada do fluxo de sacola (irá para nova compra de cerâmico) */
  excluded?: boolean;
  /** Classificação do material (apenas informativa, usada na alocação) */
  materialKind?: MaterialKind;
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
  const [newIssue, setNewIssue] = useState(false);
  /** ids das peças carregadas do banco, para saber o que foi removido na tela */
  const [loadedIds, setLoadedIds] = useState<string[]>([]);


  const isSacola = purchase.items.some(i => i.itemType === "peca_sacola") || purchase.materialFlow === "sacola";
  const itemType: "peca" | "peca_sacola" = isSacola ? "peca_sacola" : "peca";

  useEffect(() => {
    if (!open) return;
    loadExistingPieces();
  }, [open, purchase.id]);



  const loadExistingPieces = async () => {
    const { data } = await supabase
      .from("purchase_items")
      .select("id, item_type, weight, quantity, catalog_part_id, category, seq, material_kind, created_at, part_code, part_reference")
      .order("created_at", { ascending: true })
      .eq("purchase_id", purchase.id)
      .eq("item_type", itemType)
      .in("category", ["conferencia", EXCLUDED_CATEGORY]);

    const rows = data || [];
    if (rows.length === 0) {
      setPieces([]);
      setLoadedIds([]);
      return;
    }

    const catalogIds = rows.map(d => d.catalog_part_id).filter((v): v is string => !!v);
    const catalogMap: Record<string, { code: string; reference: string; weight: number }> = {};
    const { data: parts } = await supabase
      .from("catalog_parts")
      .select("id, code, reference, weight")
      .in("id", catalogIds);
    (parts || []).forEach(p => { catalogMap[p.id] = { code: p.code, reference: p.reference, weight: Number(p.weight) || 0 }; });

    let fallbackSeq = 0;
    setPieces(rows.map(d => {
      const q = Math.max(1, Number(d.quantity) || 1);
      const info = d.catalog_part_id ? catalogMap[d.catalog_part_id] : undefined;
      fallbackSeq += 1;
      return {
        id: d.id,
        seq: Number((d as { seq?: number | null }).seq) || fallbackSeq,
        code: info?.code || d.part_code || "sem código",
        reference: info?.reference || d.part_reference || null,
        catalogPartId: d.catalog_part_id || undefined,
        unitWeight: (Number(d.weight) || 0) / q,
        catalogWeight: info?.weight || 0,
        quantity: q,
        excluded: d.category === EXCLUDED_CATEGORY,
        materialKind: ((d as { material_kind?: string | null }).material_kind === "carbono" ? "carbono" : (d as { material_kind?: string | null }).material_kind === "flex" ? "flex" : undefined) as MaterialKind | undefined,
      };
    }));
    setLoadedIds(rows.map(d => d.id));
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
      const idx = prev.findIndex(p => p.catalogPartId === selectedPart.id && !!p.excluded === newIssue);
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
        excluded: newIssue,
      }];
    });

    setSelectedPart(null);
    setQty("1");
    setNewIssue(false);
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
      const { data: allocated } = await supabase
        .from("bag_items")
        .select("purchase_item_id")
        .eq("purchase_id", purchase.id);
      if ((allocated || []).some(a => (a.purchase_item_id || "").startsWith(piece.id!))) {
        toast.error("Esta peça já está alocada em um Bag. Retire a alocação no módulo Bags antes de removê-la.");
        return;
      }
      const { error } = await supabase.from("purchase_items").delete().eq("id", piece.id);
      if (error) { toast.error(`Não foi possível remover a peça: ${error.message}`); return; }
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

  /**
   * Reconcilia as peças da conferência:
   * - peças já existentes são atualizadas (preserva valor lançado e precificação);
   * - peças novas são inseridas;
   * - peças retiradas da tela são excluídas, desde que não estejam alocadas em Bag;
   * - o item marcador criado na compra (sem categoria) é removido.
   */
  const persistPieces = async () => {
    const payload = (p: ConferenciaPiece) => ({
      purchase_id: purchase.id,
      item_type: itemType,
      category: p.excluded ? EXCLUDED_CATEGORY : "conferencia",
      quantity: p.quantity,
      weight: p.unitWeight * p.quantity,
      catalog_part_id: p.catalogPartId ?? null,
      seq: p.seq,
      // A marcação Flex/Carbono é feita no Laboratório; aqui apenas preserva o que já existir
      material_kind: isSacola ? (p.materialKind ?? null) : null,
    });

    // 1) remove o item marcador da compra (sem categoria de conferência)
    const { error: markerErr } = await supabase
      .from("purchase_items")
      .delete()
      .eq("purchase_id", purchase.id)
      .in("item_type", ["peca", "peca_sacola"])
      .is("category", null);
    if (markerErr) throw new Error(`Não foi possível limpar os itens anteriores: ${markerErr.message}`);

    // 2) exclui as peças retiradas na tela (bloqueando as já alocadas em Bag)
    const keptIds = new Set(pieces.map(p => p.id).filter((v): v is string => !!v));
    const removedIds = loadedIds.filter(id => !keptIds.has(id));
    if (removedIds.length > 0) {
      const { data: allocated } = await supabase
        .from("bag_items")
        .select("purchase_item_id")
        .eq("purchase_id", purchase.id);
      // o id pode vir com sufixo (ex.: "<id>::flex")
      const blocked = (allocated || []).filter(a =>
        removedIds.some(id => (a.purchase_item_id || "").startsWith(id))
      );
      if (blocked.length > 0) {
        throw new Error("Há peças removidas que já estão alocadas em um Bag. Retire a alocação no módulo Bags antes de salvar.");
      }
      const { error: delErr } = await supabase.from("purchase_items").delete().in("id", removedIds);
      if (delErr) throw new Error(`Não foi possível remover as peças excluídas: ${delErr.message}`);
    }

    // 3) atualiza as peças existentes (mantendo valor e precificação)
    for (const p of pieces.filter(x => x.id)) {
      const { error } = await supabase.from("purchase_items").update(payload(p)).eq("id", p.id!);
      if (error) throw new Error(`Não foi possível atualizar a peça ${p.code}: ${error.message}`);
    }

    // 4) insere as peças novas
    const newPieces = pieces.filter(p => !p.id);
    if (newPieces.length > 0) {
      const { data: inserted, error: insErr } = await supabase
        .from("purchase_items")
        .insert(newPieces.map(payload))
        .select("id");
      if (insErr) throw new Error(`Não foi possível salvar as peças conferidas: ${insErr.message}`);
      if ((inserted?.length ?? 0) !== newPieces.length) {
        throw new Error("As peças conferidas não foram gravadas. Verifique suas permissões e tente novamente.");
      }
    }

    await loadExistingPieces();
  };

  const handleSave = async () => {
    if (pieces.length === 0) { toast.error("Adicione pelo menos uma peça"); return; }
    setSaving(true);
    try {
      await persistPieces();
      toast.success("Conferência salva");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
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
  // Peças separadas (intercorrência) saem da meta do fluxo
  const declaredQty = Math.max(0, baseDeclaredQty - excludedQty);

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
    && (!isSacola || activePieces.every(p => p.unitWeight > 0));

  const handlePrintLabels = async () => {
    if (pieces.length === 0) { toast.error("Adicione pelo menos uma peça"); return; }
    setSaving(true);
    try {
      await persistPieces();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar antes de imprimir");
      setSaving(false);
      return;
    }
    setSaving(false);


    const code = buildLabelCodeDisplay(purchase.purchaseNumber, purchase.date);
    const branch = await getSupplierBranch(purchase.supplierId);
    const base: LabelData = {
      code,
      displayCode: code,
      buyer: purchase.buyer,
      supplierName: purchase.supplierName,
      branch: branch || undefined,
      group: "",
      typeLabel: isSacola ? "Peças em Sacola" : "Peças",
      qtyApproved: totalQty,
      qtyRejected: excludedQty,
    };
    try {
      await printLabelSheet(Array.from({ length: LABEL_COPIES }, () => ({ ...base })));
    } catch {
      toast.error("Erro ao gerar etiquetas");
    }
  };


  const handleSeparatedReport = async () => {
    if (excludedPieces.length === 0) return;
    setSaving(true);
    try {
      await persistPieces();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar antes de gerar o PDF");
      setSaving(false);
      return;
    }
    setSaving(false);

    const branch = await getSupplierBranch(purchase.supplierId);
    try {
      const values = await computeSeparatedPieceValues(
        purchase.supplierId,
        excludedPieces.map(p => ({
          catalogPartId: p.catalogPartId,
          quantity: p.quantity,
          weight: p.unitWeight * (p.quantity || 1),
        })),
      );
      await printSeparatedPiecesReport({
        purchaseNumber: purchase.purchaseNumber,
        date: purchase.date,
        supplierName: purchase.supplierName,
        branch: branch || undefined,
        buyer: purchase.buyer,
        erpNumber: purchase.erpNumber || undefined,
        pieces: excludedPieces.map((p, i) => ({
          seq: p.seq ?? i + 1,
          code: p.code,
          reference: p.reference,
          unitValue: values[i]?.unitValue ?? null,
        })),
      });
    } catch {
      toast.error("Erro ao gerar o PDF das peças separadas");
    }
  };


  const handleFinish = async () => {
    if (activePieces.length === 0) { toast.error("Adicione pelo menos uma peça"); return; }
    if (isSacola && activePieces.some(p => p.unitWeight <= 0)) {
      toast.error("Informe o peso de todas as peças");
      return;
    }
    if (!isComplete) {
      toast.error(`Faltam peças: ${totalQty}/${declaredQty} conferidas`);
      return;
    }
    setSaving(true);
    try {
      await persistPieces();


      // Confere no banco antes de avançar: nunca avançar sem os itens gravados
      const { data: saved, error: checkErr } = await supabase
        .from("purchase_items")
        .select("id, quantity, category")
        .eq("purchase_id", purchase.id)
        .in("item_type", ["peca", "peca_sacola"]);
      if (checkErr) throw new Error(`Não foi possível confirmar a gravação: ${checkErr.message}`);
      const savedQty = (saved || [])
        .filter(r => r.category === "conferencia")
        .reduce((s, r) => s + (Number(r.quantity) || 0), 0);
      if (savedQty !== totalQty) {
        throw new Error(`As peças não foram gravadas corretamente (${savedQty}/${totalQty}). A etapa não foi avançada.`);
      }

      await advanceStage(purchase.id, purchase.status);
      toast.success("Conferência encerrada");
      onOpenChange(false);
      onCompleted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao encerrar conferência");
    } finally {
      setSaving(false);
    }
  };



  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>

      <DialogContent className="max-w-full w-screen h-[100dvh] rounded-none overflow-y-auto sm:w-[min(32rem,95vw)] sm:max-w-none sm:h-auto sm:max-h-[90vh] sm:rounded-lg">
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
              {excludedQty > 0
                ? [
                    `${baseDeclaredQty} declaradas`,
                    `${excludedQty} separadas`,
                    `${declaredQty} no fluxo`,
                  ].join(" · ")
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
                      {!isSacola && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] border-amber-400 text-amber-700 hover:bg-amber-500/10"
                          onClick={() => setExcluded(i, true)}
                        >
                          <ArrowDownToLine className="h-3 w-3 mr-1" /> Intercorrência
                        </Button>
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
              {isSacola
                ? `Não seguem o fluxo de sacola (${excludedQty} peça(s) · ${fmtNum(excludedWeight, 3)} kg)`
                : `Peças com intercorrência — não seguem o fluxo (${excludedQty} peça(s))`}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Registradas nesta compra para histórico. Devem ser incluídas em uma nova compra no fluxo de cerâmico.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={saving}
              onClick={handleSeparatedReport}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Printer className="h-3.5 w-3.5 mr-1" />}
              Gerar PDF das peças separadas
            </Button>
            {pieces.map((p, i) => {
              if (!p.excluded) return null;
              const check = weightCheck(p.catalogWeight, p.unitWeight);
              return (
                <div key={p.id || `ex-${p.catalogPartId}-${i}`} className="flex items-center justify-between gap-2 rounded border border-amber-400/30 bg-background/60 p-2">
                  <div className="text-xs space-y-0.5">
                    <p className="font-semibold text-muted-foreground">#{p.seq}</p>
                    <p><span className="text-muted-foreground">Código: </span><span className="font-mono font-medium">{p.code}</span></p>
                    {isSacola ? (
                      <p className="text-muted-foreground">
                        Pesado: {fmtNum(p.unitWeight, 3)} kg · Catálogo: {fmtNum(p.catalogWeight, 3)} kg ·{" "}
                        <span className={`font-semibold ${marginColor(check)}`}>Δ {check.label}</span>
                      </p>
                    ) : (
                      <p className="text-muted-foreground">
                        Ref.: <span className="font-mono">{p.reference || "—"}</span> · {p.quantity} un
                      </p>
                    )}
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
            <div className="space-y-3">
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

          {!isSacola && (
            <label className="flex items-center gap-2 rounded-md border border-amber-400/50 bg-amber-500/5 p-2 cursor-pointer">
              <Checkbox checked={newIssue} onCheckedChange={v => setNewIssue(v === true)} />
              <span className="text-xs font-medium text-amber-700 flex items-center gap-1">
                <PackageX className="h-3 w-3" /> Peça com intercorrência (não segue o fluxo)
              </span>
            </label>
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

