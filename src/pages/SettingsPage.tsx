import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, loadSettings, saveSettings, defaultSettings } from "@/lib/settings";
import { useToast } from "@/hooks/use-toast";
import { Save, RotateCcw } from "lucide-react";
import { parseNum, fmtNum } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HedgeManager } from "@/components/settings/HedgeManager";
import { Hedge, loadActiveHedge } from "@/lib/hedges";

const numFilter = (v: string) => v.replace(/[^0-9.,\-]/g, "");

function Field({ label, value, onChange, suffix }: { label: string; value: number; onChange: (v: number) => void; suffix?: string }) {
  const [str, setStr] = useState(String(value));

  useEffect(() => {
    setStr(String(value));
  }, [value]);

  const handleChange = (raw: string) => {
    const filtered = numFilter(raw);
    setStr(filtered);
    onChange(parseNum(filtered));
  };

  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        <Input
          type="text"
          inputMode="decimal"
          value={str}
          onChange={(e) => handleChange(e.target.value)}
          className="h-8 text-sm"
        />
        {suffix && <span className="text-xs text-muted-foreground whitespace-nowrap">{suffix}</span>}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [s, setS] = useState<Settings>(defaultSettings);
  const { toast } = useToast();

  const [hedge, setHedge] = useState<Hedge | null>(null);
  const [tab, setTab] = useState("parametros");
  useEffect(() => { loadSettings().then(setS); loadActiveHedge().then(setHedge); }, [tab]);

  const update = (key: keyof Settings, value: number) => setS((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    await saveSettings(s);
    toast({ title: "Configurações salvas", description: "Os parâmetros foram atualizados." });
  };

  const handleReset = async () => {
    // Mantém as cotações gravadas (usadas pelas compras anteriores ao controle de hedge)
    const next = { ...defaultSettings, ptPrice: s.ptPrice, pdPrice: s.pdPrice, rhPrice: s.rhPrice, usdToBrl: s.usdToBrl };
    setS(next);
    await saveSettings(next);
    toast({ title: "Configurações restauradas", description: "Valores padrão aplicados." });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display">Configurações</h1>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="parametros">Parâmetros</TabsTrigger>
          <TabsTrigger value="hedge">Hedge</TabsTrigger>
        </TabsList>
        <TabsContent value="hedge" className="mt-4"><HedgeManager /></TabsContent>
        <TabsContent value="parametros" className="mt-4 space-y-4">
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={handleReset}><RotateCcw className="mr-1 h-3 w-3" />Restaurar</Button>
          <Button size="sm" onClick={handleSave}><Save className="mr-1 h-3 w-3" />Salvar</Button>
        </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Cotações dos Metais</CardTitle></CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {hedge ? (
              <>
                <div className="text-xs text-muted-foreground">Hedge vigente: <strong className="text-foreground">{hedge.name}</strong></div>
                <div>Platina (Pt): <strong>{fmtNum(hedge.ptPrice, 2)}</strong> USD/ozt</div>
                <div>Paládio (Pd): <strong>{fmtNum(hedge.pdPrice, 2)}</strong> USD/ozt</div>
                <div>Ródio (Rh): <strong>{fmtNum(hedge.rhPrice, 2)}</strong> USD/ozt</div>
                <div>Câmbio USD → BRL: <strong>R$ {fmtNum(hedge.usdToBrl, 4)}</strong></div>
              </>
            ) : <div className="text-xs text-muted-foreground">Nenhum hedge vigente hoje.</div>}
            <Button variant="outline" size="sm" className="w-fit mt-1" onClick={() => setTab("hedge")}>Gerenciar hedges</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Custos</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <Field label="Custo Operacional" value={s.operationalCost} onChange={(v) => update("operationalCost", v)} suffix="$/kg" />
            <Field label="Custo Logístico" value={s.logisticCost} onChange={(v) => update("logisticCost", v)} suffix="$/kg" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Taxas de Refino</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <Field label="Treatment" value={s.treatmentFee} onChange={(v) => update("treatmentFee", v)} suffix="$/lb" />
            <Field label="Refining Pt" value={s.refiningPt} onChange={(v) => update("refiningPt", v)} suffix="$/ozt" />
            <Field label="Refining Pd" value={s.refiningPd} onChange={(v) => update("refiningPd", v)} suffix="$/ozt" />
            <Field label="Refining Rh" value={s.refiningRh} onChange={(v) => update("refiningRh", v)} suffix="$/ozt" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Lease Fees</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <Field label="Lease Pt" value={s.leasePt} onChange={(v) => update("leasePt", v)} suffix="%" />
            <Field label="Lease Pd" value={s.leasePd} onChange={(v) => update("leasePd", v)} suffix="%" />
            <Field label="Lease Rh" value={s.leaseRh} onChange={(v) => update("leaseRh", v)} suffix="%" />
            <Field label="Dias" value={s.leaseDays} onChange={(v) => update("leaseDays", v)} suffix="dias" />
            <Field label="Base" value={s.leaseBase} onChange={(v) => update("leaseBase", v)} suffix="dias" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Recovery Rates</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <Field label="Recovery Pt" value={s.recoveryPt} onChange={(v) => update("recoveryPt", v)} suffix="%" />
            <Field label="Recovery Pd" value={s.recoveryPd} onChange={(v) => update("recoveryPd", v)} suffix="%" />
            <Field label="Recovery Rh" value={s.recoveryRh} onChange={(v) => update("recoveryRh", v)} suffix="%" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Umidade</CardTitle></CardHeader>
          <CardContent>
            <Field label="Desconto de Umidade" value={s.moistureDiscount} onChange={(v) => update("moistureDiscount", v)} suffix="%" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Alocação de Bags</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <Field
              label="Limite de Referência"
              value={s.allocationThresholdPct}
              onChange={(v) => update("allocationThresholdPct", v)}
              suffix="%"
            />
            <Field label="Peso de Referência" value={s.referenceWeightKg} onChange={(v) => update("referenceWeightKg", v)} suffix="kg" />
            <Field label="Pt de Referência" value={s.referencePtPpm} onChange={(v) => update("referencePtPpm", v)} suffix="ppm" />
            <Field label="Pd de Referência" value={s.referencePdPpm} onChange={(v) => update("referencePdPpm", v)} suffix="ppm" />
            <Field label="Rh de Referência" value={s.referenceRhPpm} onChange={(v) => update("referenceRhPpm", v)} suffix="ppm" />
            <Field label="Margem de Referência" value={s.referenceMarginPct} onChange={(v) => update("referenceMarginPct", v)} suffix="%" />
          </CardContent>
        </Card>
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
