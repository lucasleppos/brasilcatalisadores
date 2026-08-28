import { StagePhotoThumb } from "@/components/processes/StagePhotoThumb";
import { useState, useEffect, useRef, useMemo } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

import { Plus, Trash2, CheckCircle2, Save, Loader2, AlertTriangle, Printer, Camera, Image as ImageIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Purchase, advanceStage, DIESEL_GROUP, isDieselGroup } from "@/lib/purchases";
import { toast } from "sonner";
import { fmtNum, fmtPct } from "@/lib/utils";
import { uploadStagePhoto } from "@/lib/stage-tasks";
import { buildLabelCode, buildLabelCodeDisplay } from "@/lib/labels";
import { printLabelSheet, LabelData } from "./CeramicoLabelPrint";

const LABEL_COPIES_PER_GROUP = 3;

const CERAMICO_CATEGORIES = [
  "Grupo 01", "Grupo 02", "Grupo 03", "Grupo 04", "Grupo 05",
  "Grupo 06", "Grupo 07", "Grupo 08", "Grupo 09", "Grupo 10",
  "Especial", "Extra", DIESEL_GROUP,
];


const TOLERANCE_PCT = 0.02; // 2%

interface CeramicoLote {
  id?: string;
  category: string;
  weightGross: number;
  /** draft text while editing the weight input */
  weightStr?: string;
  photoUrl: string;
  labelCode?: string;
}

