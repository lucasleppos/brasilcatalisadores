import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, List } from "lucide-react";
import { toast } from "sonner";
import { fmtNum, parseNum } from "@/lib/utils";
import {
  Hedge, HedgeUsage, loadHedges, loadHedgeUsage, saveHedge, deleteHedge, isActive, todayIso, loadHedgePurchases,
} from "@/lib/hedges";

const fmtDate = (d: string | null) => (d ? d.split("-").reverse().join("/") : "—");

type Form = {
  id?: string; name: string; startDate: string; endDate: string;
  pt: string; pd: string; rh: string; usd: string; ptOz: string; pdOz: string; rhOz: string; notes: string;
};

const emptyForm = (): Form => ({
  name: "", startDate: todayIso(), endDate: "", pt: "", pd: "", rh: "", usd: "", ptOz: "0", pdOz: "0", rhOz: "0", notes: "",
});

function UsageBar({ label, used, total }: { label: string; used: number; total: number }) {
  if (!total) return <div className="text-xs text-muted-foreground">{label}: {fmtNum(used, 4)} ozt consumidas (sem quantidade contratada)</div>;
  const pct = (used / total) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span className={pct > 100 ? "text-destructive font-semibold" : pct >= 90 ? "text-primary font-semibold" : ""}>
          {fmtNum(used, 4)} / {fmtNum(total, 4)} ozt · saldo {fmtNum(total - used, 4)}
        </span>
      </div>
      <Progress value={Math.min(pct, 100)} className="h-1.5" />
    </div>
  );
}

