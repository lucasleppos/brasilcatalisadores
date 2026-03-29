import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckCircle2, FlaskConical, Send, Loader2, AlertTriangle, ArrowRight, Scale, FileDown, MessageCircle, Search } from "lucide-react";
import { Purchase, advanceStage, advanceFinStatus, advanceOpStatus, registerAnalysis, handleWeightCheck, isInParallelPhase, getStatusColor, CerFinStatus, CerOpStatus, contestDemonstrativo, getOriginalItemCount } from "@/lib/purchases";
import { loadDemonstrativos, generateDemonstrativoPdf, createDemonstrativo } from "@/lib/demonstrativos";
import { toast } from "sonner";
import PurchaseSummary from "./PurchaseSummary";
import StageChecklist from "./StageChecklist";
import TripleAnalysisForm from "./TripleAnalysisForm";
import PiecePricingPanel from "./PiecePricingPanel";
import SacolaConferenciaPanel from "./SacolaConferenciaPanel";
import SacolaLabPanel from "./SacolaLabPanel";
import SacolaPricingPanel from "./SacolaPricingPanel";
import CeramicoConferenciaPanel from "./CeramicoConferenciaPanel";
import CeramicoLabPanel from "./CeramicoLabPanel";
import { STAGE_REQUIREMENTS } from "@/lib/stage-tasks";
import { fmtNum, fmtBrl } from "@/lib/utils";

interface StageActionCardProps {
  purchase: Purchase;
  onCompleted: () => void;
}

function timeSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "agora";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function StageActionCard({ purchase, onCompleted }: StageActionCardProps) {
  const [loading, setLoading] = useState(false);
  const [ptPpm, setPtPpm] = useState("");
  const [pdPpm, setPdPpm] = useState("");
  const [rhPpm, setRhPpm] = useState("");
  const [notes, setNotes] = useState("");
  const [weightReal, setWeightReal] = useState("");
  const [contestMotivo, setContestMotivo] = useState("");
  const [checklistReady, setChecklistReady] = useState(true);
  const [conferenciaOpen, setConferenciaOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [sacolaPricingOpen, setSacolaPricingOpen] = useState(false);
  const [ceramicoConferenciaOpen, setCeramicoConferenciaOpen] = useState(false);
  const [ceramicoLabOpen, setCeramicoLabOpen] = useState(false);

  const handleChecklistChange = useCallback((canAdvance: boolean) => {
    setChecklistReady(canAdvance);
  }, []);

  const lastChange = purchase.statusHistory[purchase.statusHistory.length - 1];
  const timeInStage = lastChange ? timeSince(lastChange.date) : "—";

  const isAnalysis = purchase.status === "Análise" || (purchase.status === "Cerâmico: Lab em Análise" && purchase.materialFlow !== "ceramico");
  const isDemonstrative = purchase.status.includes("Gerar Boleto de Aprovação");
  const isContested = purchase.status.includes("Demonstrativo Contestado");
  const isPiecePricing = purchase.status === "Peças: Aguardando Demonstrativo";
  const hasSacolaItems = purchase.items.some(i => i.itemType === "peca_sacola");
  const isSacolaPricing = isPiecePricing && hasSacolaItems;
  const isWeighing = purchase.status === "Peças: Pesagem Realizada";
  const isWeightDivergent = purchase.status === "Peças: Peso Divergente";
  const isParallel = isInParallelPhase(purchase);
  const isApprovalStage = purchase.status === "Aprovação do Fornecedor" || purchase.status.includes("Aprovado - Aguardando");
  const canGeneratePdf = isDemonstrative || isPiecePricing || purchase.status === "Cerâmico: Em Precificação";
  const isSacolaConferencia = purchase.status === "Em Conferência" && purchase.materialFlow === "pecas" && hasSacolaItems;
  const isSacolaLab = purchase.status === "Peças: Laboratório" && hasSacolaItems;
  const isCeramicoConferencia = purchase.status === "Em Conferência" && purchase.materialFlow === "ceramico";
  const isCeramicoLab = purchase.status === "Cerâmico: Lab em Análise" && purchase.materialFlow === "ceramico";

  // Block approval/PDF stages if Boleto Syge is missing
  const missingErp = !purchase.erpNumber?.trim();
  const needsErp = isDemonstrative || isPiecePricing || isContested || purchase.status === "Cerâmico: Em Precificação";

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

  const handleApprove = async () => {
    setLoading(true);
    try {
      await advanceStage(purchase.id, purchase.status);
      onCompleted();
    } finally {
      setLoading(false);
    }
  };

  const handleContest = async () => {
    if (!contestMotivo.trim()) return;
    setLoading(true);
    try {
      await contestDemonstrativo(purchase.id, contestMotivo.trim());
      onCompleted();
    } finally {
      setLoading(false);
    }
  };

  const handleWeighCheck = async () => {
    const wr = parseFloat(weightReal.replace(",", "."));
    if (isNaN(wr) || wr <= 0) return;
    setLoading(true);
    try {
      await handleWeightCheck(purchase.id, wr);
      onCompleted();
    } finally {
      setLoading(false);
    }
  };

  const handleFinAdvance = async () => {
    if (!purchase.finStatus) return;
    setLoading(true);
    try {
      await advanceFinStatus(purchase.id, purchase.finStatus);
      onCompleted();
    } finally {
      setLoading(false);
    }
  };

  const handleOpAdvance = async () => {
    if (!purchase.opStatus) return;
    setLoading(true);
    try {
      await advanceOpStatus(purchase.id, purchase.opStatus);
      onCompleted();
    } finally {
      setLoading(false);
    }
  };

  // Reusable enriched dialog content
  const enrichedDialogContent = (title: string, description: string, onAction: () => void, actionLabel: string, variant?: "destructive", extraContent?: React.ReactNode) => (
    <AlertDialogContent className="max-w-md">
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription className="sr-only">{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <PurchaseSummary purchase={purchase} showPdf={isDemonstrative} />
      {extraContent}
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction onClick={onAction} disabled={loading} className={variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}>
          {loading ? "Processando..." : actionLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold">{purchase.supplierName}</p>
            <p className="text-xs text-muted-foreground font-mono">{purchase.purchaseNumber}</p>
            {purchase.buyer && (
              <p className="text-[10px] text-muted-foreground">Comprador: {purchase.buyer}</p>
            )}
            <p className={`text-[10px] ${purchase.erpNumber ? "text-muted-foreground font-mono" : "text-red-500"}`}>
              Boleto Syge: {purchase.erpNumber || "Sem Boleto"}
            </p>
          </div>
          <div className="text-right space-y-0.5">
            <Badge variant="outline" className="text-[10px]">{timeInStage} nesta etapa</Badge>
            <p className="text-xs text-muted-foreground">{getItemLabel(purchase)}</p>
            {purchase.materialFlow && (
              <Badge variant="outline" className={`text-[10px] ${purchase.materialFlow === "ceramico" ? "bg-orange-500/10 text-orange-700 border-orange-300" : "bg-blue-500/10 text-blue-700 border-blue-300"}`}>
                {purchase.materialFlow === "ceramico" ? "Cerâmico" : "Peças"}
              </Badge>
            )}
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

        {/* Weight divergence alert */}
        {isWeightDivergent && purchase.weightLoss != null && (
          <div className="rounded-md bg-red-500/10 border border-red-300 p-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-700" />
            <div className="text-xs text-red-700">
              <p className="font-semibold">Divergência de peso</p>
              <p>Declarado: {fmtNum(purchase.weightDeclared ?? 0, 4)} kg | Real: {fmtNum(purchase.weightReal ?? 0, 4)} kg | Perda: {fmtNum(Math.abs(purchase.weightLoss), 4)} kg</p>
            </div>
          </div>
        )}

        {/* Parallel sub-flows (cerâmico) */}
        {isParallel ? (
          <div className="space-y-2 pt-1 border-t border-border/40">
            <p className="text-xs font-medium text-muted-foreground">Sub-fluxos paralelos</p>
            <div className="grid grid-cols-2 gap-2">
              {/* Financial */}
              <div className="space-y-1 p-2 rounded-md border bg-muted/30">
                <p className="text-[10px] font-semibold text-muted-foreground">💰 Financeiro</p>
                <Badge variant="outline" className={`text-[10px] ${getStatusColor(purchase.finStatus || "")}`}>
                  {purchase.finStatus}
                </Badge>
                {purchase.finStatus !== "Encerrado ERP" && (
                  <Button size="sm" className="w-full h-7 text-[10px]" disabled={loading} onClick={handleFinAdvance}>
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3 mr-1" />}
                    Avançar
                  </Button>
                )}
              </div>
              {/* Operational */}
              <div className="space-y-1 p-2 rounded-md border bg-muted/30">
                <p className="text-[10px] font-semibold text-muted-foreground">📦 Operacional</p>
                <Badge variant="outline" className={`text-[10px] ${getStatusColor(purchase.opStatus || "")}`}>
                  {purchase.opStatus}
                </Badge>
                {purchase.opStatus !== "Enviado Exportação" && (
                  <Button size="sm" className="w-full h-7 text-[10px]" disabled={loading} onClick={handleOpAdvance}>
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3 mr-1" />}
                    Avançar
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : isAnalysis ? (
          /* Lab analysis form — 3 analyses → average */
          <TripleAnalysisForm
            purchaseId={purchase.id}
            onCompleted={onCompleted}
            onChecklistChange={handleChecklistChange}
          />
        ) : isDemonstrative ? (
          /* Demonstrative: approve, contest, or generate PDF */
          <div className="space-y-2 pt-1 border-t border-border/40">
            {missingErp && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 p-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-xs text-destructive">Preencha o campo "Boleto Syge" na compra antes de prosseguir.</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" disabled={loading || missingErp} onClick={async () => {
                setLoading(true);
                try {
                  let demos = await loadDemonstrativos(purchase.id);
                  if (demos.length === 0) {
                    await createDemonstrativo(purchase.id, purchase.totalBrl);
                    demos = await loadDemonstrativos(purchase.id);
                  }
                  const latest = demos[demos.length - 1];
                  if (!latest) { toast.error("Nenhum demonstrativo encontrado"); return; }
                   const url = await generateDemonstrativoPdf(purchase.id, latest.id);
                   const safeName = (s: string) => (s || "").replace(/[^a-zA-Z0-9-]/g, "_").replace(/_+/g, "_"); const fname = `${safeName(purchase.erpNumber)}_${safeName(purchase.purchaseNumber)}_${safeName(purchase.supplierName)}.pdf`; const a = document.createElement("a"); a.href = url; a.download = fname; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                } catch { toast.error("Erro ao gerar PDF"); } finally { setLoading(false); }
              }}>
                <FileDown className="h-3 w-3 mr-1" />PDF
              </Button>
              <Button size="sm" variant="outline" className="flex-1" disabled={loading || missingErp} onClick={async () => {
                setLoading(true);
                try {
                  let demos = await loadDemonstrativos(purchase.id);
                  if (demos.length === 0) {
                    await createDemonstrativo(purchase.id, purchase.totalBrl);
                    demos = await loadDemonstrativos(purchase.id);
                  }
                  const latest = demos[demos.length - 1];
                  if (!latest) { toast.error("Nenhum demonstrativo encontrado"); return; }
                  const url = await generateDemonstrativoPdf(purchase.id, latest.id);
                  const blob = await fetch(url).then(r => r.blob());
                  const file = new File([blob], "demonstrativo.pdf", { type: "application/pdf" });
                  if (navigator.share && navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], title: `Demonstrativo ${purchase.purchaseNumber}` });
                  } else {
                    const msg = encodeURIComponent(`Demonstrativo de valores - Pedido ${purchase.purchaseNumber}`);
                    window.open(`https://wa.me/?text=${msg}`, "_blank");
                    toast.info("PDF gerado. Anexe o arquivo baixado na conversa do WhatsApp.");
                     const safeName = (s: string) => (s || "").replace(/[^a-zA-Z0-9-]/g, "_").replace(/_+/g, "_"); const fname = `${safeName(purchase.erpNumber)}_${safeName(purchase.purchaseNumber)}_${safeName(purchase.supplierName)}.pdf`; const a = document.createElement("a"); a.href = url; a.download = fname; a.click();
                  }
                } catch { toast.error("Erro ao compartilhar"); } finally { setLoading(false); }
              }}>
                <MessageCircle className="h-3 w-3 mr-1" />WhatsApp
              </Button>
            </div>
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" className="flex-1" disabled={loading || missingErp}>
                    <CheckCircle2 className="h-3 w-3 mr-1" />Aprovar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      {purchase.materialFlow === "pecas" ? "Aprovar e Enviar para Bag" : purchase.materialFlow === "ceramico" ? "Aprovar e Encerrar" : "Aprovar demonstrativo?"}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="sr-only">Confirmação de aprovação</AlertDialogDescription>
                  </AlertDialogHeader>
                  <PurchaseSummary purchase={purchase} showPdf={true} />
                  {(purchase.materialFlow === "pecas" || purchase.materialFlow === "ceramico") && (
                    <div className="rounded-md bg-amber-500/10 border border-amber-300 p-3 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700">
                        {purchase.materialFlow === "ceramico"
                          ? "Ao confirmar, este material será registrado para pagamento e alocação ao Bag, encerrando o processo."
                          : "Ao confirmar, este material será registrado para pagamento e enviado diretamente para alocação ao Bag."}
                      </p>
                    </div>
                  )}
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleApprove} disabled={loading}>
                      {loading ? "Processando..." : purchase.materialFlow === "pecas" ? "Confirmar e Alocar" : purchase.materialFlow === "ceramico" ? "Confirmar e Encerrar" : "Confirmar Aprovação"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" className="flex-1" disabled={loading || missingErp}>
                    <AlertTriangle className="h-3 w-3 mr-1" />Contestar
                  </Button>
                </AlertDialogTrigger>
                {enrichedDialogContent(
                  "Contestar demonstrativo?",
                  purchase.materialFlow === "ceramico"
                    ? "O pedido voltará para Trituração/Homogeneização para nova análise."
                    : "O pedido voltará para Aguardando Demonstrativo.",
                  handleContest,
                  "Contestar",
                  "destructive",
                  <Textarea placeholder="Motivo da contestação" value={contestMotivo} onChange={(e) => setContestMotivo(e.target.value)} className="text-sm" />
                )}
              </AlertDialog>
            </div>
          </div>
        ) : isWeighing ? (
          /* Weighing: input real weight */
          <div className="space-y-2 pt-1 border-t border-border/40">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Scale className="h-3 w-3" />
              Conferência de Peso
            </p>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Peso Real (kg)</label>
              <Input inputMode="decimal" value={weightReal} onChange={(e) => setWeightReal(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="0,0000" className="h-8 text-sm" />
            </div>
            <Button size="sm" className="w-full" disabled={loading || !weightReal} onClick={handleWeighCheck}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Scale className="h-3 w-3 mr-1" />}
              Registrar Peso
            </Button>
          </div>
        ) : isApprovalStage ? (
          /* Approval with notes */
          <div className="space-y-2 pt-1 border-t border-border/40">
            <Textarea placeholder="Observações (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="text-sm min-h-[60px]" />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" className="w-full" disabled={loading}>
                  <Send className="h-3 w-3 mr-1" />Aprovar e Avançar
                </Button>
              </AlertDialogTrigger>
              {enrichedDialogContent("Confirmar aprovação?", "O pedido avançará para a próxima etapa.", handleConfirm, "Confirmar")}
            </AlertDialog>
          </div>
        ) : isSacolaConferencia ? (
          /* Sacola: Iniciar Conferência button */
          <div className="space-y-2 pt-1 border-t border-border/40">
            <Button size="sm" className="w-full" onClick={() => setConferenciaOpen(true)}>
              <Search className="h-3 w-3 mr-1" /> Iniciar Conferência
            </Button>
            <SacolaConferenciaPanel
              purchase={purchase}
              open={conferenciaOpen}
              onOpenChange={setConferenciaOpen}
              onCompleted={onCompleted}
            />
          </div>
        ) : isSacolaLab ? (
          /* Sacola Lab: Iniciar Análise button */
          <div className="space-y-2 pt-1 border-t border-border/40">
            <Button size="sm" className="w-full" onClick={() => setLabOpen(true)}>
              <FlaskConical className="h-3 w-3 mr-1" /> Iniciar Análise
            </Button>
            <SacolaLabPanel
              purchase={purchase}
              open={labOpen}
              onOpenChange={setLabOpen}
              onCompleted={onCompleted}
            />
          </div>
        ) : isCeramicoConferencia ? (
          /* Cerâmico: Iniciar Conferência */
          <div className="space-y-2 pt-1 border-t border-border/40">
            <Button size="sm" className="w-full" onClick={() => setCeramicoConferenciaOpen(true)}>
              <Search className="h-3 w-3 mr-1" /> Iniciar Conferência
            </Button>
            <CeramicoConferenciaPanel
              purchase={purchase}
              open={ceramicoConferenciaOpen}
              onOpenChange={setCeramicoConferenciaOpen}
              onCompleted={onCompleted}
            />
          </div>
        ) : isCeramicoLab ? (
          /* Cerâmico Lab: Iniciar Análise */
          <div className="space-y-2 pt-1 border-t border-border/40">
            <Button size="sm" className="w-full" onClick={() => setCeramicoLabOpen(true)}>
              <FlaskConical className="h-3 w-3 mr-1" /> Iniciar Análise
            </Button>
            <CeramicoLabPanel
              purchase={purchase}
              open={ceramicoLabOpen}
              onOpenChange={setCeramicoLabOpen}
              onCompleted={onCompleted}
            />
          </div>
        ) : (
          /* Default: simple advance with checklist */
          <div className="space-y-2 pt-1 border-t border-border/40">
            {/* Sacola Pricing Panel for peca_sacola items */}
            {isSacolaPricing && (
              <div>
                <Button size="sm" variant="outline" className="w-full justify-between h-10 mb-2" onClick={() => setSacolaPricingOpen(true)}>
                  <span className="flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    Comparar e Precificar
                  </span>
                </Button>
                <SacolaPricingPanel
                  purchase={purchase}
                  open={sacolaPricingOpen}
                  onOpenChange={setSacolaPricingOpen}
                  onCompleted={onCompleted}
                />
              </div>
            )}
            {/* Standard Piece Pricing Panel for regular peca items */}
            {isPiecePricing && !isSacolaPricing && (
              <PiecePricingPanel purchase={purchase} onCompleted={onCompleted} />
            )}

            {/* Stage Checklist */}
            <StageChecklist
              purchaseId={purchase.id}
              status={purchase.status}
              onChecklistChange={handleChecklistChange}
            />

            {needsErp && missingErp && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 p-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-xs text-destructive">Preencha o campo "Boleto Syge" na compra antes de prosseguir.</p>
              </div>
            )}

            {canGeneratePdf && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" disabled={loading || (needsErp && missingErp)} onClick={async () => {
                  setLoading(true);
                  try {
                    let demos = await loadDemonstrativos(purchase.id);
                    if (demos.length === 0) {
                      await createDemonstrativo(purchase.id, purchase.totalBrl);
                      demos = await loadDemonstrativos(purchase.id);
                    }
                    const latest = demos[demos.length - 1];
                    if (!latest) { toast.error("Nenhum demonstrativo encontrado"); return; }
                     const url = await generateDemonstrativoPdf(purchase.id, latest.id);
                     const safeName = (s: string) => (s || "").replace(/[^a-zA-Z0-9-]/g, "_").replace(/_+/g, "_"); const fname = `${safeName(purchase.erpNumber)}_${safeName(purchase.purchaseNumber)}_${safeName(purchase.supplierName)}.pdf`; const a = document.createElement("a"); a.href = url; a.download = fname; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                  } catch { toast.error("Erro ao gerar PDF"); } finally { setLoading(false); }
                }}>
                  <FileDown className="h-3 w-3 mr-1" />PDF
                </Button>
                <Button size="sm" variant="outline" className="flex-1" disabled={loading || (needsErp && missingErp)} onClick={async () => {
                  setLoading(true);
                  try {
                    let demos = await loadDemonstrativos(purchase.id);
                    if (demos.length === 0) {
                      await createDemonstrativo(purchase.id, purchase.totalBrl);
                      demos = await loadDemonstrativos(purchase.id);
                    }
                    const latest = demos[demos.length - 1];
                    if (!latest) { toast.error("Nenhum demonstrativo encontrado"); return; }
                    const url = await generateDemonstrativoPdf(purchase.id, latest.id);
                    const blob = await fetch(url).then(r => r.blob());
                    const file = new File([blob], "demonstrativo.pdf", { type: "application/pdf" });
                    if (navigator.share && navigator.canShare({ files: [file] })) {
                      await navigator.share({ files: [file], title: `Demonstrativo ${purchase.purchaseNumber}` });
                    } else {
                      const msg = encodeURIComponent(`Demonstrativo de valores - Pedido ${purchase.purchaseNumber}`);
                      window.open(`https://wa.me/?text=${msg}`, "_blank");
                      toast.info("PDF gerado. Anexe o arquivo baixado na conversa do WhatsApp.");
                      const safeName = (s: string) => (s || "").replace(/[^a-zA-Z0-9-]/g, "_").replace(/_+/g, "_"); const fname = `${safeName(purchase.erpNumber)}_${safeName(purchase.purchaseNumber)}_${safeName(purchase.supplierName)}.pdf`; const a = document.createElement("a"); a.href = url; a.download = fname; a.click();
                    }
                  } catch { toast.error("Erro ao compartilhar"); } finally { setLoading(false); }
                }}>
                  <MessageCircle className="h-3 w-3 mr-1" />WhatsApp
                </Button>
              </div>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="default" className="w-full" disabled={loading || !checklistReady || (needsErp && missingErp)}>
                  {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                  Concluir {purchase.status}
                </Button>
              </AlertDialogTrigger>
              {enrichedDialogContent("Concluir etapa?", `A compra avançará de "${purchase.status}" para a próxima etapa.`, handleConfirm, "Confirmar")}
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
