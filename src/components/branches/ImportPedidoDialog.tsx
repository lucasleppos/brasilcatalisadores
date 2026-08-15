import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Loader2, Trash2, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { parsePedidoPdf, ParsedPedido, ParsedPedidoItem } from "@/lib/pedido-pdf-import";
import { Branch } from "@/lib/branches";
import { createPurchase, PurchaseQuoteItem } from "@/lib/purchases";
import { loadSuppliers, addSupplier } from "@/lib/suppliers";
import { fmtBrl, fmtKg, fmtNum } from "@/lib/utils";
import PartSearch from "@/components/catalog/PartSearch";
import { CatalogPart } from "@/lib/catalog";
import { useAuth } from "@/contexts/AuthContext";

type RemovalReason = "faltou" | "quebrado" | "codigo_errado";

const REASON_LABELS: Record<RemovalReason, string> = {
  faltou: "Faltou",
  quebrado: "Quebrado",
  codigo_errado: "Código errado",
};

interface ReviewItem extends ParsedPedidoItem {
  key: string;
  confirmed: boolean;
  removalReason: RemovalReason | null;
  extra?: boolean;
  catalogPartId?: string;
  bulk?: boolean;
  bulkMaterial?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branches: Branch[];
  onCreated: () => void;
}

let keySeq = 0;
const nextKey = () => `it-${++keySeq}`;

