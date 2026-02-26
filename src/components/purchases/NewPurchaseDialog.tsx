import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Send, Calculator } from "lucide-react";
import { loadSuppliers, Supplier } from "@/lib/suppliers";
import { createPurchase, updatePurchase, Purchase, PurchaseQuoteItem, PurchaseItemType } from "@/lib/purchases";
import { calculate, CalculatorInput, CalculatorResult } from "@/lib/calculator";
import { loadSettings } from "@/lib/settings";
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
  // simple mode
  quantity?: number;
  totalValue?: number;
  weight?: number;
  // calculator mode
  calcInput?: CalculatorInput;
  calcResult?: CalculatorResult;
}

export default function NewPurchaseDialog({ open, onOpenChange, onCreated, editPurchase }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void; editPurchase?: Purchase | null }) {
  const isEditing = !!editPurchase;
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PendingItem[]>([]);
  const [addType, setAddType] = useState<PurchaseItemType>("peca");
  const { toast } = useToast();

  // Simple fields
  const [addQty, setAddQty] = useState<number>(0);
  const [addValue, setAddValue] = useState<number>(0);
  const [addWeight, setAddWeight] = useState<number>(0);

  // Calculator fields
  const [grossWeight, setGrossWeight] = useState<number>(0);
  const [tare, setTare] = useState<number>(0);
  const [ptPpm, setPtPpm] = useState<number>(0);
  const [pdPpm, setPdPpm] = useState<number>(0);
  const [rhPpm, setRhPpm] = useState<number>(0);

  // Peça em sacola: toggle between simple and calculator mode
  const [sacolaUseCalc, setSacolaUseCalc] = useState(false);

  // Preview of calculation
  const [calcPreview, setCalcPreview] = useState<CalculatorResult | null>(null);

  useEffect(() => {
    if (open) {
      setSuppliers(loadSuppliers());
      if (editPurchase) {
        setSupplierId(editPurchase.supplierId);
        setNotes(editPurchase.notes);
        setItems(editPurchase.items.map(i => ({
          id: i.id,
          itemType: i.itemType,
          quantity: i.quantity,
          totalValue: i.totalValue,
          calcInput: i.input,
          calcResult: i.result,
        })));
      } else {
        setSupplierId("");
        setNotes("");
        setItems([]);
      }
      resetAddFields();
    }
  }, [open]);

  const resetAddFields = () => {
    setAddQty(0);
    setAddValue(0);
    setAddWeight(0);
    setGrossWeight(0);
    setTare(0);
    setPtPpm(0);
    setPdPpm(0);
    setRhPpm(0);
    setSacolaUseCalc(false);
    setCalcPreview(null);
  };

  const selectedSupplier = suppliers.find(s => s.id === supplierId);

  const runCalcPreview = () => {
    if (grossWeight <= 0) return;
    const settings = loadSettings();
    const margin = selectedSupplier?.margin ?? 0;
    const input: CalculatorInput = {
      grossWeight,
      tare,
      materialType: "comum",
      ptPpm,
      pdPpm,
      rhPpm,
      clientDiscount: margin,
      entryType: addType === "ceramico" ? "grupo" : "peca_sacola",
      manualPrice: null,
      customPt: null,
      customPd: null,
      customRh: null,
    };
    const result = calculate(input, settings);
    setCalcPreview(result);
  };

  // Run preview when calc fields change
  useEffect(() => {
    if ((addType === "ceramico" || (addType === "peca_sacola" && sacolaUseCalc)) && grossWeight > 0) {
      runCalcPreview();
    } else {
      setCalcPreview(null);
    }
  }, [grossWeight, tare, ptPpm, pdPpm, rhPpm, addType, sacolaUseCalc, supplierId]);

  const addItem = () => {
    const useCalc = addType === "ceramico" || (addType === "peca_sacola" && sacolaUseCalc);

    if (useCalc) {
      if (!calcPreview || grossWeight <= 0) {
        toast({ title: "Preencha os campos da calculadora", variant: "destructive" });
        return;
      }
      const settings = loadSettings();
      const margin = selectedSupplier?.margin ?? 0;
      const input: CalculatorInput = {
        grossWeight,
        tare,
        materialType: "comum",
        ptPpm,
        pdPpm,
        rhPpm,
        clientDiscount: margin,
        entryType: addType === "ceramico" ? "grupo" : "peca_sacola",
        manualPrice: null,
        customPt: null,
        customPd: null,
        customRh: null,
      };
      const result = calculate(input, settings);
      setItems(prev => [
        ...prev,
        { id: crypto.randomUUID(), itemType: addType, calcInput: input, calcResult: result },
      ]);
    } else if (addType === "peca") {
      if (addQty <= 0 || addValue <= 0) return;
      setItems(prev => [
        ...prev,
        { id: crypto.randomUUID(), itemType: "peca", quantity: addQty, totalValue: addValue },
      ]);
    } else if (addType === "peca_sacola" && !sacolaUseCalc) {
      if (addQty <= 0 || addValue <= 0) return;
      setItems(prev => [
        ...prev,
        { id: crypto.randomUUID(), itemType: "peca_sacola", quantity: addQty, weight: addWeight, totalValue: addValue },
      ]);
    }

    resetAddFields();
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const total = items.reduce((s, i) => {
    if (i.calcResult) return s + i.calcResult.finalValueBrl;
    return s + (i.totalValue || 0);
  }, 0);

  const handleConfirm = () => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier || items.length === 0) return;

    const purchaseItems: PurchaseQuoteItem[] = items.map(i => ({
      id: i.id,
      itemType: i.itemType,
      quantity: i.quantity,
      totalValue: i.totalValue,
      input: i.calcInput,
      result: i.calcResult,
    }));

    if (isEditing) {
      updatePurchase(editPurchase!.id, { items: purchaseItems, notes });
      toast({ title: "Compra atualizada com sucesso!" });
    } else {
      createPurchase({
        supplierId: supplier.id,
        supplierName: supplier.name,
        items: purchaseItems,
        notes,
      });
      toast({ title: "Compra criada com sucesso!" });
    }

    onOpenChange(false);
    onCreated();
  };

  const showSimpleFields = addType === "peca" || (addType === "peca_sacola" && !sacolaUseCalc);
  const showCalcFields = addType === "ceramico" || (addType === "peca_sacola" && sacolaUseCalc);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Compra" : "Nova Compra"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Supplier */}
          <div className="space-y-1">
            <Label className="text-xs">Fornecedor *</Label>
            <Select value={supplierId} onValueChange={setSupplierId} disabled={isEditing}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecionar fornecedor" /></SelectTrigger>
              <SelectContent>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {suppliers.length === 0 && (
              <p className="text-[10px] text-destructive">Cadastre um fornecedor primeiro.</p>
            )}
            {selectedSupplier && (
              <p className="text-[10px] text-muted-foreground">Margem do fornecedor: {selectedSupplier.margin}%</p>
            )}
          </div>

          {/* Add item */}
          <div className="space-y-3 p-3 rounded-md border bg-muted/30">
            <Label className="text-xs font-semibold">Adicionar Item</Label>

            <Select value={addType} onValueChange={(v) => { setAddType(v as PurchaseItemType); resetAddFields(); }}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="peca">Peça</SelectItem>
                <SelectItem value="peca_sacola">Peça em Sacola</SelectItem>
                <SelectItem value="ceramico">Cerâmico</SelectItem>
              </SelectContent>
            </Select>

            {/* Peça em sacola: toggle */}
            {addType === "peca_sacola" && (
              <div className="flex items-center gap-2">
                <Switch checked={sacolaUseCalc} onCheckedChange={setSacolaUseCalc} />
                <Label className="text-xs flex items-center gap-1">
                  <Calculator className="h-3 w-3" />
                  Usar calculadora (PPMs)
                </Label>
              </div>
            )}

            {/* Simple fields: Peça or Peça em sacola (simple mode) */}
            {showSimpleFields && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">Quantidade de peças</Label>
                  <Input type="number" min={0} value={addQty || ""} onChange={e => setAddQty(parseInt(e.target.value) || 0)} className="h-8 text-sm" />
                </div>
                {addType === "peca_sacola" && (
                  <div className="space-y-1">
                    <Label className="text-[10px]">Peso (kg)</Label>
                    <Input type="number" min={0} step="any" value={addWeight || ""} onChange={e => setAddWeight(parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-[10px]">Valor total (R$)</Label>
                  <Input type="number" min={0} step="any" value={addValue || ""} onChange={e => setAddValue(parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                </div>
              </div>
            )}

            {/* Calculator fields: Cerâmico or Peça em sacola (calc mode) */}
            {showCalcFields && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Peso Bruto (kg)</Label>
                    <Input type="number" min={0} step="any" value={grossWeight || ""} onChange={e => setGrossWeight(parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Tara (kg)</Label>
                    <Input type="number" min={0} step="any" value={tare || ""} onChange={e => setTare(parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Pt (ppm)</Label>
                    <Input type="number" min={0} step="any" value={ptPpm || ""} onChange={e => setPtPpm(parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Pd (ppm)</Label>
                    <Input type="number" min={0} step="any" value={pdPpm || ""} onChange={e => setPdPpm(parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Rh (ppm)</Label>
                    <Input type="number" min={0} step="any" value={rhPpm || ""} onChange={e => setRhPpm(parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                  </div>
                </div>

                {/* Calc preview */}
                {calcPreview && (
                  <div className="rounded-md bg-background border p-2 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Peso líquido</span>
                      <span>{calcPreview.netWeightKg.toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor bruto USD</span>
                      <span>$ {calcPreview.grossMetalValueUsd.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deduções USD</span>
                      <span className="text-destructive">- $ {calcPreview.totalDeductions.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1">
                      <span>Valor Final</span>
                      <span className="text-primary">{fmtBrl(calcPreview.finalValueBrl)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button size="sm" variant="outline" className="h-7 text-xs w-full" onClick={addItem}>
              <Plus className="mr-1 h-3 w-3" />Adicionar
            </Button>
          </div>

          {/* Items list */}
          {items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs text-right">Detalhe</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                  <TableHead className="text-xs w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(it => (
                  <TableRow key={it.id}>
                    <TableCell className="text-xs">{itemTypeLabels[it.itemType]}</TableCell>
                    <TableCell className="text-xs text-right">
                      {it.calcResult
                        ? `${it.calcInput?.grossWeight?.toFixed(1)} kg`
                        : `${it.quantity} pç`}
                    </TableCell>
                    <TableCell className="text-xs text-right font-semibold">
                      {fmtBrl(it.calcResult ? it.calcResult.finalValueBrl : (it.totalValue || 0))}
                    </TableCell>
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
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="text-sm" rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!supplierId || items.length === 0}>
            <Send className="mr-1 h-3 w-3" />{isEditing ? "Salvar" : "Criar Compra"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
