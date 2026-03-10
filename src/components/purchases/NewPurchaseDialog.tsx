import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, Send, Calculator, AlertTriangle, Package, CheckCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { loadSuppliers, Supplier } from "@/lib/suppliers";
import { createPurchase, updatePurchase, Purchase, PurchaseQuoteItem, PurchaseItemType } from "@/lib/purchases";
import { calculate, CalculatorInput, CalculatorResult } from "@/lib/calculator";
import { loadSettings } from "@/lib/settings";
import { useToast } from "@/hooks/use-toast";
import { fmtNum, fmtBrl, parseNum } from "@/lib/utils";

const numFilter = (v: string) => v.replace(/[^0-9.,]/g, "");

const itemTypeLabels: Record<PurchaseItemType, string> = {
  peca: "Peça",
  peca_sacola: "Peça em Sacola",
  ceramico: "Cerâmico",
};

interface PendingItem {
  id: string;
  itemType: PurchaseItemType;
  quantity?: number;
  totalValue?: number;
  weight?: number;
  calcInput?: CalculatorInput;
  calcResult?: CalculatorResult;
  category?: string;
}

export default function NewPurchaseDialog({ open, onOpenChange, onCreated, editPurchase }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void; editPurchase?: Purchase | null }) {
  const isEditing = !!editPurchase;
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [erpNumber, setErpNumber] = useState("");
  const [items, setItems] = useState<PendingItem[]>([]);
  const [addType, setAddType] = useState<PurchaseItemType>("peca");
  const { toast } = useToast();

  // Bulk weight (Material a Classificar)
  const [bulkWeightStr, setBulkWeightStr] = useState("");

  // Simple fields
  const [addQtyStr, setAddQtyStr] = useState("");
  const [addValueStr, setAddValueStr] = useState("");
  const [addWeightStr, setAddWeightStr] = useState("");

  // Category field
  const [addCategory, setAddCategory] = useState("");

  // Calculator fields
  const [grossWeightStr, setGrossWeightStr] = useState("");
  const [tareStr, setTareStr] = useState("");
  const [ptPpmStr, setPtPpmStr] = useState("");
  const [pdPpmStr, setPdPpmStr] = useState("");
  const [rhPpmStr, setRhPpmStr] = useState("");

  // Peça em sacola: toggle between simple and calculator mode
  const [sacolaUseCalc, setSacolaUseCalc] = useState(false);

  // Preview of calculation
  const [calcPreview, setCalcPreview] = useState<CalculatorResult | null>(null);

  // Derived numeric values
  const bulkWeight = parseNum(bulkWeightStr);
  const addQty = parseInt(addQtyStr) || 0;
  const addValue = parseNum(addValueStr);
  const addWeight = parseNum(addWeightStr);
  const grossWeight = parseNum(grossWeightStr);
  const ptPpm = parseNum(ptPpmStr);
  const pdPpm = parseNum(pdPpmStr);
  const rhPpm = parseNum(rhPpmStr);

  useEffect(() => {
    if (open) {
      loadSuppliers().then(setSuppliers);
      if (editPurchase) {
        setSupplierId(editPurchase.supplierId);
        setNotes(editPurchase.notes);
        setErpNumber(editPurchase.erpNumber || "");
        setBulkWeightStr(editPurchase.bulkWeight ? String(editPurchase.bulkWeight) : "");
        setItems(editPurchase.items.map(i => ({
          id: i.id,
          itemType: i.itemType,
          quantity: i.quantity,
          totalValue: i.totalValue,
          weight: i.weight,
          calcInput: i.input,
          calcResult: i.result,
          category: i.category,
        })));
      } else {
        setSupplierId("");
        setNotes("");
        setErpNumber("");
        setBulkWeightStr("");
        setItems([]);
      }
      resetAddFields();
    }
  }, [open]);

  const resetAddFields = () => {
    setAddQtyStr("");
    setAddValueStr("");
    setAddWeightStr("");
    setAddCategory("");
    setGrossWeightStr("");
    setTareStr("");
    setPtPpmStr("");
    setPdPpmStr("");
    setRhPpmStr("");
    setSacolaUseCalc(false);
    setCalcPreview(null);
  };

  const selectedSupplier = suppliers.find(s => s.id === supplierId);

  // Bulk weight tracking
  const totalClassified = useMemo(() => {
    return items.reduce((s, item) => {
      if (item.calcInput) return s + item.calcInput.grossWeight;
      if (item.weight) return s + item.weight;
      return s;
    }, 0);
  }, [items]);

  const bulkRemaining = bulkWeight - totalClassified;
  const bulkProgress = bulkWeight > 0 ? Math.min((totalClassified / bulkWeight) * 100, 100) : 0;

  const runCalcPreview = async () => {
    if (grossWeight <= 0) return;
    const settings = await loadSettings();
    const margin = selectedSupplier?.margin ?? 0;
    const tare = parseNum(tareStr);
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

  useEffect(() => {
    if ((addType === "ceramico" || (addType === "peca_sacola" && sacolaUseCalc)) && grossWeight > 0) {
      runCalcPreview();
    } else {
      setCalcPreview(null);
    }
  }, [grossWeightStr, tareStr, ptPpmStr, pdPpmStr, rhPpmStr, addType, sacolaUseCalc, supplierId]);

  const addItem = async () => {
    const useCalc = addType === "ceramico" || (addType === "peca_sacola" && sacolaUseCalc);
    const category = addCategory.trim() || undefined;

    if (useCalc) {
      if (grossWeight <= 0) {
        toast({ title: "Preencha ao menos o peso bruto", variant: "destructive" });
        return;
      }
      const settings = await loadSettings();
      const margin = selectedSupplier?.margin ?? 0;
      const tare = parseNum(tareStr);
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
      const hasPpms = ptPpm > 0 || pdPpm > 0 || rhPpm > 0;
      const result = hasPpms ? calculate(input, settings) : undefined;
      setItems(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          itemType: addType,
          weight: grossWeight - tare,
          calcInput: input,
          calcResult: result,
          category,
        },
      ]);
    } else if (addType === "peca") {
      if (addQty <= 0) {
        toast({ title: "Informe a quantidade", variant: "destructive" });
        return;
      }
      setItems(prev => [
        ...prev,
        { id: crypto.randomUUID(), itemType: "peca", quantity: addQty, totalValue: addValue || undefined, category },
      ]);
    } else if (addType === "peca_sacola" && !sacolaUseCalc) {
      if (addQty <= 0) {
        toast({ title: "Informe a quantidade", variant: "destructive" });
        return;
      }
      setItems(prev => [
        ...prev,
        { id: crypto.randomUUID(), itemType: "peca_sacola", quantity: addQty, weight: addWeight || undefined, totalValue: addValue || undefined, category },
      ]);
    }

    resetAddFields();
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const total = items.reduce((s, i) => {
    if (i.calcResult) return s + i.calcResult.finalValueBrl;
    return s + (i.totalValue || 0);
  }, 0);

  const handleConfirm = async () => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier || items.length === 0) return;

    const purchaseItems: PurchaseQuoteItem[] = items.map(i => ({
      id: i.id,
      itemType: i.itemType,
      quantity: i.quantity,
      totalValue: i.totalValue,
      weight: i.weight,
      input: i.calcInput,
      result: i.calcResult,
      category: i.category,
    }));

    if (isEditing) {
      await updatePurchase(editPurchase!.id, { items: purchaseItems, notes, erpNumber, bulkWeight: bulkWeight || null });
      toast({ title: "Compra atualizada com sucesso!" });
    } else {
      await createPurchase({
        supplierId: supplier.id,
        supplierName: supplier.name,
        buyer: supplier.buyer || "",
        items: purchaseItems,
        notes,
        erpNumber,
        bulkWeight: bulkWeight || null,
      });
      toast({ title: "Compra criada com sucesso!" });
    }

    onOpenChange(false);
    onCreated();
  };

  const showSimpleFields = addType === "peca" || (addType === "peca_sacola" && !sacolaUseCalc);
  const showCalcFields = addType === "ceramico" || (addType === "peca_sacola" && sacolaUseCalc);

  const getItemValueDisplay = (it: PendingItem) => {
    const val = it.calcResult ? it.calcResult.finalValueBrl : (it.totalValue || 0);
    if (val > 0) return fmtBrl(val);
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300 text-[10px] inline-flex items-center gap-1 cursor-help">
              <AlertTriangle className="h-3 w-3" />Pendente
            </Badge>
          </TooltipTrigger>
          <TooltipContent><p>Falta análise/valor para este item</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

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

          {/* ERP Number */}
          <div className="space-y-1">
            <Label className="text-xs">Boleto Syge (opcional)</Label>
            <Input value={erpNumber} onChange={e => setErpNumber(e.target.value)} placeholder="Ex: OC-12345" className="h-8 text-sm" />
          </div>

          {/* Material a Classificar */}
          <div className="space-y-2 p-3 rounded-md border bg-muted/30">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <Package className="h-3 w-3" />
              Material a Classificar (opcional)
            </Label>
            <div className="space-y-1">
              <Label className="text-[10px]">Peso total recebido (kg)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={bulkWeightStr}
                onChange={e => setBulkWeightStr(numFilter(e.target.value))}
                className="h-8 text-sm"
                placeholder="0,0000"
              />
            </div>
            {bulkWeight > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Classificado: {fmtNum(totalClassified, 4)} kg</span>
                  <span className={`font-semibold ${bulkRemaining < 0 ? "text-destructive" : bulkRemaining === 0 ? "text-green-600" : "text-foreground"}`}>
                    Restante: {fmtNum(bulkRemaining, 4)} kg
                  </span>
                </div>
                <Progress value={bulkProgress} className="h-2" />
                {bulkRemaining === 0 && totalClassified > 0 && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-300 text-[10px] flex items-center gap-1 w-fit">
                    <CheckCircle2 className="h-3 w-3" />
                    Totalmente classificado
                  </Badge>
                )}
                {bulkRemaining < 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    Peso dos itens excede o material a classificar
                  </div>
                )}
              </div>
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

            {/* Category field */}
            <div className="space-y-1">
              <Label className="text-[10px]">Categoria</Label>
              <Input
                type="text"
                value={addCategory}
                onChange={e => setAddCategory(e.target.value)}
                className="h-8 text-sm"
                placeholder="Ex: Colmeia, Fundo, Pó fino..."
              />
            </div>

            {addType === "peca_sacola" && (
              <div className="flex items-center gap-2">
                <Switch checked={sacolaUseCalc} onCheckedChange={setSacolaUseCalc} />
                <Label className="text-xs flex items-center gap-1">
                  <Calculator className="h-3 w-3" />
                  Usar calculadora (PPMs)
                </Label>
              </div>
            )}

            {showSimpleFields && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">Quantidade de peças *</Label>
                  <Input type="text" inputMode="decimal" value={addQtyStr} onChange={e => setAddQtyStr(numFilter(e.target.value))} className="h-8 text-sm" />
                </div>
                {addType === "peca_sacola" && (
                  <div className="space-y-1">
                    <Label className="text-[10px]">Peso (kg)</Label>
                    <Input type="text" inputMode="decimal" value={addWeightStr} onChange={e => setAddWeightStr(numFilter(e.target.value))} className="h-8 text-sm" placeholder="0,0000" />
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-[10px]">Valor total (R$)</Label>
                  <Input type="text" inputMode="decimal" value={addValueStr} onChange={e => setAddValueStr(numFilter(e.target.value))} className="h-8 text-sm" placeholder="Opcional" />
                </div>
              </div>
            )}

            {showCalcFields && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Peso Bruto (kg) *</Label>
                    <Input type="text" inputMode="decimal" value={grossWeightStr} onChange={e => setGrossWeightStr(numFilter(e.target.value))} className="h-8 text-sm" placeholder="0,0000" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Tara (kg)</Label>
                    <Input type="text" inputMode="decimal" value={tareStr} onChange={e => setTareStr(numFilter(e.target.value))} className="h-8 text-sm" placeholder="0,0000" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Pt (ppm)</Label>
                    <Input type="text" inputMode="decimal" value={ptPpmStr} onChange={e => setPtPpmStr(numFilter(e.target.value))} className="h-8 text-sm" placeholder="Opcional" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Pd (ppm)</Label>
                    <Input type="text" inputMode="decimal" value={pdPpmStr} onChange={e => setPdPpmStr(numFilter(e.target.value))} className="h-8 text-sm" placeholder="Opcional" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Rh (ppm)</Label>
                    <Input type="text" inputMode="decimal" value={rhPpmStr} onChange={e => setRhPpmStr(numFilter(e.target.value))} className="h-8 text-sm" placeholder="Opcional" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">PPMs podem ser preenchidos depois (na edição da compra, após análise).</p>

                {calcPreview && (
                  <div className="rounded-md bg-background border p-2 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Peso líquido</span>
                      <span>{fmtNum(calcPreview.netWeightKg, 4)} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor bruto USD</span>
                      <span>$ {fmtNum(calcPreview.grossMetalValueUsd, 2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deduções USD</span>
                      <span className="text-destructive">- $ {fmtNum(calcPreview.totalDeductions, 2)}</span>
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
                  <TableHead className="text-xs">Categoria</TableHead>
                  <TableHead className="text-xs text-right">Detalhe</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                  <TableHead className="text-xs w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(it => (
                  <TableRow key={it.id}>
                    <TableCell className="text-xs">{itemTypeLabels[it.itemType]}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{it.category || "—"}</TableCell>
                    <TableCell className="text-xs text-right">
                      {it.calcResult || it.calcInput
                        ? `${fmtNum(it.weight ?? it.calcInput?.grossWeight ?? 0, 4)} kg`
                        : it.itemType === "peca_sacola"
                          ? `${it.quantity} pç${it.weight ? ` / ${fmtNum(it.weight, 4)} kg` : ""}`
                          : `${it.quantity} pç`}
                    </TableCell>
                    <TableCell className="text-xs text-right font-semibold">
                      {getItemValueDisplay(it)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(it.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={3} className="text-xs font-semibold text-right">Total</TableCell>
                  <TableCell className={`text-xs text-right font-bold ${items.some(i => !i.calcResult && !i.totalValue) ? "text-destructive" : "text-primary"}`}>
                    {total > 0 ? fmtBrl(total) : "Pendente"}
                  </TableCell>
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
