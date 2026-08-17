import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, Save, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Purchase, EXCLUDED_CATEGORY } from "@/lib/purchases";
import { saveBranchConferencia, finishBranchConferencia } from "@/lib/branches";
import { fmtBrl, fmtKg, fmtNum, parseNum } from "@/lib/utils";
import PartSearch from "@/components/catalog/PartSearch";
import { CatalogPart } from "@/lib/catalog";

interface Row {
  /** id do purchase_item (existente) ou chave local (novo) */
  id: string;
  isNew?: boolean;
  checked: boolean;
  label: string;
  reference: string;
  vehicle: string;
  pedidoNumber: string;
  quantity: number;
  weight: number;
  value: number;
  itemType: "peca" | "ceramico";
  catalogPartId?: string;
}

interface Props {
  purchase: Purchase;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCompleted: () => void;
}

let localSeq = 0;

export default function BranchConferenciaPanel({ purchase, open, onOpenChange, onCompleted }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setRows(
      purchase.items.map((i) => ({
        id: i.id,
        checked: i.category !== EXCLUDED_CATEGORY,
        label:
          i.catalogPartCode || i.partCode || (i.itemType === "ceramico" ? "Granel" : "sem código"),
        reference:
          i.catalogPartRef || i.partReference || (i.itemType === "ceramico" ? "granel" : "—"),
        vehicle: i.partVehicle || "",
        pedidoNumber: i.pedidoNumber || "",
        quantity: i.quantity || 1,
        weight: Number(i.weight) || 0,
        value: Number(i.totalValue) || 0,
        itemType: i.itemType === "ceramico" ? "ceramico" : "peca",
        catalogPartId: i.catalogPartId,
      }))
    );
    setShowCatalog(false);
    setSearch("");
  }, [open, purchase.id, purchase.items]);

  const norm = (v: string) =>
    v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const visibleRows = useMemo(() => {
    const q = norm(search.trim());
    if (!q) return rows;
    return rows.filter((r) => norm(`${r.label} ${r.reference} ${r.vehicle} ${r.pedidoNumber}`).includes(q));
  }, [rows, search]);

  const approved = rows.filter((r) => r.checked);
  const rejected = rows.filter((r) => !r.checked);

  const sum = (list: Row[]) => ({
    qty: list.reduce((a, r) => a + (r.itemType === "ceramico" ? 0 : r.quantity), 0),
    weight: list.reduce((a, r) => a + r.weight, 0),
    value: list.reduce((a, r) => a + r.value, 0),
  });
  const totalsOk = useMemo(() => sum(approved), [rows]);
  const totalsOut = useMemo(() => sum(rejected), [rows]);

  const patch = (id: string, p: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const addFromCatalog = (part: CatalogPart) => {
    setRows((prev) => [
      ...prev,
      {
        id: `new-${++localSeq}`,
        isNew: true,
        checked: true,
        label: part.code || part.reference,
        reference: part.reference,
        vehicle: `${part.brand} - ${part.vehicle}`.trim(),
        pedidoNumber: "",
        quantity: 1,
        weight: Number(part.weight) || 0,
        value: 0,
        itemType: "peca",
        catalogPartId: part.id,
      },
    ]);
    setShowCatalog(false);
  };

  const addBulk = () =>
    setRows((prev) => [
      ...prev,
      {
        id: `new-${++localSeq}`,
        isNew: true,
        checked: true,
        label: "Granel",
        reference: "granel",
        vehicle: "",
        pedidoNumber: "",
        quantity: 1,
        weight: 0,
        value: 0,
        itemType: "ceramico",
      },
    ]);

  const removeNew = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  /** Persiste as linhas novas e devolve os ids reais marcados */
  const persistNewRows = async (): Promise<string[] | null> => {
    const newRows = rows.filter((r) => r.isNew);
    const checkedIds = rows.filter((r) => r.checked && !r.isNew).map((r) => r.id);
    if (newRows.length === 0) return checkedIds;

    const { data, error } = await supabase
      .from("purchase_items")
      .insert(
        newRows.map((r) => ({
          purchase_id: purchase.id,
          item_type: r.itemType,
          quantity: r.itemType === "ceramico" ? null : r.quantity,
          weight: r.weight,
          total_value: r.value,
          catalog_part_id: r.catalogPartId || null,
          part_code: r.label || null,
          part_reference: r.reference || null,
          part_vehicle: r.vehicle || null,
          category: r.checked ? null : EXCLUDED_CATEGORY,
        }))
      )
      .select("id");

    if (error || !data) {
      toast({ title: "Erro ao incluir itens adicionais", variant: "destructive" });
      return null;
    }

    const insertedChecked = data
      .filter((_, idx) => newRows[idx].checked)
      .map((d: any) => d.id as string);
    return [...checkedIds, ...insertedChecked];
  };

  const handleSave = async (finish: boolean) => {
    if (finish && approved.length === 0) {
      toast({ title: "Marque ao menos uma peça apta", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const ids = await persistNewRows();
      if (!ids) return;

      const ok = finish
        ? await finishBranchConferencia(purchase.id, ids)
        : await saveBranchConferencia(purchase.id, ids);

      if (!ok) {
        toast({ title: "Erro ao salvar a conferência", variant: "destructive" });
        return;
      }

      toast({
        title: finish ? "Conferência concluída" : "Conferência salva",
        description: finish
          ? `${totalsOk.qty} un · ${fmtKg(totalsOk.weight, 3)} · ${fmtBrl(totalsOk.value)} no estoque da filial.`
          : undefined,
      });
      onCompleted();
      if (finish) onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[95vh] sm:h-auto sm:max-h-[95vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Conferência · {purchase.purchaseNumber} · {purchase.supplierName}
            <Badge variant="secondary">Marcadas {approved.length}</Badge>
            <Badge variant="outline">Fora {rejected.length}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Marque as peças aptas a serem recebidas e contabilizadas. As não marcadas ficam registradas como
            inaptas/devolvidas.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setRows((p) => p.map((r) => ({ ...r, checked: true })))}>
              Marcar todas
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRows((p) => p.map((r) => ({ ...r, checked: false })))}>
              Limpar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowCatalog((v) => !v)}>
              <Plus className="h-4 w-4 mr-1" /> Peça extra
            </Button>
            <Button variant="outline" size="sm" onClick={addBulk}>
              <Plus className="h-4 w-4 mr-1" /> Granel
            </Button>
          </div>

          <Input
            placeholder="Buscar por código, referência, modelo ou pedido…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
          />

          {showCatalog && (
            <Card>
              <CardContent className="p-3">
                <Label className="text-xs text-muted-foreground">Buscar peça no catálogo</Label>
                <PartSearch onSelect={addFromCatalog} />
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {visibleRows.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma peça encontrada para a busca.</p>
            )}
            {visibleRows.map((r) => {
              const idx = rows.findIndex((x) => x.id === r.id);
              return (
              <div
                key={r.id}
                className={`border rounded-md p-3 flex flex-col sm:flex-row sm:items-center gap-3 ${
                  r.checked ? "" : "opacity-60"
                }`}
              >
                <Checkbox checked={r.checked} onCheckedChange={(v) => patch(r.id, { checked: !!v })} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {idx + 1}. <span className="font-mono">{r.label}</span>
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[r.reference, r.vehicle].filter((v) => v && v !== "—").join(" · ") || "—"}
                  </p>
                  {r.pedidoNumber && (
                    <p className="text-xs text-muted-foreground">pedido {r.pedidoNumber}</p>
                  )}
                </div>
                {r.isNew ? (
                  <div className="flex flex-wrap items-end gap-2">
                    {r.itemType !== "ceramico" && (
                      <div className="w-20">
                        <Label className="text-xs">Un</Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={r.quantity}
                          onChange={(e) =>
                            patch(r.id, { quantity: parseInt(e.target.value.replace(/\D/g, ""), 10) || 0 })
                          }
                          className="h-8"
                        />
                      </div>
                    )}
                    <div className="w-28">
                      <Label className="text-xs">Peso (kg)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={fmtNum(r.weight, 3)}
                        onChange={(e) => patch(r.id, { weight: parseNum(e.target.value) })}
                        className="h-8"
                      />
                    </div>
                    <div className="w-32">
                      <Label className="text-xs">Valor (R$)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={fmtNum(r.value, 2)}
                        onChange={(e) => patch(r.id, { value: parseNum(e.target.value) })}
                        className="h-8"
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeNew(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-xs text-right shrink-0">
                    <p>
                      {r.itemType === "ceramico" ? "granel" : `${r.quantity} un`} · {fmtKg(r.weight, 3)}
                    </p>
                    <p className="text-muted-foreground">{fmtBrl(r.value)}</p>
                  </div>
                )}
              </div>
            ))}
            {rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item nesta compra.</p>}
          </div>
        </div>

        <div className="border-t p-4 space-y-2">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span>
              <strong>Marcadas (aptas):</strong> {totalsOk.qty} un · {fmtKg(totalsOk.weight, 3)} ·{" "}
              {fmtBrl(totalsOk.value)}
            </span>
            <span className="text-muted-foreground">
              Não marcadas: {totalsOut.qty} un · {fmtKg(totalsOut.weight, 3)} · {fmtBrl(totalsOut.value)}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button variant="outline" disabled={busy} onClick={() => handleSave(false)}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar parcial
            </Button>
            <Button disabled={busy} onClick={() => handleSave(true)}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Concluir conferência
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