export default function ImportPedidoDialog({ open, onOpenChange, branches, onCreated }: Props) {
  const { profile } = useAuth();
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pedidos, setPedidos] = useState<ParsedPedido[]>([]);
  const [current, setCurrent] = useState(0);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [branchId, setBranchId] = useState("");

  const reset = () => {
    setPedidos([]);
    setItems([]);
    setCurrent(0);
    setBranchId("");
  };

  const loadPedido = (list: ParsedPedido[], idx: number) => {
    setCurrent(idx);
    setItems(
      (list[idx]?.items || []).map((i) => ({
        ...i,
        key: nextKey(),
        confirmed: true,
        removalReason: null,
      }))
    );
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setParsing(true);
    try {
      const parsed = await parsePedidoPdf(file);
      if (parsed.length === 0) {
        toast({
          title: "Não foi possível ler o pedido",
          description: "O PDF pode estar escaneado (sem texto). Use o arquivo original gerado pelo sistema.",
          variant: "destructive",
        });
        return;
      }
      setPedidos(parsed);
      loadPedido(parsed, 0);
      toast({
        title: `${parsed.length} pedido(s) detectado(s)`,
        description: `${parsed[0].items.length} itens lidos no primeiro pedido.`,
      });
    } catch (e: any) {
      toast({ title: "Erro ao ler o PDF", description: e?.message || "Falha na leitura", variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const pedido = pedidos[current];
  const confirmed = items.filter((i) => i.confirmed);
  const totalWeight = confirmed.reduce((a, i) => a + i.unitWeightKg * i.quantity, 0);
  const totalValue = confirmed.reduce((a, i) => a + i.unitValueBrl * i.quantity, 0);
  const totalQty = confirmed.reduce((a, i) => a + i.quantity, 0);

  const update = (key: string, patch: Partial<ReviewItem>) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const addExtraFromCatalog = (part: CatalogPart) => {
    setItems((prev) => [
      ...prev,
      {
        key: nextKey(),
        code: part.code,
        reference: part.reference,
        vehicleModel: `${part.brand} - ${part.vehicle}`,
        quantity: 1,
        unitValueBrl: 0,
        unitWeightKg: Number(part.weight) || 0,
        confirmed: true,
        removalReason: null,
        extra: true,
        catalogPartId: part.id,
      },
    ]);
  };

  const addBulkItem = () => {
    setItems((prev) => [
      ...prev,
      {
        key: nextKey(),
        code: "",
        reference: "",
        vehicleModel: "",
        quantity: 1,
        unitValueBrl: 0,
        unitWeightKg: 0,
        confirmed: true,
        removalReason: null,
        extra: true,
        bulk: true,
        bulkMaterial: "Cerâmico solto",
      },
    ]);
  };

  const handleConfirm = async () => {
    if (!pedido) return;
    if (!branchId) {
      toast({ title: "Selecione a filial", variant: "destructive" });
      return;
    }
    if (confirmed.length === 0) {
      toast({ title: "Nenhum item confirmado", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // 1. Casar/criar fornecedor por CPF/CNPJ
      const suppliers = await loadSuppliers();
      const doc = pedido.supplierDocument;
      let supplier = suppliers.find((s) => (s.document || "").replace(/\D/g, "") === doc && doc.length > 0);
      const branch = branches.find((b) => b.id === branchId);
      if (!supplier) {
        supplier = await addSupplier({
          name: pedido.supplierName || `Fornecedor ${doc || pedido.pedidoNumber}`,
          document: doc,
          email: "",
          branch: branch?.name || "",
          buyer: profile?.full_name || "",
          margin: 15,
          marginPecas: 15,
          marginCeramico: 15,
        } as any);
      }
      if (!supplier) {
        toast({ title: "Erro ao cadastrar fornecedor", variant: "destructive" });
        return;
      }

      // 2. Montar itens da compra (uma linha por unidade, como no fluxo de peças)
      const purchaseItems = confirmed.flatMap<PurchaseQuoteItem>((i) => {
        if (i.bulk) {
          return [{
            id: crypto.randomUUID(),
            itemType: "ceramico",
            weight: i.unitWeightKg * i.quantity,
            totalValue: i.unitValueBrl * i.quantity,
          }];
        }
        return Array.from({ length: i.quantity }).map(() => ({
          id: crypto.randomUUID(),
          itemType: "peca" as const,
          quantity: 1,
          weight: i.unitWeightKg,
          totalValue: i.unitValueBrl,
          catalogPartId: i.catalogPartId,
        }));
      });

      const created = await createPurchase({
        supplierId: supplier.id,
        supplierName: supplier.name,
        buyer: supplier.buyer || profile?.full_name || "",
        items: purchaseItems as any,
        notes: [
          `Importado do pedido ${pedido.pedidoNumber} (${branch?.name || ""})`,
          ...items.filter((i) => !i.confirmed).map((i) => `Removido: ${i.code || "s/código"} — ${i.removalReason ? REASON_LABELS[i.removalReason] : "sem motivo"}`),
        ].join("\n"),
        branchId,
        weightDeclared: totalWeight,
        declaredValueBrl: totalValue,
        sourcePedidoNumber: pedido.pedidoNumber,
      });

      if (!created) {
        toast({ title: "Erro ao criar a compra", variant: "destructive" });
        return;
      }

      toast({
        title: `Compra ${created.purchaseNumber} criada`,
        description: `${totalQty} un · ${fmtKg(totalWeight, 3)} · ${fmtBrl(totalValue)} — aguardando transferência.`,
      });

      // Se o arquivo tinha mais pedidos, segue para o próximo
      if (current + 1 < pedidos.length) {
        loadPedido(pedidos, current + 1);
        toast({ title: `Próximo pedido: ${pedidos[current + 1].pedidoNumber}` });
      } else {
        reset();
        onOpenChange(false);
      }
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-5xl max-h-[95vh] h-[95vh] sm:h-auto flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Importar pedido (PDF)</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!pedido && (
            <Card>
              <CardContent className="p-6 space-y-3">
                <Label htmlFor="pedido-pdf">Arquivo PDF do pedido</Label>
                <Input
                  id="pedido-pdf"
                  type="file"
                  accept="application/pdf"
                  disabled={parsing}
                  onChange={(e) => handleFile(e.target.files?.[0] || null)}
                />
                <p className="text-sm text-muted-foreground">
                  O arquivo pode conter mais de um pedido — cada um vira uma compra separada.
                </p>
                {parsing && (
                  <p className="text-sm flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Lendo o PDF...
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {pedido && (
            <>
              <Card>
                <CardContent className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Pedido</Label>
                    <p className="font-semibold">{pedido.pedidoNumber || "—"}</p>
                    {pedidos.length > 1 && (
                      <Badge variant="secondary" className="mt-1">
                        {current + 1} de {pedidos.length}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fornecedor</Label>
                    <p className="font-medium">{pedido.supplierName || "—"}</p>
                    <p className="text-xs text-muted-foreground">{pedido.supplierDocument || "sem CPF"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data</Label>
                    <p className="font-medium">{pedido.orderDate || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Filial</Label>
                    <Select value={branchId} onValueChange={setBranchId}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {branches.filter((b) => b.active).map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {(pedido.footerWeightKg != null && Math.abs(pedido.footerWeightKg - pedido.totalWeightKg) > 0.01) && (
                <p className="text-sm text-amber-600">
                  Atenção: peso somado dos itens ({fmtKg(pedido.totalWeightKg, 3)}) difere do total impresso no PDF ({fmtKg(pedido.footerWeightKg, 3)}). Confira os itens antes de criar a compra.
                </p>
              )}

              {(pedido.footerValueBrl != null && Math.abs(pedido.footerValueBrl - pedido.totalValueBrl) > 0.05) && (
                <p className="text-sm text-amber-600">
                  Atenção: valor somado dos itens ({fmtBrl(pedido.totalValueBrl)}) difere do total impresso no PDF ({fmtBrl(pedido.footerValueBrl)}). Confira os itens antes de criar a compra.
                </p>
              )}


              {/* Desktop */}
              <div className="hidden md:block border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">OK</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Referência</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead className="w-20">Qtd (un)</TableHead>
                      <TableHead className="w-28">Peso un. (kg)</TableHead>
                      <TableHead className="w-28">Valor un.</TableHead>
                      <TableHead className="w-40">Motivo (se removido)</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((i) => (
                      <TableRow key={i.key} className={i.confirmed ? "" : "opacity-50"}>
                        <TableCell>
                          <Checkbox
                            checked={i.confirmed}
                            onCheckedChange={(v) => update(i.key, { confirmed: !!v, removalReason: v ? null : i.removalReason })}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {i.bulk ? (
                            <Input
                              value={i.bulkMaterial || ""}
                              onChange={(e) => update(i.key, { bulkMaterial: e.target.value })}
                              className="h-8"
                            />
                          ) : (
                            i.code || "—"
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{i.bulk ? "granel" : i.reference || "—"}</TableCell>
                        <TableCell className="text-xs">{i.vehicleModel || "—"}</TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={i.quantity}
                            onChange={(e) => update(i.key, { quantity: parseInt(e.target.value.replace(/\D/g, ""), 10) || 0 })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={fmtNum(i.unitWeightKg, 3)}
                            onChange={(e) => update(i.key, { unitWeightKg: parseFloat(e.target.value.replace(/\./g, "").replace(",", ".")) || 0 })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={fmtNum(i.unitValueBrl, 2)}
                            onChange={(e) => update(i.key, { unitValueBrl: parseFloat(e.target.value.replace(/\./g, "").replace(",", ".")) || 0 })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          {!i.confirmed && (
                            <Select
                              value={i.removalReason || ""}
                              onValueChange={(v) => update(i.key, { removalReason: v as RemovalReason })}
                            >
                              <SelectTrigger className="h-8"><SelectValue placeholder="Motivo" /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(REASON_LABELS).map(([k, l]) => (
                                  <SelectItem key={k} value={k}>{l}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {i.extra && <Badge variant="secondary">Extra</Badge>}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setItems((p) => p.filter((x) => x.key !== i.key))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile */}
              <div className="md:hidden space-y-2">
                {items.map((i) => (
                  <Card key={i.key} className={i.confirmed ? "" : "opacity-60"}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={i.confirmed}
                            onCheckedChange={(v) => update(i.key, { confirmed: !!v, removalReason: v ? null : i.removalReason })}
                          />
                          <span className="font-mono text-xs">{i.bulk ? i.bulkMaterial : i.code || "—"}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setItems((p) => p.filter((x) => x.key !== i.key))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">{i.vehicleModel || i.reference}</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Qtd</Label>
                          <Input
                            inputMode="numeric"
                            value={i.quantity}
                            onChange={(e) => update(i.key, { quantity: parseInt(e.target.value.replace(/\D/g, ""), 10) || 0 })}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Peso un.</Label>
                          <Input
                            inputMode="decimal"
                            value={fmtNum(i.unitWeightKg, 3)}
                            onChange={(e) => update(i.key, { unitWeightKg: parseFloat(e.target.value.replace(/\./g, "").replace(",", ".")) || 0 })}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Valor un.</Label>
                          <Input
                            inputMode="decimal"
                            value={fmtNum(i.unitValueBrl, 2)}
                            onChange={(e) => update(i.key, { unitValueBrl: parseFloat(e.target.value.replace(/\./g, "").replace(",", ".")) || 0 })}
                            className="h-8"
                          />
                        </div>
                      </div>
                      {!i.confirmed && (
                        <Select value={i.removalReason || ""} onValueChange={(v) => update(i.key, { removalReason: v as RemovalReason })}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="Motivo da remoção" /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(REASON_LABELS).map(([k, l]) => (
                              <SelectItem key={k} value={k}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <Label>Adicionar peça extra (catálogo)</Label>
                  <PartSearch onSelect={addExtraFromCatalog} />
                  <Button variant="outline" size="sm" onClick={addBulkItem}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar material solto / granel
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {pedido && (
          <DialogFooter className="p-4 border-t flex-col sm:flex-row gap-2 sm:justify-between">
            <div className="text-sm">
              <span className="font-semibold">{totalQty} un</span> confirmados ·{" "}
              <span className="font-semibold">{fmtKg(totalWeight, 3)}</span> ·{" "}
              <span className="font-semibold">{fmtBrl(totalValue)}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Confirmar conferência e criar compra
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
