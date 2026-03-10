import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { loadSettings } from "@/lib/settings";
import {
  calculate,
  CalculatorInput,
  CalculatorResult,
  EntryType,
  MaterialType,
  loadHistory,
  saveToHistory,
  SimulationRecord,
} from "@/lib/calculator";
import { Calculator, Trash2, Clock, Save, Plus, X, Send } from "lucide-react";
import CalculationDetails from "@/components/calculator/CalculationDetails";
import QuoteList, { QuoteItem } from "@/components/calculator/QuoteList";
import { loadSuppliers, Supplier } from "@/lib/suppliers";
import { createPurchase } from "@/lib/purchases";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { fmtNum, fmtBrl as fmtBrlUtil, parseNum } from "@/lib/utils";

const fmt = (n: number, decimals = 5) => fmtNum(n, decimals);
const fmtUsd = (n: number) => `$ ${fmt(n, 5)}`;
const fmtBrl = (n: number) => fmtBrlUtil(n);

const numFilter = (v: string) => v.replace(/[^0-9.,]/g, "");

export default function CalculatorPage() {
  // All numeric inputs as strings
  const [grossWeightStr, setGrossWeightStr] = useState("");
  const [tareStr, setTareStr] = useState("");
  const [ptPpmStr, setPtPpmStr] = useState("");
  const [pdPpmStr, setPdPpmStr] = useState("");
  const [rhPpmStr, setRhPpmStr] = useState("");
  const [clientDiscountStr, setClientDiscountStr] = useState("15");
  const [manualPriceStr, setManualPriceStr] = useState("");
  const [customPtStr, setCustomPtStr] = useState("");
  const [customPdStr, setCustomPdStr] = useState("");
  const [customRhStr, setCustomRhStr] = useState("");

  const [entryType, setEntryType] = useState<EntryType>("grupo");
  const [materialType, setMaterialType] = useState<MaterialType>("comum");
  const [useCustomQuotes, setUseCustomQuotes] = useState(false);
  const [history, setHistory] = useState<SimulationRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [quoteList, setQuoteList] = useState<QuoteItem[]>([]);
  const [isAdmin] = useState(() => localStorage.getItem("catalisador-pro-admin") === "true");
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [settings, setSettings] = useState<import("@/lib/settings").Settings | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadHistory().then(setHistory);
    loadSuppliers().then(setSuppliers);
    loadSettings().then(setSettings);
  }, []);

  // Build CalculatorInput from string states
  const input: CalculatorInput = useMemo(() => ({
    grossWeight: parseNum(grossWeightStr),
    tare: parseNum(tareStr),
    materialType,
    ptPpm: parseNum(ptPpmStr),
    pdPpm: parseNum(pdPpmStr),
    rhPpm: parseNum(rhPpmStr),
    clientDiscount: parseNum(clientDiscountStr),
    entryType,
    manualPrice: manualPriceStr ? parseNum(manualPriceStr) : null,
    customPt: useCustomQuotes ? parseNum(customPtStr) : null,
    customPd: useCustomQuotes ? parseNum(customPdStr) : null,
    customRh: useCustomQuotes ? parseNum(customRhStr) : null,
  }), [grossWeightStr, tareStr, materialType, ptPpmStr, pdPpmStr, rhPpmStr, clientDiscountStr, entryType, manualPriceStr, useCustomQuotes, customPtStr, customPdStr, customRhStr]);

  const showManualPrice = entryType === "peca_fechada" || entryType === "peca_sacola";

  const result: CalculatorResult | null = useMemo(() => {
    if (input.grossWeight <= 0 || !settings) return null;
    return calculate(input, settings);
  }, [input, settings]);

  const handleClear = () => {
    setGrossWeightStr(""); setTareStr(""); setPtPpmStr(""); setPdPpmStr(""); setRhPpmStr("");
    setClientDiscountStr("15"); setManualPriceStr("");
    setCustomPtStr(""); setCustomPdStr(""); setCustomRhStr("");
    setEntryType("grupo"); setMaterialType("comum");
    setUseCustomQuotes(false);
  };

  const handleSave = async () => {
    if (!result) return;
    await saveToHistory(input, result);
    loadHistory().then(setHistory);
  };

  const loadFromHistory = (record: SimulationRecord) => {
    const i = record.input;
    setGrossWeightStr(String(i.grossWeight || ""));
    setTareStr(String(i.tare || ""));
    setPtPpmStr(String(i.ptPpm || ""));
    setPdPpmStr(String(i.pdPpm || ""));
    setRhPpmStr(String(i.rhPpm || ""));
    setClientDiscountStr(String(i.clientDiscount || ""));
    setManualPriceStr(i.manualPrice != null ? String(i.manualPrice) : "");
    setEntryType(i.entryType);
    setMaterialType(i.materialType);
    setShowHistory(false);
    if (i.customPt !== null) {
      setUseCustomQuotes(true);
      setCustomPtStr(String(i.customPt || ""));
      setCustomPdStr(String(i.customPd || ""));
      setCustomRhStr(String(i.customRh || ""));
    }
  };

  const addToQuoteList = () => {
    if (!result) return;
    const item: QuoteItem = {
      id: crypto.randomUUID(),
      input: { ...input },
      result: { ...result },
    };
    setQuoteList((prev) => [...prev, item]);
  };

  const removeFromQuoteList = (id: string) => setQuoteList((prev) => prev.filter((q) => q.id !== id));

  const handleSendToPurchases = () => {
    if (quoteList.length === 0) return;
    setSendDialogOpen(true);
  };

  const confirmSendToPurchases = () => {
    const supplier = suppliers.find((s) => s.id === selectedSupplierId);
    if (!supplier) return;
    createPurchase({
      supplierId: supplier.id,
      supplierName: supplier.name,
      buyer: supplier.buyer || "",
      items: quoteList.map((q) => ({
        id: q.id,
        itemType: "ceramico" as const,
        input: q.input,
        result: q.result,
      })),
      notes: purchaseNotes,
    });
    setQuoteList([]);
    setSendDialogOpen(false);
    setSelectedSupplierId("");
    setPurchaseNotes("");
    toast({ title: "Compra criada com sucesso!", description: "Redirecionando para a página de compras..." });
    setTimeout(() => navigate("/compras"), 1000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calculator className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-display">Calculadora</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
            <Clock className="mr-1 h-3 w-3" />Histórico
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear}>
            <Trash2 className="mr-1 h-3 w-3" />Limpar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!result}>
            <Save className="mr-1 h-3 w-3" />Salvar
          </Button>
        </div>
      </div>

      {/* History panel */}
      {showHistory && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Últimas Simulações</CardTitle></CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma simulação salva.</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-auto">
                {history.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => loadFromHistory(h)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-muted text-sm flex justify-between items-center"
                  >
                    <span>{new Date(h.date).toLocaleString("pt-BR")} — {h.input.grossWeight}kg</span>
                    <span className="font-semibold text-primary">{fmtBrl(h.result.finalValueBrl)}</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Input form */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Entrada de Dados</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Entry type */}
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Entrada</Label>
                <Select value={entryType} onValueChange={(v) => setEntryType(v as EntryType)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="peca_fechada">Peça Fechada</SelectItem>
                    <SelectItem value="peca_sacola">Peça em Sacola</SelectItem>
                    <SelectItem value="grupo">Grupo (cerâmica a granel)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Manual price */}
              {showManualPrice && (
                <div className="space-y-1 p-3 rounded-md bg-muted/50 border border-primary/20">
                  <Label className="text-xs text-primary font-semibold">Preço Manual (Tabelado)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="R$ valor do app externo"
                    value={manualPriceStr}
                    onChange={(e) => setManualPriceStr(numFilter(e.target.value))}
                    className="h-8 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">Se preenchido, o cálculo automático fica como referência.</p>
                </div>
              )}

              {/* Material type */}
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Material</Label>
                <Select value={materialType} onValueChange={(v) => setMaterialType(v as MaterialType)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comum">Comum</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="super">Super</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Weights */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Peso Bruto (kg)</Label>
                  <Input type="text" inputMode="decimal" value={grossWeightStr} onChange={(e) => setGrossWeightStr(numFilter(e.target.value))} className="h-8 text-sm" placeholder="0,0000" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tara (kg)</Label>
                  <Input type="text" inputMode="decimal" value={tareStr} onChange={(e) => setTareStr(numFilter(e.target.value))} className="h-8 text-sm" placeholder="0,0000" />
                </div>
              </div>

              {/* Concentrations */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Pt (ppm)</Label>
                  <Input type="text" inputMode="decimal" value={ptPpmStr} onChange={(e) => setPtPpmStr(numFilter(e.target.value))} className="h-8 text-sm" placeholder="0,0000" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pd (ppm)</Label>
                  <Input type="text" inputMode="decimal" value={pdPpmStr} onChange={(e) => setPdPpmStr(numFilter(e.target.value))} className="h-8 text-sm" placeholder="0,0000" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Rh (ppm)</Label>
                  <Input type="text" inputMode="decimal" value={rhPpmStr} onChange={(e) => setRhPpmStr(numFilter(e.target.value))} className="h-8 text-sm" placeholder="0,0000" />
                </div>
              </div>

              {/* Client discount → Margem de Fornecedor */}
              <div className="space-y-1">
                <Label className="text-xs">Margem de Fornecedor (%)</Label>
                <Input type="text" inputMode="decimal" value={clientDiscountStr} onChange={(e) => setClientDiscountStr(numFilter(e.target.value))} className="h-8 text-sm" />
              </div>

              {isAdmin && (
                <>
                  <Separator />

                  {/* Custom quotes toggle - admin only */}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Cotações customizadas</Label>
                    <Switch checked={useCustomQuotes} onCheckedChange={(v) => {
                       setUseCustomQuotes(v);
                      if (!v) {
                        setCustomPtStr(""); setCustomPdStr(""); setCustomRhStr("");
                      } else {
                        setCustomPtStr(String(settings?.ptPrice ?? 0));
                        setCustomPdStr(String(settings?.pdPrice ?? 0));
                        setCustomRhStr(String(settings?.rhPrice ?? 0));
                      }
                    }} />
                  </div>

                  {useCustomQuotes && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Pt ($/ozt)</Label>
                        <Input type="text" inputMode="decimal" value={customPtStr} onChange={(e) => setCustomPtStr(numFilter(e.target.value))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Pd ($/ozt)</Label>
                        <Input type="text" inputMode="decimal" value={customPdStr} onChange={(e) => setCustomPdStr(numFilter(e.target.value))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Rh ($/ozt)</Label>
                        <Input type="text" inputMode="decimal" value={customRhStr} onChange={(e) => setCustomRhStr(numFilter(e.target.value))} className="h-8 text-sm" />
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-3 space-y-4">
          {result && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="pt-5 pb-5 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Valor Calculado</p>
                    <p className="text-3xl font-display font-bold text-primary">{fmtBrl(result.finalValueBrl)}</p>
                    <p className="text-sm text-muted-foreground mt-1">{fmtUsd(result.finalValueUsd)}</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={addToQuoteList}>
                      <Plus className="mr-1 h-3 w-3" />Adicionar à Lista
                    </Button>
                  </CardContent>
                </Card>

                {result.manualPrice !== null && (
                  <Card className="border-accent/30 bg-accent/5">
                    <CardContent className="pt-5 pb-5 text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Preço Tabelado</p>
                      <p className="text-3xl font-display font-bold text-accent">{fmtBrl(result.manualPrice)}</p>
                      <div className="mt-2">
                        {result.manualPrice > result.finalValueBrl ? (
                          <Badge variant="outline" className="text-destructive border-destructive/30">
                            Tabelado {fmt((result.manualPrice / result.finalValueBrl - 1) * 100, 1)}% acima
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-primary border-primary/30">
                            Tabelado {fmt((1 - result.manualPrice / result.finalValueBrl) * 100, 1)}% abaixo
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Calculation details - admin only */}
              <CalculationDetails result={result} />
            </>
          )}

          {!result && (
            <Card>
              <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
                <Calculator className="mx-auto h-10 w-10 opacity-40 mb-3" />
                <p>Preencha os dados para ver os resultados.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Quote list */}
      <QuoteList items={quoteList} onRemove={removeFromQuoteList} onSendToPurchases={handleSendToPurchases} />

      {/* Send to Purchases Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar para Compras</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Fornecedor *</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecionar fornecedor" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {suppliers.length === 0 && (
                <p className="text-[10px] text-destructive">Cadastre um fornecedor primeiro em Fornecedores.</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Observações</Label>
              <Textarea value={purchaseNotes} onChange={(e) => setPurchaseNotes(e.target.value)} className="text-sm" rows={3} />
            </div>
            <p className="text-xs text-muted-foreground">{quoteList.length} cotação(ões) serão enviadas.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>Cancelar</Button>
            <Button onClick={confirmSendToPurchases} disabled={!selectedSupplierId}>
              <Send className="mr-1 h-3 w-3" />Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
