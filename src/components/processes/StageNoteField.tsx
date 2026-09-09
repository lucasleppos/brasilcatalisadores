import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { loadStageNote, saveStageNote } from "@/lib/stage-notes";

interface StageNoteFieldProps {
  purchaseId: string;
  stage: string;
  disabled?: boolean;
}

export default function StageNoteField({ purchaseId, stage, disabled = false }: StageNoteFieldProps) {
  const [value, setValue] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const lastSaved = useRef("");

  useEffect(() => {
    let active = true;
    setLoaded(false);
    loadStageNote(purchaseId).then((txt) => {
      if (!active) return;
      lastSaved.current = txt;
      setValue(txt);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [purchaseId]);

  useEffect(() => {
    if (!loaded || disabled) return;
    if (value === lastSaved.current) return;
    const t = setTimeout(async () => {
      setSaving(true);
      const ok = await saveStageNote(purchaseId, stage, value);
      setSaving(false);
      if (ok) {
        lastSaved.current = value;
        setSavedAt(Date.now());
      }
    }, 600);
    return () => clearTimeout(t);
  }, [value, loaded, disabled, purchaseId, stage]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">Obs. (acompanhamento interno)</p>
        {!disabled && (
          <span className="text-[10px] text-muted-foreground">
            {saving ? "salvando…" : savedAt ? "salvo" : ""}
          </span>
        )}
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled || !loaded}
        rows={2}
        placeholder={disabled ? "Sem observação" : "Digite uma observação…"}
        className="text-xs min-h-[52px] resize-y"
      />
    </div>
  );
}
