import QtyCheckBadge from "@/components/processes/QtyCheckBadge";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Save, Loader2, AlertTriangle, Hammer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Purchase, advanceStage } from "@/lib/purchases";
import { toast } from "sonner";
import { fmtNum } from "@/lib/utils";

const STAGE_KEY = "trituracao_sacola";

interface TritPiece {
  itemId: string;
  seq: number;
  code: string;
  reference: string | null;
  quantity: number;
  weight: number;
  done: boolean;
}

interface SacolaTrituracaoPanelProps {
  purchase: Purchase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export default function SacolaTrituracaoPanel({ purchase, open, onOpenChange, onCompleted }: SacolaTrituracaoPanelProps) {
  const [pieces, setPieces] = useState<TritPiece[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadPieces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, purchase.id]);

  const loadPieces = async () => {
    setLoading(true);
    try {
      const { data: items } = await supabase
        .from("purchase_items")
        .select("id, weight, quantity, catalog_part_id, seq, created_at")
        .order("created_at", { ascending: true })
        .eq("purchase_id", purchase.id)
        .eq("item_type", "peca_sacola")
        .eq("category", "conferencia");

      if (!items || items.length === 0) {
        setPieces([]);
        return;
      }

      const catalogIds = [...new Set(items.filter(i => i.catalog_part_id).map(i => i.catalog_part_id!))];
      const catalogMap: Record<string, { code: string; reference: string }> = {};
      if (catalogIds.length > 0) {
        const { data: parts } = await supabase
          .from("catalog_parts")
          .select("id, code, reference")
          .in("id", catalogIds);
        (parts || []).forEach(p => { catalogMap[p.id] = { code: p.code, reference: p.reference }; });
      }

      const { data: evidence } = await supabase
        .from("stage_evidence")
        .select("task_key, value_text")
        .eq("purchase_id", purchase.id)
        .eq("stage", STAGE_KEY);

      const doneSet = new Set(
        (evidence || [])
          .filter(e => e.task_key.startsWith("triturada_") && e.value_text === "true")
          .map(e => e.task_key.replace("triturada_", ""))
      );

      setPieces(items.map((item, idx) => {
        const cp = item.catalog_part_id ? catalogMap[item.catalog_part_id] : null;
        return {
          itemId: item.id,
          seq: Number((item as { seq?: number | null }).seq) || idx + 1,
          code: cp ? cp.code : "Manual",
          reference: cp ? cp.reference : null,
          quantity: Number(item.quantity) || 1,
          weight: Number(item.weight) || 0,
          done: doneSet.has(item.id),
        };
      }));
    } finally {
      setLoading(false);
    }
  };

  const toggle = (index: number) => {
    setPieces(prev => prev.map((p, i) => i === index ? { ...p, done: !p.done } : p));
  };

  const toggleAll = () => {
    const allDone = pieces.length > 0 && pieces.every(p => p.done);
    setPieces(prev => prev.map(p => ({ ...p, done: !allDone })));
  };

  const persist = async (): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;

    await supabase
      .from("stage_evidence")
      .delete()
      .eq("purchase_id", purchase.id)
      .eq("stage", STAGE_KEY);

    const rows = pieces
      .filter(p => p.done)
      .map(p => ({
        purchase_id: purchase.id,
        stage: STAGE_KEY,
        task_key: `triturada_${p.itemId}`,
        data_type: "boolean",
        value_text: "true",
        created_by: userId,
      }));

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
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const doneCount = pieces.filter(p => p.done).length;
  const totalCount = pieces.length;
  const isComplete = totalCount > 0 && doneCount === totalCount;

  const handleFinish = async () => {
    if (!isComplete) {
      toast.error(`Faltam peças: ${doneCount}/${totalCount}`);
      return;
    }
    setSaving(true);
    try {
      const ok = await persist();
      if (!ok) { toast.error("Erro ao salvar"); return; }
      await advanceStage(purchase.id, purchase.status);
      toast.success("Trituração encerrada — enviado ao laboratório");
      onOpenChange(false);
      onCompleted();
    } catch {
      toast.error("Erro ao encerrar");
    } finally {
      setSaving(false);
    }
  };

  const totalWeight = pieces.reduce((s, p) => s + p.weight, 0);
  const totalQty = pieces.reduce((s, p) => s + p.quantity, 0);
  const allDone = totalCount > 0 && doneCount === totalCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hammer className="h-5 w-5" />
            Trituração — Peça em Sacola
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">{purchase.supplierName}</span>
            <span className="font-mono text-muted-foreground">{purchase.purchaseNumber}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{totalQty} peças conferidas</span>
            <span>{fmtNum(totalWeight, 3)} kg total</span>
          </div>
          <QtyCheckBadge purchase={purchase} />
        </div>


        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : pieces.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma peça conferida encontrada.</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Peças para Trituração</p>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={toggleAll}>
                {allDone ? "Limpar seleção" : "Marcar todas"}
              </Button>
            </div>
            {pieces.map((p, i) => (
              <Card key={p.itemId} className={`border-border/50 ${p.done ? "bg-green-500/5 border-green-300/50" : ""}`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={p.done} onCheckedChange={() => toggle(i)} aria-label={`Peça ${p.code} triturada`} />
                    <div className="flex-1 space-y-0.5">
                      <p className="text-sm font-mono">#{p.seq} — Código: {p.code}</p>
                      {p.reference && (
                        <p className="text-xs text-muted-foreground">Referência: {p.reference}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {p.quantity} un · {fmtNum(p.weight, 3)} kg
                      </p>
                    </div>
                    {p.done && (
                      <Badge variant="outline" className="text-green-700 border-green-300 bg-green-500/10 text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Triturada
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="space-y-3 pt-2 border-t border-border/40">
          <div className="flex items-center gap-2">
            <Progress value={totalCount > 0 ? (doneCount / totalCount) * 100 : 0} className="h-2 flex-1" />
            <span className={`text-xs font-semibold whitespace-nowrap ${isComplete ? "text-green-600" : "text-amber-600"}`}>
              {doneCount}/{totalCount} trituradas
            </span>
          </div>
          {!isComplete && doneCount > 0 && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Marque todas as {totalCount} peças para encerrar
            </p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={saving} onClick={handleSave}>
              <Save className="h-3 w-3 mr-1" />
              Salvar e Continuar
            </Button>
            <Button className="flex-1" onClick={handleFinish} disabled={saving || !isComplete}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
              Encerrar ({doneCount}/{totalCount})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
