import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, FlaskConical, Send, Loader2, AlertTriangle, ArrowRight, Scale, FileDown, MessageCircle, Search, Calculator, Undo2, Package, ArrowLeftRight, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Purchase, advanceStage, advanceOpStatus, registerAnalysis, handleWeightCheck, isInParallelPhase, getStatusColor, CerOpStatus, contestDemonstrativo, getItemLabel, getFlowStatuses, CER_OP_STATUSES, updatePurchaseErp } from "@/lib/purchases";
import { loadDemonstrativos, generateDemonstrativoPdf, createDemonstrativo } from "@/lib/demonstrativos";
import { toast } from "sonner";
import PurchaseSummary from "./PurchaseSummary";
import DemonstrativoViewDialog from "./DemonstrativoViewDialog";
import StageChecklist from "./StageChecklist";
import TripleAnalysisForm from "./TripleAnalysisForm";
import PiecePricingPanel from "./PiecePricingPanel";
import SacolaConferenciaPanel from "./SacolaConferenciaPanel";
import SacolaLabPanel from "./SacolaLabPanel";
import SacolaPricingPanel from "./SacolaPricingPanel";
import CeramicoConferenciaPanel from "./CeramicoConferenciaPanel";
import CeramicoTrituracaoPanel from "./CeramicoTrituracaoPanel";
import CeramicoLabPanel from "./CeramicoLabPanel";
import CeramicoPricingPanel from "./CeramicoPricingPanel";
import { STAGE_REQUIREMENTS } from "@/lib/stage-tasks";
import { fmtNum, fmtBrl } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

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
  const { role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [ptPpm, setPtPpm] = useState("");
  const [pdPpm, setPdPpm] = useState("");
  const [rhPpm, setRhPpm] = useState("");
  const [notes, setNotes] = useState("");
  const [weightReal, setWeightReal] = useState("");
  const [contestMotivo, setContestMotivo] = useState("");
  const [contestDialogOpen, setContestDialogOpen] = useState(false);
  const [contestStep, setContestStep] = useState<"motivo" | "destino">("motivo");
  const [checklistReady, setChecklistReady] = useState(true);
  const [conferenciaOpen, setConferenciaOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [sacolaPricingOpen, setSacolaPricingOpen] = useState(false);
  const [ceramicoConferenciaOpen, setCeramicoConferenciaOpen] = useState(false);
  const [ceramicoTrituracaoOpen, setCeramicoTrituracaoOpen] = useState(false);
  const [ceramicoLabOpen, setCeramicoLabOpen] = useState(false);
  const [ceramicoPricingOpen, setCeramicoPricingOpen] = useState(false);
  const [viewDemoOpen, setViewDemoOpen] = useState(false);
  const [erpInput, setErpInput] = useState("");
  const [savingErp, setSavingErp] = useState(false);

  // Admin manual stage move
  const [adminMoveOpen, setAdminMoveOpen] = useState(false);
  const [adminTargetStatus, setAdminTargetStatus] = useState("");
  const [adminTargetOpStatus, setAdminTargetOpStatus] = useState("");
  const [adminMoveNote, setAdminMoveNote] = useState("");

  const isSuperAdmin = role === "super_admin";

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
  const isCeramicoTrituracao = purchase.status === "Cerâmico: Em Trituração/Homogeneização" && purchase.materialFlow === "ceramico";
  const isCeramicoLab = purchase.status === "Cerâmico: Lab em Análise" && purchase.materialFlow === "ceramico";
  const isCeramicoPricing = purchase.status === "Cerâmico: Em Precificação" && purchase.materialFlow === "ceramico";

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

  const handleSaveErp = async () => {
    const val = erpInput.trim();
    if (!val) return;
    setSavingErp(true);
    try {
      const ok = await updatePurchaseErp(purchase.id, val);
      if (ok) {
        toast.success("Boleto Syge salvo");
        setErpInput("");
        onCompleted();
      } else {
        toast.error("Erro ao salvar Boleto Syge");
      }
    } finally {
      setSavingErp(false);
    }
  };

  const ErpInlineInput = (
    <div className="rounded-md bg-destructive/10 border border-destructive/30 p-2 space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
        <p className="text-xs text-destructive font-medium">Informe o Boleto Syge (ERP) para prosseguir</p>
      </div>
      <div className="flex gap-2">
        <Input
          value={erpInput}
          onChange={(e) => setErpInput(e.target.value)}
          placeholder="Número do Boleto Syge"
          className="h-8 text-xs"
        />
        <Button size="sm" className="h-8 text-xs" disabled={!erpInput.trim() || savingErp} onClick={handleSaveErp}>
          {savingErp ? <Loader2 className="h-3 w-3 animate-spin" /> : "Salvar"}
        </Button>
      </div>
    </div>
  );

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

  const handleContestSubmit = async () => {
    if (!contestMotivo.trim()) return;
    setLoading(true);
    try {
      const demos = await loadDemonstrativos(purchase.id);
      const latest = demos[demos.length - 1];
      if (!latest) {
        toast.error("Nenhum demonstrativo encontrado");
        return;
      }
      await contestDemonstrativo(latest.id, contestMotivo.trim());
      setContestStep("destino");
    } catch {
      toast.error("Erro ao contestar demonstrativo");
    } finally {
      setLoading(false);
    }
  };

  const handleContestDestination = async (dest: "analise" | "conferencia") => {
    setLoading(true);
    try {
      let newStatus = "Em Conferência";
      if (dest === "analise") {
        if (purchase.materialFlow === "ceramico") {
          newStatus = "Cerâmico: Lab em Análise";
        } else if (hasSacolaItems) {
          newStatus = "Peças: Laboratório";
        } else {
          newStatus = "Peças: Trituração e Amostragem";
        }
      }

      const historyEntry = {
        status: newStatus,
        date: new Date().toISOString(),
        note: `Contestado: ${contestMotivo.trim()} → Devolvido para ${dest === "analise" ? "Análise" : "Conferência"}`,
      };

      await supabase
        .from("purchases")
        .update({
          status: newStatus,
          status_history: [...(purchase.statusHistory || []).map(h => ({ status: h.status, date: h.date, note: (h as any).note })), historyEntry],
        })
        .eq("id", purchase.id);

      toast.success(`Processo devolvido para ${dest === "analise" ? "Análise" : "Conferência"}`);
      setContestDialogOpen(false);
      setContestStep("motivo");
      setContestMotivo("");
      onCompleted();
    } catch {
      toast.error("Erro ao devolver processo");
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

  const handleAdminMove = async () => {
    if (!adminTargetStatus) return;
    setLoading(true);
    try {
      const { data: current } = await supabase.from("purchases").select("status_history").eq("id", purchase.id).single();
      const history = [...((current?.status_history as any[]) || []), {
        status: adminTargetStatus,
        date: new Date().toISOString(),
        note: `Movido manualmente pelo admin${adminMoveNote ? `: ${adminMoveNote}` : ""}`,
      }];

      const updateData: any = { status: adminTargetStatus, status_history: history };

      // Ao mover para "Cerâmico: Aprovado", inicializa fluxo operacional
      if (adminTargetStatus === "Cerâmico: Aprovado") {
        updateData.op_status = "Alocando Bag";
      }

      // Permite sobrescrever sub-status operacional
      if (adminTargetOpStatus) updateData.op_status = adminTargetOpStatus;

      await supabase.from("purchases").update(updateData).eq("id", purchase.id);
      toast.success(`Etapa alterada para: ${adminTargetStatus}`);
      setAdminMoveOpen(false);
      setAdminTargetStatus("");
      setAdminTargetOpStatus("");
      setAdminMoveNote("");
      onCompleted();
    } catch {
      toast.error("Erro ao alterar etapa");
    } finally {
      setLoading(false);
    }
  };


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
          {isSuperAdmin && (
            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" title="Alterar Etapa (Admin)" onClick={() => { setAdminTargetStatus(purchase.status); setAdminMoveOpen(true); }}>
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </Button>
          )}
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
            <p className="text-xs font-medium text-muted-foreground">Alocação em Bag</p>
            <div className="space-y-1 p-2 rounded-md border bg-muted/30">
              <p className="text-[10px] font-semibold text-muted-foreground">📦 Operacional</p>
              <Badge variant="outline" className={`text-[10px] ${getStatusColor(purchase.opStatus || "")}`}>
                {purchase.opStatus}
              </Badge>
              <p className="text-[10px] text-muted-foreground">
                Material enviado ao módulo Bags. Após a alocação de todos os grupos, o processo será encerrado automaticamente.
              </p>
              {purchase.opStatus !== "Bag Alocado" && (
                <Button size="sm" variant="outline" className="w-full h-7 text-[10px]" disabled={loading} onClick={handleOpAdvance}>
                  {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3 mr-1" />}
                  Marcar como Bag Alocado
                </Button>
              )}
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
            {missingErp && ErpInlineInput}
            {purchase.materialFlow === "ceramico" && (
              <>
                <Button size="sm" variant="outline" className="w-full" onClick={() => setCeramicoPricingOpen(true)}>
                  <Calculator className="h-3 w-3 mr-1" /> Ver Precificação dos Lotes
                </Button>
                <CeramicoPricingPanel
                  purchase={purchase}
                  open={ceramicoPricingOpen}
                  onOpenChange={setCeramicoPricingOpen}
                  onCompleted={onCompleted}
                />
              </>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" disabled={loading} onClick={() => setViewDemoOpen(true)}>
                <Eye className="h-3 w-3 mr-1" />Visualizar
              </Button>
              <Button size="sm" variant="outline" className="flex-1" disabled={loading} onClick={async () => {
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
              {/* WhatsApp temporariamente desativado */}
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
                      {loading ? "Processando..." : purchase.materialFlow === "pecas" ? "Confirmar e Alocar" : purchase.materialFlow === "ceramico" ? "Confirmar e Alocar ao Bag" : "Confirmar Aprovação"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button size="sm" variant="destructive" className="flex-1" disabled={loading} onClick={() => { setContestStep("motivo"); setContestMotivo(""); setContestDialogOpen(true); }}>
                <AlertTriangle className="h-3 w-3 mr-1" />Contestar
              </Button>
              <Dialog open={contestDialogOpen} onOpenChange={(open) => { if (!open) { setContestDialogOpen(false); setContestStep("motivo"); setContestMotivo(""); } }}>
                <DialogContent className="max-w-md">
                  {contestStep === "motivo" ? (
                    <>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                          Contestar demonstrativo
                        </DialogTitle>
                        <DialogDescription>Informe o motivo da contestação para devolver o processo.</DialogDescription>
                      </DialogHeader>
                      <PurchaseSummary purchase={purchase} showPdf={isDemonstrative} />
                      <Textarea placeholder="Motivo da contestação..." value={contestMotivo} onChange={(e) => setContestMotivo(e.target.value)} className="text-sm min-h-[80px]" />
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setContestDialogOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" disabled={loading || !contestMotivo.trim()} onClick={handleContestSubmit}>
                          {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                          Contestar
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Undo2 className="h-5 w-5 text-amber-600" />
                          Para onde devolver o processo?
                        </DialogTitle>
                        <DialogDescription>Escolha a etapa para onde o processo será devolvido.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <button
                          className="w-full text-left rounded-lg border border-border p-4 hover:bg-accent/50 hover:border-primary/40 transition-colors space-y-1"
                          disabled={loading}
                          onClick={() => handleContestDestination("analise")}
                        >
                          <div className="flex items-center gap-2">
                            <FlaskConical className="h-5 w-5 text-blue-600" />
                            <span className="font-medium text-sm">Voltar para Análise</span>
                          </div>
                          <p className="text-xs text-muted-foreground pl-7">
                            Reabrirá a etapa de laboratório para registrar novos resultados de análise.
                          </p>
                        </button>
                        <button
                          className="w-full text-left rounded-lg border border-border p-4 hover:bg-accent/50 hover:border-primary/40 transition-colors space-y-1"
                          disabled={loading}
                          onClick={() => handleContestDestination("conferencia")}
                        >
                          <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-orange-600" />
                            <span className="font-medium text-sm">Voltar para Conferência</span>
                          </div>
                          <p className="text-xs text-muted-foreground pl-7">
                            Reabrirá a conferência para verificar pesos ou materiais faltantes.
                          </p>
                        </button>
                      </div>
                      <div className="flex justify-end">
                        <Button variant="outline" onClick={() => { setContestDialogOpen(false); setContestStep("motivo"); }}>Cancelar</Button>
                      </div>
                    </>
                  )}
                </DialogContent>
              </Dialog>
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
        ) : isCeramicoTrituracao ? (
          /* Cerâmico: Trituração/Homogeneização/Amostragem — TARA + foto por grupo */
          <div className="space-y-2 pt-1 border-t border-border/40">
            <Button size="sm" className="w-full" onClick={() => setCeramicoTrituracaoOpen(true)}>
              <Scale className="h-3 w-3 mr-1" /> Iniciar Trituração/Homogeneização
            </Button>
            <CeramicoTrituracaoPanel
              purchase={purchase}
              open={ceramicoTrituracaoOpen}
              onOpenChange={setCeramicoTrituracaoOpen}
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
        ) : isCeramicoPricing ? (
          /* Cerâmico Pricing: Precificação por lote */
          <div className="space-y-2 pt-1 border-t border-border/40">
            <Button size="sm" className="w-full" onClick={() => setCeramicoPricingOpen(true)}>
              <Calculator className="h-3 w-3 mr-1" /> Precificar Lotes
            </Button>
            <CeramicoPricingPanel
              purchase={purchase}
              open={ceramicoPricingOpen}
              onOpenChange={setCeramicoPricingOpen}
              onCompleted={onCompleted}
            />
          </div>
        ) : (
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

            {needsErp && missingErp && ErpInlineInput}

            {canGeneratePdf && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" disabled={loading || (needsErp && missingErp)} onClick={() => setViewDemoOpen(true)}>
                  <Eye className="h-3 w-3 mr-1" />Visualizar
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
                     const safeName = (s: string) => (s || "").replace(/[^a-zA-Z0-9-]/g, "_").replace(/_+/g, "_"); const fname = `${safeName(purchase.erpNumber)}_${safeName(purchase.purchaseNumber)}_${safeName(purchase.supplierName)}.pdf`; const a = document.createElement("a"); a.href = url; a.download = fname; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                  } catch { toast.error("Erro ao gerar PDF"); } finally { setLoading(false); }
                }}>
                  <FileDown className="h-3 w-3 mr-1" />PDF
                </Button>
                {/* WhatsApp temporariamente desativado */}
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

      {/* Admin Manual Stage Move Dialog */}
      <Dialog open={adminMoveOpen} onOpenChange={(open) => { if (!open) { setAdminMoveOpen(false); setAdminTargetStatus(""); setAdminTargetOpStatus(""); setAdminMoveNote(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-amber-600" />
              Alterar Etapa Manualmente
            </DialogTitle>
            <DialogDescription>Mover esta compra para outra etapa do fluxo. Esta ação será registrada no histórico.</DialogDescription>
          </DialogHeader>
          <PurchaseSummary purchase={purchase} />
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status Principal</label>
              <Select value={adminTargetStatus} onValueChange={setAdminTargetStatus}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {getFlowStatuses(purchase.materialFlow as any).map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Parallel sub-status selectors for cerâmico */}
            {(adminTargetStatus === "Cerâmico: Aprovado" || isInParallelPhase(purchase)) && purchase.materialFlow === "ceramico" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">💰 Financeiro</label>
                  <Select value={adminTargetFinStatus} onValueChange={setAdminTargetFinStatus}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Manter atual" />
                    </SelectTrigger>
                    <SelectContent>
                      {CER_FIN_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">📦 Operacional</label>
                  <Select value={adminTargetOpStatus} onValueChange={setAdminTargetOpStatus}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Manter atual" />
                    </SelectTrigger>
                    <SelectContent>
                      {CER_OP_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Observação (opcional)</label>
              <Textarea placeholder="Motivo da alteração..." value={adminMoveNote} onChange={(e) => setAdminMoveNote(e.target.value)} className="text-sm min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdminMoveOpen(false)}>Cancelar</Button>
            <Button disabled={loading || !adminTargetStatus} onClick={handleAdminMove}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Confirmar Movimentação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DemonstrativoViewDialog open={viewDemoOpen} onOpenChange={setViewDemoOpen} purchase={purchase} />
    </Card>
  );
}