interface CeramicoConferenciaPanelProps {
  purchase: Purchase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export default function CeramicoConferenciaPanel({ purchase, open, onOpenChange, onCompleted }: CeramicoConferenciaPanelProps) {
  const [lotes, setLotes] = useState<CeramicoLote[]>([]);
  const [category, setCategory] = useState("");
  const [weightGrossStr, setWeightGrossStr] = useState("");
  
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    loadExistingLotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, purchase.id]);

  const loadExistingLotes = async () => {
    const { data } = await supabase
      .from("purchase_items")
      .select("id, weight, weight_loss, category")
      .eq("purchase_id", purchase.id)
      .eq("item_type", "ceramico")
      .eq("category", "conferencia");

    if (!data || data.length === 0) {
      setLotes([]);
      return;
    }

    const { data: evidence } = await supabase
      .from("stage_evidence")
      .select("task_key, value_text, file_url")
      .eq("purchase_id", purchase.id)
      .eq("stage", "conferencia_ceramico");

    const catMap: Record<string, string> = {};
    const photoMap: Record<string, string> = {};
    const labelMap: Record<string, string> = {};
    (evidence || []).forEach(e => {
      if (e.task_key.startsWith("lote_cat_")) {
        catMap[e.task_key.replace("lote_cat_", "")] = e.value_text || "";
      } else if (e.task_key.startsWith("photo_lote_")) {
        photoMap[e.task_key.replace("photo_lote_", "")] = e.file_url || "";
      } else if (e.task_key.startsWith("label_")) {
        labelMap[e.task_key.replace("label_", "")] = e.value_text || "";
      }
    });

    setLotes(data.map(d => ({
      id: d.id,
      category: catMap[d.id] || "",
      weightGross: Number(d.weight) || 0,
      photoUrl: photoMap[d.id] || "",
      labelCode: labelMap[d.id] || undefined,
    })));
  };

  const handlePickPhoto = () => photoInputRef.current?.click();

  const handlePhotoFile = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const url = await uploadStagePhoto(purchase.id, file);
      if (url) setPhotoUrl(url);
      else toast.error("Falha ao enviar foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAdd = () => {
    if (!category) { toast.error("Selecione a categoria"); return; }
    const w = parseFloat(weightGrossStr.replace(",", "."));
    if (isNaN(w) || w <= 0) { toast.error("Informe o peso bruto"); return; }
    if (!photoUrl) { toast.error("Adicione a foto do lote"); return; }

    setLotes(prev => [...prev, { category, weightGross: w, photoUrl }]);
    setCategory("");
    setWeightGrossStr("");
    setPhotoUrl("");
  };

  const updateLote = (index: number, patch: Partial<CeramicoLote>) => {
    setLotes(prev => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const handleEditPhoto = async (index: number, file: File) => {
    setUploadingPhoto(true);
    try {
      const url = await uploadStagePhoto(purchase.id, file);
      if (url) updateLote(index, { photoUrl: url });
      else toast.error("Falha ao enviar foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const deleteItemData = async (itemId: string) => {
    await supabase.from("lab_results").delete().eq("purchase_item_id", itemId);
    await supabase.from("purchase_items").delete().eq("id", itemId);
    await supabase.from("stage_evidence").delete()
      .eq("purchase_id", purchase.id)
      .in("task_key", [
        `lote_cat_${itemId}`, `photo_lote_${itemId}`, `label_${itemId}`,
        `tare_${itemId}`, `photo_embalagem_${itemId}`,
      ]);
  };

  const handleRemove = async (index: number) => {
    const lote = lotes[index];
    if (lote.id) {
      const ok = window.confirm(
        "Remover este grupo? As análises de laboratório e evidências vinculadas a ele também serão excluídas."
      );
      if (!ok) return;
      await deleteItemData(lote.id);
    }
    setLotes(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Persist all lotes incrementally (update by id / insert new / delete removed),
   * preserving TARA, lab results and allocations of existing groups.
   */
  const persistAll = async (): Promise<CeramicoLote[] | null> => {
    const { data: existing } = await supabase
      .from("purchase_items")
      .select("id")
      .eq("purchase_id", purchase.id)
      .eq("item_type", "ceramico");

    const keepIds = new Set(lotes.filter(l => l.id).map(l => l.id as string));
    const toDelete = (existing || []).map(e => e.id).filter(id => !keepIds.has(id));
    for (const id of toDelete) {
      await deleteItemData(id);
    }

    const saved: CeramicoLote[] = [];
    for (let i = 0; i < lotes.length; i++) {
      const l = lotes[i];
      let id = l.id;

      if (id) {
        const { error } = await supabase
          .from("purchase_items")
          .update({ weight: l.weightGross })
          .eq("id", id);
        if (error) return null;
      } else {
        const { data: inserted, error } = await supabase
          .from("purchase_items")
          .insert({
            purchase_id: purchase.id,
            item_type: "ceramico" as const,
            category: "conferencia",
            quantity: 1,
            weight: l.weightGross,
            weight_loss: 0,
          })
          .select("id")
          .single();
        if (error || !inserted) return null;
        id = inserted.id;
      }

      const code = l.labelCode || buildLabelCode(purchase.purchaseNumber, purchase.date, i + 1);

      await supabase
        .from("stage_evidence")
        .delete()
        .eq("purchase_id", purchase.id)
        .eq("stage", "conferencia_ceramico")
        .in("task_key", [`lote_cat_${id}`, `label_${id}`, `photo_lote_${id}`]);

      const rows: any[] = [
        { purchase_id: purchase.id, stage: "conferencia_ceramico", task_key: `lote_cat_${id}`, data_type: "text", value_text: l.category },
        { purchase_id: purchase.id, stage: "conferencia_ceramico", task_key: `label_${id}`, data_type: "text", value_text: code },
      ];
      if (l.photoUrl) {
        rows.push({
          purchase_id: purchase.id, stage: "conferencia_ceramico",
          task_key: `photo_lote_${id}`, data_type: "photo", file_url: l.photoUrl,
        });
      }
      await supabase.from("stage_evidence").insert(rows);
      saved.push({ ...l, id, labelCode: code });
    }

    setLotes(saved);
    return saved;
  };

  const handleSave = async () => {
    if (lotes.length === 0) { toast.error("Adicione pelo menos um lote"); return; }
    if (lotes.some(l => !l.photoUrl)) { toast.error("Todos os lotes devem ter foto"); return; }
    if (lotes.some(l => !l.category.trim() || l.weightGross <= 0)) { toast.error("Todos os lotes precisam de grupo e peso bruto"); return; }
    setSaving(true);
    try {
      const ok = await persistAll();
      if (!ok) { toast.error("Erro ao salvar"); return; }
      toast.success("Conferência salva");
    } finally {
      setSaving(false);
    }
  };

  const declaredWeight = purchase.bulkWeight || 0;
  const totalGross = useMemo(() => lotes.reduce((s, l) => s + l.weightGross, 0), [lotes]);
  const balance = declaredWeight - totalGross;
  const tolerance = declaredWeight * TOLERANCE_PCT;
  const withinTolerance = declaredWeight > 0 ? Math.abs(balance) <= tolerance : true;
  const progress = declaredWeight > 0 ? Math.min((totalGross / declaredWeight) * 100, 100) : 0;

  const handleFinish = async () => {
    if (lotes.length === 0) { toast.error("Adicione pelo menos um lote"); return; }
    if (lotes.some(l => !l.photoUrl)) { toast.error("Todos os lotes devem ter foto"); return; }
    if (lotes.some(l => !l.category.trim() || l.weightGross <= 0)) { toast.error("Todos os lotes precisam de grupo e peso bruto"); return; }
    if (!withinTolerance) {
      toast.error(`Saldo fora da tolerância de ${fmtPct(TOLERANCE_PCT * 100)}. Ajuste os pesos antes de encerrar.`);
      return;
    }
    setSaving(true);
    try {
      const ok = await persistAll();
      if (!ok) { toast.error("Erro ao encerrar conferência"); return; }
      await advanceStage(purchase.id, purchase.status);
      toast.success("Conferência encerrada");
      onOpenChange(false);
      onCompleted();
    } finally {
      setSaving(false);
    }
  };

  const openPrint = async (data: LabelData[]) => {
    try {
      await printLabelSheet(data);
    } catch {
      toast.error("Erro ao gerar etiquetas");
    }
  };

  const expandCopies = (base: LabelData): LabelData[] =>
    Array.from({ length: LABEL_COPIES_PER_GROUP }, () => ({ ...base }));

  const handlePrintOne = async (index: number) => {
    let l = lotes[index];
    if (!l.labelCode || !l.id) {
      const saved = await persistAll();
      if (!saved) { toast.error("Salve os lotes primeiro"); return; }
      l = saved[index];
    }
    const displayCode = buildLabelCodeDisplay(purchase.purchaseNumber, purchase.date);
    openPrint(expandCopies({
      code: l.labelCode!,
      displayCode,
      buyer: purchase.buyer,
      supplierName: purchase.supplierName,
      group: l.category,
      weightGross: l.weightGross,
    }));
  };

  const handlePrintAll = async () => {
    if (lotes.length === 0) { toast.error("Adicione pelo menos um lote"); return; }
    let src = lotes;
    if (src.some(l => !l.labelCode || !l.id)) {
      const saved = await persistAll();
      if (!saved) { toast.error("Erro ao salvar"); return; }
      src = saved;
    }
    const displayCode = buildLabelCodeDisplay(purchase.purchaseNumber, purchase.date);
    const all = src.flatMap(l => expandCopies({
      code: l.labelCode!,
      displayCode,
      buyer: purchase.buyer,
      supplierName: purchase.supplierName,
      group: l.category,
      weightGross: l.weightGross,
    }));
    openPrint(all);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conferência — Cerâmico</DialogTitle>
          </DialogHeader>

          {/* Purchase header */}
          <div className="rounded-md border bg-muted/30 p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-semibold">{purchase.supplierName}</span>
              <span className="font-mono text-muted-foreground">{purchase.purchaseNumber}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Peso Bruto Recebido: <span className="font-semibold text-foreground">{fmtNum(declaredWeight, 3)} kg</span>
            </div>
          </div>

          {/* Lotes list */}
          {lotes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Lotes Conferidos (editáveis)</p>
              {lotes.map((l, i) => (
                <Card key={l.id || `new-${i}`} className="border-border/50">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        {l.photoUrl ? (
                          <StagePhotoThumb value={l.photoUrl} className="h-12 w-12 shrink-0" />
                        ) : (
                          <div className="h-12 w-12 rounded border bg-muted flex items-center justify-center shrink-0">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="space-y-1 min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-muted-foreground">#{i + 1}</p>
                          {isDieselGroup(l.category) && (
                            <p className="text-[10px] font-medium text-amber-700 bg-amber-500/10 border border-amber-300 rounded px-1.5 py-0.5 inline-block">
                              Diesel — direto para Aprovação
                            </p>
                          )}

                          <Input
                            list="ceramico-categories"
                            value={l.category}
                            onChange={e => updateLote(i, { category: e.target.value })}
                            placeholder="Grupo"
                            className="h-7 text-xs"
                          />
                          <div className="flex items-center gap-1">
                            <Input
                              inputMode="decimal"
                              value={l.weightStr ?? fmtNum(l.weightGross, 3)}
                              onChange={e => {
                                const v = e.target.value.replace(/[^0-9.,]/g, "");
                                const n = parseFloat(v.replace(",", "."));
                                updateLote(i, { weightStr: v, weightGross: isNaN(n) ? 0 : n });
                              }}
                              placeholder="0,000"
                              className="h-7 text-xs"
                            />
                            <span className="text-[10px] text-muted-foreground">kg bruto</span>
                          </div>
                          {l.labelCode && (
                            <p className="text-[10px] font-mono text-muted-foreground truncate">{l.labelCode}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="outline" size="icon" className="h-7 w-7"
                          title="Imprimir etiqueta"
                          onClick={() => handlePrintOne(i)}
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Remover grupo" onClick={() => handleRemove(i)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      id={`edit-photo-${i}`}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleEditPhoto(i, f);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      size="sm" variant="outline" className="w-full h-7 text-[11px]"
                      disabled={uploadingPhoto}
                      onClick={() => document.getElementById(`edit-photo-${i}`)?.click()}
                    >
                      <Camera className="h-3 w-3 mr-1" />
                      {l.photoUrl ? "Trocar foto" : "Adicionar foto"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Add lote form */}
          <div className="space-y-3 rounded-md border p-3">
            <p className="text-xs font-medium text-muted-foreground">Adicionar Lote</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Categoria (Grupo) *</Label>
              <Input
                list="ceramico-categories"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="Selecionar ou digitar categoria"
                className="h-8 text-sm"
              />
              <datalist id="ceramico-categories">
                {CERAMICO_CATEGORIES.map(c => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Peso Bruto (kg) *</Label>
              <Input
                inputMode="decimal"
                value={weightGrossStr}
                onChange={e => setWeightGrossStr(e.target.value.replace(/[^0-9.,]/g, ""))}
                placeholder="0,000"
                className="h-8 text-sm"
              />
            </div>

            {/* Photo */}
            <div className="space-y-1.5">
              <Label className="text-xs">Foto do Lote *</Label>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePhotoFile(f);
                  e.target.value = "";
                }}
              />
              {photoUrl ? (
                <div className="flex items-center gap-2">
                  <StagePhotoThumb value={photoUrl} className="h-14 w-14" clickable={false} />
                  <Button size="sm" variant="outline" className="h-8" onClick={handlePickPhoto} disabled={uploadingPhoto}>
                    Trocar foto
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={() => setPhotoUrl("")}>
                    Remover
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="w-full h-8" onClick={handlePickPhoto} disabled={uploadingPhoto}>
                  {uploadingPhoto ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Camera className="h-3 w-3 mr-1" />}
                  {uploadingPhoto ? "Enviando..." : "Tirar / Escolher foto"}
                </Button>
              )}
            </div>

            <Button size="sm" variant="secondary" className="w-full" onClick={handleAdd} disabled={!category || !photoUrl || uploadingPhoto}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar Lote
            </Button>
          </div>

          {/* Summary + Actions */}
          <div className="space-y-3 pt-2 border-t border-border/40">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Bruto Conferido:</span>
              <span className="font-semibold">{lotes.length} lotes | {fmtNum(totalGross, 3)} kg</span>
            </div>

            {declaredWeight > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Progress value={progress} className="h-2 flex-1" />
                  <span className={`text-xs font-semibold whitespace-nowrap ${withinTolerance && lotes.length > 0 ? "text-green-600" : "text-amber-600"}`}>
                    {fmtNum(totalGross, 1)}/{fmtNum(declaredWeight, 1)} kg
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    Saldo: <span className={balance < 0 ? "text-destructive font-semibold" : "font-semibold text-foreground"}>{fmtNum(balance, 3)} kg</span>
                  </span>
                  <span className="text-muted-foreground">Tolerância ±{fmtPct(TOLERANCE_PCT * 100)} ({fmtNum(tolerance, 3)} kg)</span>
                </div>
                {!withinTolerance && lotes.length > 0 && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Saldo fora da tolerância — encerramento bloqueado
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleSave} disabled={saving || lotes.length === 0}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                Salvar
              </Button>
              <Button variant="outline" onClick={handlePrintAll} disabled={saving || lotes.length === 0}>
                <Printer className="h-3 w-3 mr-1" />
                Imprimir Etiquetas
              </Button>
            </div>
            <Button className="w-full" onClick={handleFinish} disabled={saving || lotes.length === 0 || !withinTolerance}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
              Encerrar Conferência ({lotes.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
