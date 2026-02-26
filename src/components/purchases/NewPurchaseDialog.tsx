import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Send } from "lucide-react";
import { loadSuppliers, Supplier } from "@/lib/suppliers";
import { createPurchase, PurchaseQuoteItem, PurchaseItemType } from "@/lib/purchases";
import { useToast } from "@/hooks/use-toast";

const fmtBrl = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const itemTypeLabels: Record<PurchaseItemType, string> = {
  peca: "Peça",
  peca_sacola: "Peça em Sacola",
  ceramico: "Cerâmico",
};

interface PendingItem {
  id: string;
  itemType: PurchaseItemType;
  quantity: number;
  totalValue: number;
}

export default function NewPurchaseDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PendingItem[]>([]);
  const [addType, setAddType] = useState<PurchaseItemType>("peca");
  const [addQty, setAddQty] = useState<number>(0);
  const [addValue, setAddValue] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setSuppliers(loadSuppliers());
      setSupplierId("");
      setNotes("");
      setItems([]);
    }
  }, [open]);

  const addItem = () => {
    if (addType === "ceramico") {
      toast({ title: "Use a Calculadora", description: "Para cerâmico, use a calculadora e envie para compras de lá.", variant: "destructive" });
      return;
    }
    if (addQty <= 0 || addValue <= 0) return;
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), itemType: addType, quantity: addQty, totalValue: addValue },
    ]);
    setAddQty(0);
    setAddValue(0);
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const total = items.reduce((s, i) => s + i.totalValue, 0);

  const handleConfirm = () => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier || items.length === 0) return;

    const purchaseItems: PurchaseQuoteItem[] = items.map((i) => ({
      id: i.id,
      itemType: i.itemType,
      quantity: i.quantity,
      totalValue: i.totalValue,
    }));

    createPurchase({
      supplierId: supplier.id,
      supplierName: supplier.name,
      items: purchaseItems,
      notes,
    });

    toast({ title: "Compra criada com sucesso!" });
    onOpenChange(false);
    onCreated();
  };

  const showSimpleFields = addType === "peca" || addType === "peca_sacola";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Nova Compra</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Supplier */}
          <div className="space-y-1">
            <Label className="text-xs">Fornecedor *</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecionar fornecedor" /></SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {suppliers.length === 0 && (
              <p className="text-[10px] text-destructive">Cadastre um fornecedor primeiro.</p>
            )}
          </div>

          {/* Add item */}
          <div className="space-y-2 p-3 rounded-md border bg-muted/30">
            <Label className="text-xs font-semibold">Adicionar Item</Label>
            <div className="space-y-2">
              <Select value={addType} onValueChange={(v) => setAddType(v as PurchaseItemType)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="peca">Peça</SelectItem>
                  <SelectItem value="peca_sacola">Peça em Sacola</SelectItem>
                  <SelectItem value="ceramico">Cerâmico</SelectItem>
                </SelectContent>
              </Select>

              {showSimpleFields && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Quantidade de peças</Label>
                    <Input type="number" min={0} value={addQty || ""} onChange={(e) => setAddQty(parseInt(e.target.value) || 0)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Valor total (R$)</Label>
                    <Input type="number" min={0} step="any" value={addValue || ""} onChange={(e) => setAddValue(parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                  </div>
                </div>
              )}

              {addType === "ceramico" && (
                <p className="text-xs text-muted-foreground">Para cerâmico, utilize a Calculadora e envie para Compras de lá.</p>
              )}

              <Button size="sm" variant="outline" className="h-7 text-xs w-full" onClick={addItem} disabled={addType === "ceramico"}>
                <Plus className="mr-1 h-3 w-3" />Adicionar
              </Button>
            </div>
          </div>

          {/* Items list */}
          {items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs text-right">Qtd</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                  <TableHead className="text-xs w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="text-xs">{itemTypeLabels[it.itemType]}</TableCell>
                    <TableCell className="text-xs text-right">{it.quantity}</TableCell>
                    <TableCell className="text-xs text-right font-semibold">{fmtBrl(it.totalValue)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(it.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={2} className="text-xs font-semibold text-right">Total</TableCell>
                  <TableCell className="text-xs text-right font-bold text-primary">{fmtBrl(total)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          )}

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs">Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="text-sm" rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!supplierId || items.length === 0}>
            <Send className="mr-1 h-3 w-3" />Criar Compra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
