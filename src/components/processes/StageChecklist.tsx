import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Camera, Scale, FileText, Loader2, Image, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  STAGE_REQUIREMENTS,
  TaskRequirement,
  StageEvidence,
  LabAnalysis,
  loadEvidences,
  loadLabAnalyses,
  addEvidence,
  canAdvanceStage,
} from "@/lib/stage-tasks";
import PhotoCapture from "./PhotoCapture";
import { fmtNum } from "@/lib/utils";

interface StageChecklistProps {
  purchaseId: string;
  status: string;
  onChecklistChange: (canAdvance: boolean) => void;
}

export default function StageChecklist({ purchaseId, status, onChecklistChange }: StageChecklistProps) {
  const [evidences, setEvidences] = useState<StageEvidence[]>([]);
  const [labAnalyses, setLabAnalyses] = useState<LabAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [weightInput, setWeightInput] = useState<Record<string, string>>({});
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const requirements = STAGE_REQUIREMENTS[status] || [];
  const isAnalysisStage = requirements.some(r => r.type === "analysis");

  useEffect(() => {
    if (!purchaseId) return;
    setLoading(true);
    Promise.all([
      loadEvidences(purchaseId),
      loadLabAnalyses(purchaseId),
    ]).then(([ev, la]) => {
      setEvidences(ev);
      setLabAnalyses(la);
      setLoading(false);
    });
  }, [purchaseId]);

  useEffect(() => {
    const { canAdvance } = canAdvanceStage(status, evidences, labAnalyses);
    onChecklistChange(canAdvance);
  }, [evidences, labAnalyses, status, onChecklistChange]);

  if (requirements.length === 0 || isAnalysisStage) return null;
  if (loading) return <div className="flex items-center gap-1 text-xs text-muted-foreground py-2"><Loader2 className="h-3 w-3 animate-spin" />Carregando checklist...</div>;

  const getEvidences = (key: string) =>
    evidences.filter(e => e.taskKey === key);

  const isCompleted = (req: TaskRequirement) =>
    getEvidences(req.key).length > 0;

  const handlePhotoUploaded = async (taskKey: string, url: string) => {
    setSaving(taskKey);
    const ev = await addEvidence({
      purchaseId,
      stage: status,
      taskKey,
      dataType: "photo",
      fileUrl: url,
    });
    if (ev) setEvidences(prev => [...prev, ev]);
    setSaving(null);
  };

  const handleWeightSubmit = async (taskKey: string) => {
    const val = parseFloat((weightInput[taskKey] || "").replace(",", "."));
    if (isNaN(val) || val <= 0) return;
    setSaving(taskKey);
    const ev = await addEvidence({
      purchaseId,
      stage: status,
      taskKey,
      dataType: "weight",
      valueNumeric: val,
    });
    if (ev) setEvidences(prev => [...prev, ev]);
    setWeightInput(prev => ({ ...prev, [taskKey]: "" }));
    setSaving(null);
  };

  const handleNoteSubmit = async (taskKey: string) => {
    const text = (noteInput[taskKey] || "").trim();
    if (!text) return;
    setSaving(taskKey);
    const ev = await addEvidence({
      purchaseId,
      stage: status,
      taskKey,
      dataType: "note",
      valueText: text,
    });
    if (ev) setEvidences(prev => [...prev, ev]);
    setNoteInput(prev => ({ ...prev, [taskKey]: "" }));
    setSaving(null);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "photo": return <Camera className="h-3 w-3" />;
      case "weight": return <Scale className="h-3 w-3" />;
      case "note": return <FileText className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-2 pt-1 border-t border-border/40">
      <p className="text-xs font-medium text-muted-foreground">Checklist da Etapa</p>
      {requirements.filter(r => r.type !== "analysis").map((req) => {
        const done = isCompleted(req);
        const taskEvidences = getEvidences(req.key);
        const isMulti = req.multi === true;

        return (
          <div key={req.key} className="rounded-md border p-2 space-y-1.5">
            <div className="flex items-center gap-2">
              {done
                ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                : <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
              <span className="text-xs flex items-center gap-1">
                {getIcon(req.type)}
                {req.label}
                {!req.required && <span className="text-muted-foreground">(opcional)</span>}
                {isMulti && taskEvidences.length > 0 && (
                  <span className="text-muted-foreground">({taskEvidences.length})</span>
                )}
              </span>
            </div>

            {/* Show existing evidences for multi tasks */}
            {isMulti && taskEvidences.length > 0 && (
              <div className="pl-5 space-y-1">
                {taskEvidences.map((ev, idx) => (
                  <div key={ev.id} className="text-[10px] text-muted-foreground flex items-center gap-1">
                    {ev.dataType === "photo" && ev.fileUrl && (
                      <span className="flex items-center gap-1 cursor-pointer" onClick={() => window.open(ev.fileUrl!, "_blank")}>
                        <Image className="h-3 w-3" />
                        <span className="underline">Foto {idx + 1}</span>
                      </span>
                    )}
                    <span className="ml-1">{new Date(ev.createdAt).toLocaleString("pt-BR")}</span>
                  </div>
                ))}
              </div>
            )}

            {/* For multi: always show upload. For single: show evidence or upload */}
            {isMulti ? (
              <div className="pl-5">
                <PhotoCapture
                  purchaseId={purchaseId}
                  disabled={saving === req.key}
                  onUploaded={(url) => handlePhotoUploaded(req.key, url)}
                />
              </div>
            ) : done && taskEvidences[0] ? (
              <div className="pl-5 text-[10px] text-muted-foreground">
                {taskEvidences[0].dataType === "photo" && taskEvidences[0].fileUrl && (
                  <div className="flex items-center gap-1 cursor-pointer" onClick={() => window.open(taskEvidences[0].fileUrl!, "_blank")}>
                    <Image className="h-3 w-3" />
                    <span className="underline">Ver foto</span>
                  </div>
                )}
                {taskEvidences[0].dataType === "weight" && taskEvidences[0].valueNumeric != null && (
                  <span>Registrado: {fmtNum(taskEvidences[0].valueNumeric, 4)} kg</span>
                )}
                {taskEvidences[0].dataType === "note" && taskEvidences[0].valueText && (
                  <span>"{taskEvidences[0].valueText}"</span>
                )}
                <span className="ml-2">{new Date(taskEvidences[0].createdAt).toLocaleString("pt-BR")}</span>
              </div>
            ) : (
              <div className="pl-5">
                {req.type === "photo" && (
                  <PhotoCapture
                    purchaseId={purchaseId}
                    disabled={saving === req.key}
                    onUploaded={(url) => handlePhotoUploaded(req.key, url)}
                  />
                )}
                {req.type === "weight" && (
                  <div className="flex gap-1">
                    <Input
                      inputMode="decimal"
                      value={weightInput[req.key] || ""}
                      onChange={(e) => setWeightInput(prev => ({ ...prev, [req.key]: e.target.value.replace(/[^0-9.,]/g, "") }))}
                      placeholder="0,0000 kg"
                      className="h-7 text-xs flex-1"
                    />
                    <Button
                      size="sm"
                      className="h-7 text-[10px] px-2"
                      disabled={!weightInput[req.key] || saving === req.key}
                      onClick={() => handleWeightSubmit(req.key)}
                    >
                      {saving === req.key ? <Loader2 className="h-3 w-3 animate-spin" /> : "Salvar"}
                    </Button>
                  </div>
                )}
                {req.type === "note" && (
                  <div className="space-y-1">
                    <Textarea
                      value={noteInput[req.key] || ""}
                      onChange={(e) => setNoteInput(prev => ({ ...prev, [req.key]: e.target.value }))}
                      placeholder="Observação..."
                      className="text-xs min-h-[40px]"
                    />
                    <Button
                      size="sm"
                      className="h-7 text-[10px]"
                      disabled={!noteInput[req.key]?.trim() || saving === req.key}
                      onClick={() => handleNoteSubmit(req.key)}
                    >
                      {saving === req.key ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirmar"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
