import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, loadSettings, saveSettings, defaultSettings } from "@/lib/settings";
import { useToast } from "@/hooks/use-toast";
import { Save, RotateCcw } from "lucide-react";

function Field({ label, value, onChange, suffix }: { label: string; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          step="any"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
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

  useEffect(() => { setS(loadSettings()); }, []);

  const update = (key: keyof Settings, value: number) => setS((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    saveSettings(s);
    toast({ title: "Configurações salvas", description: "Os parâmetros foram atualizados." });
  };

  const handleReset = () => {
    setS({ ...defaultSettings });
    saveSettings(defaultSettings);
    toast({ title: "Configurações restauradas", description: "Valores padrão aplicados." });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display">Configurações</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}><RotateCcw className="mr-1 h-3 w-3" />Restaurar</Button>
          <Button size="sm" onClick={handleSave}><Save className="mr-1 h-3 w-3" />Salvar</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Cotações dos Metais</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <Field label="Platina (Pt)" value={s.ptPrice} onChange={(v) => update("ptPrice", v)} suffix="USD/ozt" />
            <Field label="Paládio (Pd)" value={s.pdPrice} onChange={(v) => update("pdPrice", v)} suffix="USD/ozt" />
            <Field label="Ródio (Rh)" value={s.rhPrice} onChange={(v) => update("rhPrice", v)} suffix="USD/ozt" />
            <Field label="Câmbio USD → BRL" value={s.usdToBrl} onChange={(v) => update("usdToBrl", v)} suffix="R$" />
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
      </div>
    </div>
  );
}
