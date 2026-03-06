import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckCircle2, FlaskConical, Send, Loader2 } from "lucide-react";
import { Purchase, PurchaseStatus, advanceStage, registerAnalysis } from "@/lib/purchases";

interface StageActionCardProps {
  purchase: Purchase;
  onCompleted: () => void;
}

const fmtBrl = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function timeSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "agora";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const ANALYSIS_STAGE: PurchaseStatus = "Análise";
const APPROVAL_STAGE: PurchaseStatus = "Aprovação do Fornecedor";

export default function StageActionCard({ purchase, onCompleted }: StageActionCardProps) {
  const [loading, setLoading] = useState(false);
  const [ptPpm, setPtPpm] = useState("");
  const [pdPpm, setPdPpm] = useState("");
  const [rhPpm, setRhPpm] = useState("");
  const [notes, setNotes] = useState("");

  const lastChange = purchase.statusHistory[purchase.statusHistory.length - 1];
  const timeInStage = lastChange ? timeSince(lastChange.date) : "—";
  const isAnalysis = purchase.status === ANALYSIS_STAGE;
  const isApproval = purchase.status === APPROVAL_STAGE;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await advanceStage(purchase.id, purchase.status);
      onCompleted();
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysis = async () => {
    const pt = parseFloat(ptPpm.replace(",", "."));
    const pd = parseFloat(pdPpm.replace(",", "."));
    const rh = parseFloat(rhPpm.replace(",", "."));
    if (isNaN(pt) || isNaN(pd) || isNaN(rh)) return;

    setLoading(true);
    try {
      await registerAnalysis(purchase.id, { ptPpm: pt, pdPpm: pd, rhPpm: rh });
      onCompleted();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold">{purchase.supplierName}</p>
            <p className="text-xs text-muted-foreground font-mono">{purchase.purchaseNumber}</p>
          </div>
          <div className="text-right space-y-0.5">
            <Badge variant="outline" className="text-[10px]">{timeInStage} nesta etapa</Badge>
            <p className="text-xs text-muted-foreground">{purchase.items.length} itens</p>
          </div>
        </div>

        {/* Value */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Valor:</span>
          <span className="font-semibold">
            {purchase.totalBrl > 0 ? fmtBrl(purchase.totalBrl) : (
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-500/10 text-xs">Pendente análise</Badge>
            )}
          </span>
        </div>

        {/* Action area */}
        {isAnalysis ? (
          <div className="space-y-2 pt-1 border-t border-border/40">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <FlaskConical className="h-3 w-3" />
              Resultado da Análise (PPM)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Pt (ppm)</label>
                <Input
                  value={ptPpm}
                  onChange={(e) => setPtPpm(e.target.value)}
                  placeholder="0"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Pd (ppm)</label>
                <Input
                  value={pdPpm}
                  onChange={(e) => setPdPpm(e.target.value)}
                  placeholder="0"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Rh (ppm)</label>
                <Input
                  value={rhPpm}
                  onChange={(e) => setRhPpm(e.target.value)}
                  placeholder="0"
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <Button
              size="sm"
              className="w-full"
              disabled={loading || !ptPpm || !pdPpm || !rhPpm}
              onClick={handleAnalysis}
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <FlaskConical className="h-3 w-3 mr-1" />}
              Registrar Análise
            </Button>
          </div>
        ) : isApproval ? (
          <div className="space-y-2 pt-1 border-t border-border/40">
            <Textarea
              placeholder="Observações (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm min-h-[60px]"
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" className="w-full" disabled={loading}>
                  <Send className="h-3 w-3 mr-1" />
                  Aprovar e Enviar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar aprovação?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O fornecedor <strong>{purchase.supplierName}</strong> será aprovado e o pedido avançará para Pagamento.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirm} disabled={loading}>
                    {loading ? "Processando..." : "Confirmar"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="default" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                Concluir {purchase.status}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Concluir etapa?</AlertDialogTitle>
                <AlertDialogDescription>
                  A compra de <strong>{purchase.supplierName}</strong> avançará de "{purchase.status}" para a próxima etapa.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirm} disabled={loading}>
                  {loading ? "Processando..." : "Confirmar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
}
