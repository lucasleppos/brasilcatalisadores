import { AlertTriangle, RotateCcw } from "lucide-react";
import { ContestInfo, Purchase } from "@/lib/purchases";

interface Props {
  purchase: Purchase;
  contest: ContestInfo;
}

export default function ReanalysisBanner({ contest }: Props) {
  return (
    <div className="rounded-md border border-reanalysis-border bg-reanalysis/60 p-2.5 space-y-2">
      <div className="flex items-center gap-1.5">
        <RotateCcw className="h-3.5 w-3.5 text-reanalysis-foreground shrink-0" />
        <p className="text-[11px] font-bold tracking-wide text-reanalysis-foreground">
          EM REAMOSTRAGEM E REANÁLISE
        </p>
      </div>

      <div className="flex items-start gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-reanalysis-foreground shrink-0 mt-0.5" />
        <div className="text-[11px] text-reanalysis-foreground space-y-0.5">
          <p>
            <span className="font-semibold">Motivo da contestação:</span> {contest.motivo || "—"}
          </p>
          <p className="opacity-80">
            {new Date(contest.date).toLocaleString("pt-BR")} · Devolvido para: {contest.destino}
          </p>
        </div>
      </div>

      <p className="text-[10px] text-reanalysis-foreground/80">
        Você pode alterar pesos, grupos, fotos e análises nas etapas antes de seguir para a aprovação.
      </p>
    </div>
  );
}
