import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { usePermissions } from "@/lib/permissions";
import { Hedge, getPurchaseHedge, loadHedges, changePurchaseHedge } from "@/lib/hedges";
import { fmtNum } from "@/lib/utils";

const fmtDate = (d: string | null) => (d ? d.split("-").reverse().join("/") : "em aberto");

export function HedgeSwitcher({ purchaseId, onChanged }: { purchaseId: string; onChanged?: () => void }) {
  const { canDo } = usePermissions();
  const [hedge, setHedge] = useState<Hedge | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Hedge[]>([]);
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = () => getPurchaseHedge(purchaseId).then(h => { setHedge(h); setLoaded(true); });
  useEffect(() => { refresh(); }, [purchaseId]);

  const openDialog = async () => {
    setList(await loadHedges());
    setTarget(""); setReason(""); setOpen(true);
  };

  const confirm = async () => {
    if (!target || reason.trim().length < 5) { toast.error("Escolha o hedge e escreva a justificativa."); return; }
    setSaving(true);
    try {
      await changePurchaseHedge(purchaseId, hedge?.id ?? null, target, reason);
      toast.success("Hedge da compra alterado");
      setOpen(false);
      await refresh();
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  if (!loaded) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground border rounded-md px-2 py-1">
      <span>
        Hedge: <strong className="text-foreground">{hedge ? hedge.name : "Cotação anterior ao controle de hedge"}</strong>
        {hedge && <> · Pt {fmtNum(hedge.ptPrice, 0)} · Pd {fmtNum(hedge.pdPrice, 0)} · Rh {fmtNum(hedge.rhPrice, 0)} · US$ {fmtNum(hedge.usdToBrl, 2)}</>}
      </span>
      {canDo("processos", "trocar_hedge") && (
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={openDialog}>Trocar hedge</Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Trocar hedge da compra</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">
            A troca altera as cotações usadas nesta precificação e fica registrada no histórico.
          </p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Novo hedge</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {list.filter(h => h.id !== hedge?.id).map(h => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name} ({fmtDate(h.startDate)} – {fmtDate(h.endDate)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Justificativa (obrigatória)</Label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={confirm} disabled={saving}>{saving ? "Salvando..." : "Confirmar troca"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
