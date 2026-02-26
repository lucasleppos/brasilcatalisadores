import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

const emptyInput: CalculatorInput = {
  grossWeight: 0,
  tare: 0,
  materialType: "comum",
  ptPpm: 0,
  pdPpm: 0,
  rhPpm: 0,
  clientDiscount: 15,
  entryType: "grupo",
  manualPrice: null,
  customPt: null,
  customPd: null,
  customRh: null,
};

const fmt = (n: number, decimals = 4) => n.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
const fmtUsd = (n: number) => `$ ${fmt(n, 4)}`;
const fmtBrl = (n: number) => `R$ ${fmt(n, 2)}`;

export default function CalculatorPage() {
  const [input, setInput] = useState<CalculatorInput>({ ...emptyInput });
  const [useCustomQuotes, setUseCustomQuotes] = useState(false);
  const [history, setHistory] = useState<SimulationRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [quoteList, setQuoteList] = useState<QuoteItem[]>([]);
  const [isAdmin] = useState(() => localStorage.getItem("catalisador-pro-admin") === "true");
  const settings = useMemo(() => loadSettings(), []);

  useEffect(() => { setHistory(loadHistory()); }, []);

  const update = <K extends keyof CalculatorInput>(key: K, value: CalculatorInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }));

  const showManualPrice = input.entryType === "peca_fechada" || input.entryType === "peca_sacola";

  const result: CalculatorResult | null = useMemo(() => {
    if (input.grossWeight <= 0) return null;
    return calculate(input, settings);
  }, [input, settings]);

  const handleClear = () => {
    setInput({ ...emptyInput });
    setUseCustomQuotes(false);
  };

  const handleSave = () => {
    if (!result) return;
    saveToHistory(input, result);
    setHistory(loadHistory());
  };

  const loadFromHistory = (record: SimulationRecord) => {
    setInput({ ...record.input });
    setShowHistory(false);
    if (record.input.customPt !== null) setUseCustomQuotes(true);
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

  const removeFromQuoteList = (id: string) => {
    setQuoteList((prev) => prev.filter((q) => q.id !== id));
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
                <Select value={input.entryType} onValueChange={(v) => update("entryType", v as EntryType)}>
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
                    type="number"
                    step="any"
                    placeholder="R$ valor do app externo"
                    value={input.manualPrice ?? ""}
                    onChange={(e) => update("manualPrice", e.target.value ? parseFloat(e.target.value) : null)}
                    className="h-8 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">Se preenchido, o cálculo automático fica como referência.</p>
                </div>
              )}

              {/* Material type */}
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Material</Label>
                <Select value={input.materialType} onValueChange={(v) => update("materialType", v as MaterialType)}>
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
                  <Input type="number" step="any" value={input.grossWeight || ""} onChange={(e) => update("grossWeight", parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tara (kg)</Label>
                  <Input type="number" step="any" value={input.tare || ""} onChange={(e) => update("tare", parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                </div>
              </div>

              {/* Concentrations */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Pt (ppm)</Label>
                  <Input type="number" step="any" value={input.ptPpm || ""} onChange={(e) => update("ptPpm", parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pd (ppm)</Label>
                  <Input type="number" step="any" value={input.pdPpm || ""} onChange={(e) => update("pdPpm", parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Rh (ppm)</Label>
                  <Input type="number" step="any" value={input.rhPpm || ""} onChange={(e) => update("rhPpm", parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                </div>
              </div>

              {/* Client discount → Margem de Fornecedor */}
              <div className="space-y-1">
                <Label className="text-xs">Margem de Fornecedor (%)</Label>
                <Input type="number" step="any" value={input.clientDiscount || ""} onChange={(e) => update("clientDiscount", parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
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
                        update("customPt", null);
                        update("customPd", null);
                        update("customRh", null);
                      } else {
                        update("customPt", settings.ptPrice);
                        update("customPd", settings.pdPrice);
                        update("customRh", settings.rhPrice);
                      }
                    }} />
                  </div>

                  {useCustomQuotes && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Pt ($/ozt)</Label>
                        <Input type="number" step="any" value={input.customPt ?? ""} onChange={(e) => update("customPt", parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Pd ($/ozt)</Label>
                        <Input type="number" step="any" value={input.customPd ?? ""} onChange={(e) => update("customPd", parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Rh ($/ozt)</Label>
                        <Input type="number" step="any" value={input.customRh ?? ""} onChange={(e) => update("customRh", parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
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
              {isAdmin && <CalculationDetails result={result} />}
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
      <QuoteList items={quoteList} onRemove={removeFromQuoteList} />
    </div>
  );
}
