import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, FlaskConical, FileText, FileDown, MessageCircle, Package, Camera, Scale, FileText as NoteIcon } from "lucide-react";
import { Purchase, PurchaseQuoteItem, getStatusColor, isInParallelPhase } from "@/lib/purchases";
import { loadLabResults, LabResult } from "@/lib/lab-results";
import { loadDemonstrativos, Demonstrativo, generateDemonstrativoPdf } from "@/lib/demonstrativos";
import { loadEvidences, StageEvidence, loadLabAnalyses, LabAnalysis } from "@/lib/stage-tasks";
import { toast } from "sonner";
import { fmtNum, fmtBrl } from "@/lib/utils";

const fmt = (n: number, d = 2) => fmtNum(n, d);

const itemTypeLabels: Record<string, string> = {
  peca: "Peça",
  peca_sacola: "Peça em Sacola",
  ceramico: "Cerâmico",
};

function getItemValue(q: PurchaseQuoteItem): number {
  if (q.itemType === "peca" || (q.itemType === "peca_sacola" && !q.result)) {
    return q.totalValue || 0;
  }
  return q.result?.finalValueBrl || 0;
}

export default function PurchaseDetail({ purchase, onClose }: { purchase: Purchase | null; onClose: () => void }) {
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [demonstrativos, setDemonstrativos] = useState<Demonstrativo[]>([]);

  useEffect(() => {
    if (purchase) {
      loadLabResults(purchase.id).then(setLabResults);
      loadDemonstrativos(purchase.id).then(setDemonstrativos);
    } else {
      setLabResults([]);
      setDemonstrativos([]);
    }
  }, [purchase?.id]);

  if (!purchase) return null;

  return (
    <Dialog open={!!purchase} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Compra {purchase.purchaseNumber} — {purchase.supplierName}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Nº Pedido</p>
            <p className="font-mono">{purchase.purchaseNumber}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge variant="outline" className={getStatusColor(purchase.status)}>{purchase.status}</Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Comprador</p>
            <p>{purchase.buyer || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fluxo</p>
            <Badge variant="outline" className={purchase.materialFlow === "ceramico" ? "bg-orange-500/10 text-orange-700 border-orange-300" : "bg-blue-500/10 text-blue-700 border-blue-300"}>
              {purchase.materialFlow === "ceramico" ? "Cerâmico" : purchase.materialFlow === "pecas" ? "Peças" : "Legado"}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            {purchase.totalBrl > 0 ? (
              <p className="font-semibold text-primary">{fmtBrl(purchase.totalBrl)}</p>
            ) : (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300 text-xs">Pendente</Badge>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Boleto Syge</p>
            <p className={purchase.erpNumber ? "font-mono" : "text-red-500"}>{purchase.erpNumber || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Itens</p>
            <p>{purchase.items.length} item(ns)</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Data</p>
            <p>{new Date(purchase.date).toLocaleString("pt-BR")}</p>
          </div>
        </div>

        {/* Bulk Weight (Material a Classificar) */}
        {purchase.bulkWeight != null && purchase.bulkWeight > 0 && (
          <>
            <Separator />
            <div className="rounded-md border p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Package className="h-3 w-3" />
                Material a Classificar
              </p>
              <p className="text-sm font-semibold">{fmt(purchase.bulkWeight, 4)} kg</p>
            </div>
          </>
        )}

        {/* Weight divergence alert */}
        {purchase.weightLoss != null && Math.abs(purchase.weightLoss) > 0.5 && (
          <>
            <Separator />
            <div className="rounded-md bg-red-500/10 border border-red-300 p-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-700" />
              <div className="text-sm text-red-700">
                <p className="font-semibold">Divergência de peso detectada</p>
                <p className="text-xs">Declarado: {fmtNum(purchase.weightDeclared ?? 0, 4)} kg | Real: {fmtNum(purchase.weightReal ?? 0, 4)} kg | Perda: {fmtNum(Math.abs(purchase.weightLoss), 4)} kg</p>
              </div>
            </div>
          </>
        )}

        {/* Parallel sub-flows (cerâmico) */}
        {isInParallelPhase(purchase) && (
          <>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">💰 Sub-fluxo Financeiro</p>
                <Badge variant="outline" className={`text-xs ${getStatusColor(purchase.finStatus || "")}`}>{purchase.finStatus}</Badge>
              </div>
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">📦 Sub-fluxo Operacional</p>
                <Badge variant="outline" className={`text-xs ${getStatusColor(purchase.opStatus || "")}`}>{purchase.opStatus}</Badge>
              </div>
            </div>
          </>
        )}

        {purchase.notes && (
          <>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Observações</p>
              <p className="text-sm">{purchase.notes}</p>
            </div>
          </>
        )}

        {/* Weight tracking summary */}
        {(() => {
          const itemsWithWeight = purchase.items.filter(q => q.weight && q.weight > 0);
          const itemsWithReal = itemsWithWeight.filter(q => q.weightReal != null);
          if (itemsWithReal.length === 0) return null;
          const totalCatalog = itemsWithWeight.reduce((s, q) => s + (q.weight || 0), 0);
          const totalReal = itemsWithReal.reduce((s, q) => s + (q.weightReal || 0), 0);
          const totalLoss = totalCatalog - totalReal;
          const lossPercent = totalCatalog > 0 ? (totalLoss / totalCatalog) * 100 : 0;
          return (
            <>
              <Separator />
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Resumo de Peso Real
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Catálogo</p>
                    <p className="font-semibold">{fmtNum(totalCatalog, 4)} kg</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Real</p>
                    <p className="font-semibold">{fmtNum(totalReal, 4)} kg</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Perda</p>
                    <p className={`font-semibold ${totalLoss > 0 ? "text-red-600" : "text-green-600"}`}>
                      {fmtNum(totalLoss, 4)} kg ({fmtNum(lossPercent, 2)}%)
                    </p>
                  </div>
                </div>
              </div>
            </>
          );
        })()}

        <Separator />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">#</TableHead>
              <TableHead className="text-xs">Tipo</TableHead>
              <TableHead className="text-xs">Categoria</TableHead>
              <TableHead className="text-xs text-right">Qtd/Peso</TableHead>
              <TableHead className="text-xs text-right">Peso Real</TableHead>
              <TableHead className="text-xs text-right">Perda</TableHead>
              <TableHead className="text-xs text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchase.items.map((q, i) => {
              const val = getItemValue(q);
              return (
                <TableRow key={q.id}>
                  <TableCell className="text-xs">{i + 1}</TableCell>
                  <TableCell className="text-xs">{itemTypeLabels[q.itemType] ?? q.itemType}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{q.category || "—"}</TableCell>
                  <TableCell className="text-xs text-right">
                    {q.itemType === "peca"
                      ? `${q.quantity || 0} pç`
                      : q.itemType === "peca_sacola" && !q.input
                        ? `${q.quantity || 0} pç${q.weight ? ` / ${fmt(q.weight, 4)} kg` : ""}`
                        : q.input ? `${fmt(q.input.grossWeight - q.input.tare, 4)} kg` : (q.weight ? `${fmt(q.weight, 4)} kg` : "-")}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {q.weightReal != null ? `${fmt(q.weightReal, 4)} kg` : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {q.weightLoss != null ? (
                      <span className={q.weightLoss > 0 ? "text-red-600 font-semibold" : "text-green-600"}>
                        {q.weightLoss > 0 ? `-${fmt(q.weightLoss, 4)}` : fmt(q.weightLoss, 4)} kg
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-right font-semibold">
                    {val > 0 ? fmtBrl(val) : (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300 text-[10px]">Pendente</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Lab Results History */}
        {labResults.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <FlaskConical className="h-3 w-3" />
                Histórico de Análises Laboratoriais
              </p>
              <div className="space-y-2">
                {labResults.map((lr) => (
                  <div key={lr.id} className="rounded-md border p-2 text-xs flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[10px]">v{lr.versao}</Badge>
                      <span>Pt: {fmt(lr.ptPpm, 4)} | Pd: {fmt(lr.pdPpm, 4)} | Rh: {fmt(lr.rhPpm, 4)}</span>
                    </div>
                    <span className="text-muted-foreground">{new Date(lr.createdAt).toLocaleString("pt-BR")}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Demonstrativos History */}
        {demonstrativos.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Histórico de Demonstrativos
              </p>
              <div className="space-y-2">
                {demonstrativos.map((d) => (
                  <div key={d.id} className="rounded-md border p-2 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">v{d.versao}</Badge>
                        <Badge variant="outline" className={`text-[10px] ${
                          d.status === "aprovado" ? "bg-green-500/10 text-green-700 border-green-300" :
                          d.status === "contestado" ? "bg-red-500/10 text-red-700 border-red-300" :
                          "bg-yellow-500/10 text-yellow-700 border-yellow-300"
                        }`}>{d.status}</Badge>
                        <span className="font-semibold">{fmtBrl(d.valorTotal)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={async () => {
                          try {
                            const url = await generateDemonstrativoPdf(purchase.id, d.id);
                            window.open(url, "_blank");
                          } catch { toast.error("Erro ao gerar PDF"); }
                        }}>
                          <FileDown className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={async () => {
                          try {
                            const url = await generateDemonstrativoPdf(purchase.id, d.id);
                            const blob = await fetch(url).then(r => r.blob());
                            const file = new File([blob], "demonstrativo.pdf", { type: "application/pdf" });
                            if (navigator.share && navigator.canShare({ files: [file] })) {
                              await navigator.share({ files: [file], title: `Demonstrativo ${purchase.purchaseNumber}` });
                            } else {
                              const msg = encodeURIComponent(`Demonstrativo de valores - Pedido ${purchase.purchaseNumber}`);
                              window.open(`https://wa.me/?text=${msg}`, "_blank");
                              const a = document.createElement("a"); a.href = url; a.download = "demonstrativo.pdf"; a.click();
                              toast.info("PDF gerado. Anexe na conversa do WhatsApp.");
                            }
                          } catch { toast.error("Erro ao compartilhar"); }
                        }}>
                          <MessageCircle className="h-3 w-3" />
                        </Button>
                        <span className="text-muted-foreground">{new Date(d.enviadoEm).toLocaleString("pt-BR")}</span>
                      </div>
                    </div>
                    {d.motivoContestacao && (
                      <p className="text-muted-foreground italic">Motivo: {d.motivoContestacao}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <Separator />
        <div>
          <p className="text-xs text-muted-foreground mb-1">Histórico de Status</p>
          <div className="space-y-1">
            {purchase.statusHistory.map((sh, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span>{sh.status}</span>
                <span className="text-muted-foreground">{new Date(sh.date).toLocaleString("pt-BR")}</span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
