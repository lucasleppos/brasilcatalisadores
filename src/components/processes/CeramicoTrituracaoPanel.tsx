import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Save, Loader2, AlertTriangle, Camera, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Purchase, advanceStage } from "@/lib/purchases";
import { toast } from "sonner";
import { fmtNum, parseNum } from "@/lib/utils";
import { uploadStagePhoto } from "@/lib/stage-tasks";

const STAGE_KEY = "trituracao_ceramico";

interface Lote {
  itemId: string;
  category: string;
  weightGross: number;
  confPhotoUrl: string;
  labelCode: string;
  tareStr: string;
  packagePhotoUrl: string;
}

interface Props {
  purchase: Purchase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export default function CeramicoTrituracaoPanel({ purchase, open, onOpenChange, onCompleted }: Props) {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!open) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, purchase.id]);

  const load = async () => {
    setLoading(true);
    try {
      const { data: items } = await supabase
        .from("purchase_items")
        .select("id, weight, weight_loss")
        .eq("purchase_id", purchase.id)
        .eq("item_type", "ceramico")
        .eq("category", "conferencia");

      if (!items || items.length === 0) {
        setLotes([]);
        return;
      }

      const [{ data: confEv }, { data: tritEv }] = await Promise.all([
        supabase
          .from("stage_evidence")
          .select("task_key, value_text, file_url")
          .eq("purchase_id", purchase.id)
          .eq("stage", "conferencia_ceramico"),
        supabase
          .from("stage_evidence")
          .select("task_key, value_numeric, file_url")
          .eq("purchase_id", purchase.id)
          .eq("stage", STAGE_KEY),
      ]);

      const catMap: Record<string, string> = {};
      const photoMap: Record<string, string> = {};
      const labelMap: Record<string, string> = {};
      (confEv || []).forEach(e => {
        if (e.task_key.startsWith("lote_cat_")) catMap[e.task_key.replace("lote_cat_", "")] = e.value_text || "";
        else if (e.task_key.startsWith("photo_lote_")) photoMap[e.task_key.replace("photo_lote_", "")] = e.file_url || "";
        else if (e.task_key.startsWith("label_")) labelMap[e.task_key.replace("label_", "")] = e.value_text || "";
      });

      const tareMap: Record<string, number> = {};
      const pkgPhotoMap: Record<string, string> = {};
      (tritEv || []).forEach(e => {
        if (e.task_key.startsWith("tare_")) tareMap[e.task_key.replace("tare_", "")] = Number(e.value_numeric) || 0;
        else if (e.task_key.startsWith("photo_embalagem_")) pkgPhotoMap[e.task_key.replace("photo_embalagem_", "")] = e.file_url || "";
      });

      setLotes(items.map(it => {
        const savedTare = tareMap[it.id] ?? (Number(it.weight_loss) || 0);
        return {
          itemId: it.id,
          category: catMap[it.id] || "Lote",
          weightGross: Number(it.weight) || 0,
          confPhotoUrl: photoMap[it.id] || "",
          labelCode: labelMap[it.id] || "",
          tareStr: savedTare > 0 ? String(savedTare).replace(".", ",") : "",
          packagePhotoUrl: pkgPhotoMap[it.id] || "",
        };
      }));
    } finally {
      setLoading(false);
    }
  };

  const updateTare = (idx: number, val: string) => {
    setLotes(prev => prev.map((l, i) => i === idx ? { ...l, tareStr: val.replace(/[^0-9.,]/g, "") } : l));
  };

  const pickPhoto = (idx: number) => fileInputRefs.current[idx]?.click();

  const handlePhoto = async (idx: number, file: File) => {
    setUploadingIdx(idx);
    try {
      const url = await uploadStagePhoto(purchase.id, file);
      if (url) {
        setLotes(prev => prev.map((l, i) => i === idx ? { ...l, packagePhotoUrl: url } : l));
      } else {
        toast.error("Falha ao enviar foto");
      }
    } finally {
      setUploadingIdx(null);
    }
  };

  const removePhoto = (idx: number) => {
    setLotes(prev => prev.map((l, i) => i === idx ? { ...l, packagePhotoUrl: "" } : l));
  };

  const withCalc = useMemo(() => lotes.map(l => {
    const tare = parseNum(l.tareStr);
    const net = l.weightGross - tare;
    const validTare = tare > 0 && tare < l.weightGross;
    const complete = validTare && !!l.packagePhotoUrl;
    return { ...l, tare, net, validTare, complete };
  }), [lotes]);

  const totalGross = withCalc.reduce((s, l) => s + l.weightGross, 0);
  const totalTare = withCalc.reduce((s, l) => s + (l.validTare ? l.tare : 0), 0);
  const totalNet = withCalc.reduce((s, l) => s + (l.validTare ? l.net : 0), 0);
  const completedCount = withCalc.filter(l => l.complete).length;
  const allComplete = lotes.length > 0 && completedCount === lotes.length;

  const persist = async (): Promise<boolean> => {
    // Update purchase_items.weight_loss for each lote
    for (const l of withCalc) {
      const tareToSave = l.validTare ? l.tare : 0;
      const { error: uerr } = await supabase
        .from("purchase_items")
        .update({ weight_loss: tareToSave })
        .eq("id", l.itemId);
      if (uerr) return false;
    }

    // Replace stage_evidence for this stage
    await supabase
      .from("stage_evidence")
      .delete()
      .eq("purchase_id", purchase.id)
      .eq("stage", STAGE_KEY);

    const rows: any[] = [];
    for (const l of withCalc) {
      if (l.validTare) {
        rows.push({
          purchase_id: purchase.id,
          stage: STAGE_KEY,
          task_key: `tare_${l.itemId}`,
          data_type: "weight",
          value_numeric: l.tare,
        });
      }
      if (l.packagePhotoUrl) {
        rows.push({
          purchase_id: purchase.id,
          stage: STAGE_KEY,
          task_key: `photo_embalagem_${l.itemId}`,
          data_type: "photo",
          file_url: l.packagePhotoUrl,
        });
      }
    }
    if (rows.length > 0) {
      const { error } = await supabase.from("stage_evidence").insert(rows);
      if (error) return false;
    }
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const ok = await persist();
      if (!ok) { toast.error("Erro ao salvar"); return; }
      toast.success("Progresso salvo");
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    // Validate
    for (const l of withCalc) {
      if (!l.validTare) { toast.error(`Informe uma TARA válida para o lote ${l.category}`); return; }
      if (!l.packagePhotoUrl) { toast.error(`Adicione a foto da embalagem do lote ${l.category}`); return; }
    }
    setSaving(true);
    try {
      const ok = await persist();
      if (!ok) { toast.error("Erro ao encerrar etapa"); return; }
      await advanceStage(purchase.id, purchase.status);
      toast.success("Etapa encerrada");
      onOpenChange(false);
      onCompleted();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Trituração / Homogeneização / Amostragem — Cerâmico</DialogTitle>
        </DialogHeader>

        {/* Header */}
        <div className="rounded-md border bg-muted/30 p-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">{purchase.supplierName}</span>
            <span className="font-mono text-muted-foreground">{purchase.purchaseNumber}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Peso Bruto Recebido: <span className="font-semibold text-foreground">{fmtNum(purchase.bulkWeight || 0, 3)} kg</span>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando lotes...
          </div>
        ) : lotes.length === 0 ? (
          <div className="rounded-md bg-amber-500/10 border border-amber-300 p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            <p className="text-xs text-amber-700">Nenhum lote conferido encontrado. Volte à etapa de Conferência.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              Grupos conferidos ({completedCount}/{lotes.length} completos)
            </p>

            {withCalc.map((l, i) => (
              <Card key={l.itemId} className={l.complete ? "border-green-300/60 bg-green-500/[0.03]" : "border-border/60"}>
                <CardContent className="p-3 space-y-3">
                  {/* Group header */}
                  <div className="flex items-start gap-2">
                    {l.confPhotoUrl ? (
                      <img
                        src={l.confPhotoUrl}
                        alt=""
                        className="h-12 w-12 rounded object-cover border cursor-pointer shrink-0"
                        onClick={() => window.open(l.confPhotoUrl, "_blank")}
                      />
                    ) : (
                      <div className="h-12 w-12 rounded border bg-muted flex items-center justify-center shrink-0">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold truncate">#{i + 1} — {l.category}</p>
                        {l.complete && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                      </div>
                      {l.labelCode && (
                        <p className="text-[10px] font-mono text-muted-foreground truncate">{l.labelCode}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Peso Bruto: <span className="font-semibold text-foreground">{fmtNum(l.weightGross, 3)} kg</span>
                      </p>
                    </div>
                  </div>

                  {/* TARA input */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">TARA (peso da embalagem) — kg *</Label>
                    <Input
                      inputMode="decimal"
                      value={l.tareStr}
                      onChange={e => updateTare(i, e.target.value)}
                      placeholder="0,000"
                      className="h-8 text-sm"
                    />
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">
                        Peso Líquido:{" "}
                        <span className={l.validTare ? "font-semibold text-foreground" : "text-destructive"}>
                          {l.tareStr ? fmtNum(l.net, 3) : "—"} kg
                        </span>
                      </span>
                      {l.tareStr && !l.validTare && (
                        <span className="text-destructive">TARA inválida</span>
                      )}
                    </div>
                  </div>

                  {/* Package photo */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Foto da Embalagem *</Label>
                    <input
                      ref={el => (fileInputRefs.current[i] = el)}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) handlePhoto(i, f);
                        e.target.value = "";
                      }}
                    />
                    {l.packagePhotoUrl ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={l.packagePhotoUrl}
                          alt=""
                          className="h-14 w-14 rounded border object-cover cursor-pointer"
                          onClick={() => window.open(l.packagePhotoUrl, "_blank")}
                        />
                        <Button size="sm" variant="outline" className="h-8" onClick={() => pickPhoto(i)} disabled={uploadingIdx === i}>
                          Trocar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={() => removePhoto(i)}>
                          Remover
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="w-full h-8" onClick={() => pickPhoto(i)} disabled={uploadingIdx === i}>
                        {uploadingIdx === i ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Camera className="h-3 w-3 mr-1" />}
                        {uploadingIdx === i ? "Enviando..." : "Tirar / Escolher foto"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Summary */}
            <div className="rounded-md border p-3 space-y-1 bg-muted/30">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total Bruto:</span>
                <span className="font-semibold">{fmtNum(totalGross, 3)} kg</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total TARA:</span>
                <span className="font-semibold">{fmtNum(totalTare, 3)} kg</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-1 mt-1">
                <span className="text-muted-foreground">Total Líquido:</span>
                <span className="font-semibold text-primary">{fmtNum(totalNet, 3)} kg</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
              <Button variant="outline" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                Salvar
              </Button>
              <Button onClick={handleFinish} disabled={saving || !allComplete}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                Encerrar Etapa
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
