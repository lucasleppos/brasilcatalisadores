import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  LabAnalysis,
  loadLabAnalyses,
  addLabAnalysis,
  calcAnalysisAverage,
} from "@/lib/stage-tasks";
import { registerAnalysis } from "@/lib/purchases";
import { fmtNum } from "@/lib/utils";
import { toast } from "sonner";

interface TripleAnalysisFormProps {
  purchaseId: string;
  onCompleted: () => void;
  onChecklistChange: (canAdvance: boolean) => void;
}

const DEVIATION_THRESHOLD = 10; // % max acceptable deviation

export default function TripleAnalysisForm({ purchaseId, onCompleted, onChecklistChange }: TripleAnalysisFormProps) {
  const [analyses, setAnalyses] = useState<LabAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);

  // Input state for each analysis slot
  const [inputs, setInputs] = useState<Record<number, { pt: string; pd: string; rh: string }>>({
    1: { pt: "", pd: "", rh: "" },
    2: { pt: "", pd: "", rh: "" },
    3: { pt: "", pd: "", rh: "" },
  });

  useEffect(() => {
    loadLabAnalyses(purchaseId).then(data => {
      setAnalyses(data);
      setLoading(false);
    });
  }, [purchaseId]);

  useEffect(() => {
    onChecklistChange(analyses.length >= 3);
  }, [analyses, onChecklistChange]);

  const getAnalysis = (num: number) => analyses.find(a => a.analysisNumber === num);
  const avg = analyses.length >= 3 ? calcAnalysisAverage(analyses) : null;

  const handleSaveAnalysis = async (num: number) => {
    const inp = inputs[num];
    const pt = parseFloat(inp.pt.replace(",", "."));
    const pd = parseFloat(inp.pd.replace(",", "."));
    const rh = parseFloat(inp.rh.replace(",", "."));

    if (isNaN(pt) || isNaN(pd) || isNaN(rh)) {
      toast.error("Preencha todos os campos com valores numéricos");
      return;
    }

    setSaving(true);
    const result = await addLabAnalysis({
      purchaseId,
      analysisNumber: num,
      ptPpm: pt,
      pdPpm: pd,
      rhPpm: rh,
    });

    if (result) {
      setAnalyses(prev => [...prev.filter(a => a.analysisNumber !== num), result]);
      setInputs(prev => ({ ...prev, [num]: { pt: "", pd: "", rh: "" } }));
    } else {
      toast.error("Erro ao salvar análise");
    }
    setSaving(false);
  };

  const handleRegisterAverage = async () => {
    if (!avg) return;
    setRegistering(true);
    try {
      const success = await registerAnalysis(purchaseId, {
        ptPpm: avg.ptAvg,
        pdPpm: avg.pdAvg,
        rhPpm: avg.rhAvg,
      });
      if (success) {
        toast.success("Média registrada e compra avançada");
        onCompleted();
      } else {
        toast.error("Erro ao registrar média");
      }
    } catch {
      toast.error("Erro ao registrar média");
    }
    setRegistering(false);
  };

  const deviationPercent = (dev: number, avg: number) =>
    avg > 0 ? (dev / avg) * 100 : 0;

  const hasHighDeviation = avg && (
    deviationPercent(avg.ptDev, avg.ptAvg) > DEVIATION_THRESHOLD ||
    deviationPercent(avg.pdDev, avg.pdAvg) > DEVIATION_THRESHOLD ||
    deviationPercent(avg.rhDev, avg.rhAvg) > DEVIATION_THRESHOLD
  );

  if (loading) return <div className="flex items-center gap-1 text-xs text-muted-foreground py-2"><Loader2 className="h-3 w-3 animate-spin" />Carregando análises...</div>;

  return (
    <div className="space-y-3 pt-1 border-t border-border/40">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <FlaskConical className="h-3 w-3" />
        3 Análises Laboratoriais (PPM)
      </p>

      {[1, 2, 3].map((num) => {
        const existing = getAnalysis(num);
        return (
          <div key={num} className="rounded-md border p-2 space-y-1.5">
            <div className="flex items-center gap-2">
              {existing
                ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                : <FlaskConical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
              <span className="text-xs font-medium">Análise {num}</span>
              {existing && (
                <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-700 border-green-300">
                  Registrada
                </Badge>
              )}
            </div>

            {existing ? (
              <div className="pl-5 text-[10px] text-muted-foreground grid grid-cols-3 gap-2">
                <span>Pt: {fmtNum(existing.ptPpm, 4)}</span>
                <span>Pd: {fmtNum(existing.pdPpm, 4)}</span>
                <span>Rh: {fmtNum(existing.rhPpm, 4)}</span>
              </div>
            ) : (
              <div className="pl-5 space-y-1">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">Pt (ppm)</label>
                    <Input
                      inputMode="decimal"
                      value={inputs[num].pt}
                      onChange={(e) => setInputs(prev => ({
                        ...prev,
                        [num]: { ...prev[num], pt: e.target.value.replace(/[^0-9.,]/g, "") }
                      }))}
                      placeholder="0,0000"
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Pd (ppm)</label>
                    <Input
                      inputMode="decimal"
                      value={inputs[num].pd}
                      onChange={(e) => setInputs(prev => ({
                        ...prev,
                        [num]: { ...prev[num], pd: e.target.value.replace(/[^0-9.,]/g, "") }
                      }))}
                      placeholder="0,0000"
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Rh (ppm)</label>
                    <Input
                      inputMode="decimal"
                      value={inputs[num].rh}
                      onChange={(e) => setInputs(prev => ({
                        ...prev,
                        [num]: { ...prev[num], rh: e.target.value.replace(/[^0-9.,]/g, "") }
                      }))}
                      placeholder="0,0000"
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  className="h-7 text-[10px] w-full"
                  disabled={saving || !inputs[num].pt || !inputs[num].pd || !inputs[num].rh}
                  onClick={() => handleSaveAnalysis(num)}
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <FlaskConical className="h-3 w-3 mr-1" />}
                  Registrar Análise {num}
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {/* Average display */}
      {avg && (
        <div className="rounded-md border p-2 space-y-1.5 bg-muted/30">
          <p className="text-xs font-semibold">📊 Média das 3 Análises</p>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <span>Pt: <strong>{fmtNum(avg.ptAvg, 4)}</strong></span>
            <span>Pd: <strong>{fmtNum(avg.pdAvg, 4)}</strong></span>
            <span>Rh: <strong>{fmtNum(avg.rhAvg, 4)}</strong></span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
            <span>σ {fmtNum(avg.ptDev, 4)}</span>
            <span>σ {fmtNum(avg.pdDev, 4)}</span>
            <span>σ {fmtNum(avg.rhDev, 4)}</span>
          </div>

          {hasHighDeviation && (
            <div className="rounded bg-amber-500/10 border border-amber-300 p-1.5 flex items-center gap-1.5 text-[10px] text-amber-700">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              Desvio alto entre análises (&gt;{DEVIATION_THRESHOLD}%). Revise os valores.
            </div>
          )}

          <Button
            size="sm"
            className="w-full h-8 text-xs"
            disabled={registering}
            onClick={handleRegisterAverage}
          >
            {registering ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
            Registrar Média e Avançar
          </Button>
        </div>
      )}
    </div>
  );
}