export function HedgeManager() {
  const [hedges, setHedges] = useState<Hedge[]>([]);
  const [usage, setUsage] = useState<Record<string, HedgeUsage>>({});
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<{ hedge: Hedge; rows: any[] } | null>(null);

  const reload = async () => {
    const [h, u] = await Promise.all([loadHedges(), loadHedgeUsage()]);
    setHedges(h); setUsage(u);
  };
  useEffect(() => { reload(); }, []);

  const edit = (h: Hedge) => setForm({
    id: h.id, name: h.name, startDate: h.startDate, endDate: h.endDate ?? "",
    pt: String(h.ptPrice), pd: String(h.pdPrice), rh: String(h.rhPrice), usd: String(h.usdToBrl),
    ptOz: String(h.ptOzContracted), pdOz: String(h.pdOzContracted), rhOz: String(h.rhOzContracted), notes: h.notes ?? "",
  });

  const submit = async () => {
    if (!form) return;
    if (!form.name.trim() || !form.startDate || !parseNum(form.pt) || !parseNum(form.pd) || !parseNum(form.rh) || !parseNum(form.usd)) {
      toast.error("Preencha nome, início, cotações e câmbio."); return;
    }
    setSaving(true);
    try {
      await saveHedge({
        id: form.id, name: form.name.trim(), startDate: form.startDate, endDate: form.endDate || null,
        ptPrice: parseNum(form.pt), pdPrice: parseNum(form.pd), rhPrice: parseNum(form.rh), usdToBrl: parseNum(form.usd),
        ptOzContracted: parseNum(form.ptOz), pdOzContracted: parseNum(form.pdOz), rhOzContracted: parseNum(form.rhOz),
        notes: form.notes || null,
      });
      toast.success(form.id ? "Hedge atualizado" : "Hedge criado (o anterior foi encerrado automaticamente)");
      setForm(null); reload();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const remove = async (h: Hedge) => {
    if (!confirm(`Apagar o hedge "${h.name}"?`)) return;
    try { await deleteHedge(h.id); toast.success("Hedge apagado"); reload(); } catch (e: any) { toast.error(e.message); }
  };

  const openDetail = async (h: Hedge) => setDetail({ hedge: h, rows: await loadHedgePurchases(h.id) });

  const F = (k: keyof Form, label: string, props: any = {}) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={(form as any)[k]} onChange={e => setForm(f => f && ({ ...f, [k]: e.target.value }))} className="h-8 text-sm" {...props} />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Cada compra usa o hedge vigente na data de entrada. Criar um novo hedge encerra o anterior no dia anterior ao início.
        </p>
        <Button size="sm" onClick={() => setForm(emptyForm())}><Plus className="mr-1 h-3 w-3" />Novo hedge</Button>
      </div>

      {hedges.map(h => {
        const u = usage[h.id] ?? { pt: 0, pd: 0, rh: 0, purchases: 0 };
        const active = isActive(h);
        return (
          <Card key={h.id} className={active ? "border-primary" : ""}>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                {h.name}
                {active ? <Badge>Vigente</Badge> : h.startDate > todayIso() ? <Badge variant="outline">Futuro</Badge> : <Badge variant="secondary">Encerrado</Badge>}
                <span className="text-xs font-normal text-muted-foreground">{fmtDate(h.startDate)} até {h.endDate ? fmtDate(h.endDate) : "em aberto"}</span>
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetail(h)} title="Compras vinculadas"><List className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => edit(h)} title="Editar"><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(h)} title="Apagar"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <div>Pt <strong>{fmtNum(h.ptPrice, 2)}</strong> <span className="text-xs text-muted-foreground">USD/ozt</span></div>
                <div>Pd <strong>{fmtNum(h.pdPrice, 2)}</strong> <span className="text-xs text-muted-foreground">USD/ozt</span></div>
                <div>Rh <strong>{fmtNum(h.rhPrice, 2)}</strong> <span className="text-xs text-muted-foreground">USD/ozt</span></div>
                <div>Câmbio <strong>R$ {fmtNum(h.usdToBrl, 4)}</strong></div>
              </div>
              <div className="space-y-2">
                <UsageBar label="Platina" used={u.pt} total={h.ptOzContracted} />
                <UsageBar label="Paládio" used={u.pd} total={h.pdOzContracted} />
                <UsageBar label="Ródio" used={u.rh} total={h.rhOzContracted} />
              </div>
              <div className="text-xs text-muted-foreground">{u.purchases} compra(s) aprovada(s) consumindo este hedge{h.notes ? ` · ${h.notes}` : ""}</div>
            </CardContent>
          </Card>
        );
      })}
      {hedges.length === 0 && <p className="text-sm text-muted-foreground">Nenhum hedge cadastrado.</p>}

      <Dialog open={!!form} onOpenChange={o => !o && setForm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form?.id ? "Editar hedge" : "Novo hedge"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">{F("name", "Nome")}</div>
              {F("startDate", "Início", { type: "date" })}
              {F("endDate", "Fim (opcional)", { type: "date" })}
              {F("pt", "Platina (USD/ozt)", { inputMode: "decimal" })}
              {F("pd", "Paládio (USD/ozt)", { inputMode: "decimal" })}
              {F("rh", "Ródio (USD/ozt)", { inputMode: "decimal" })}
              {F("usd", "Câmbio USD → BRL", { inputMode: "decimal" })}
              {F("ptOz", "Pt contratada (ozt)", { inputMode: "decimal" })}
              {F("pdOz", "Pd contratada (ozt)", { inputMode: "decimal" })}
              {F("rhOz", "Rh contratada (ozt)", { inputMode: "decimal" })}
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Observações</Label>
                <Textarea rows={2} value={form.notes} onChange={e => setForm(f => f && ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={submit} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
          <DialogHeader><DialogTitle>Compras do {detail?.hedge.name}</DialogTitle></DialogHeader>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Compra</TableHead><TableHead>Fornecedor</TableHead><TableHead>Status</TableHead>
                <TableHead className="text-right">Pt ozt</TableHead><TableHead className="text-right">Pd ozt</TableHead><TableHead className="text-right">Rh ozt</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {detail?.rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.purchase_number}</TableCell>
                  <TableCell className="text-xs">{r.supplier_name}</TableCell>
                  <TableCell className="text-xs">{r.status}</TableCell>
                  <TableCell className="text-right">{r.consumption ? fmtNum(Number(r.consumption.pt_oz), 4) : "—"}</TableCell>
                  <TableCell className="text-right">{r.consumption ? fmtNum(Number(r.consumption.pd_oz), 4) : "—"}</TableCell>
                  <TableCell className="text-right">{r.consumption ? fmtNum(Number(r.consumption.rh_oz), 4) : "—"}</TableCell>
                </TableRow>
              ))}
              {detail?.rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhuma compra vinculada.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
