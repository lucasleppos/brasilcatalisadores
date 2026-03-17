import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileDown, MessageCircle, Loader2, ArrowRight } from "lucide-react";
import { Purchase, getNextStatus, getStatusColor } from "@/lib/purchases";
import { loadDemonstrativos, generateDemonstrativoPdf } from "@/lib/demonstrativos";
import { toast } from "sonner";
import { useState } from "react";
import { fmtNum, fmtBrl } from "@/lib/utils";

function timeSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "< 1h";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

interface PurchaseSummaryProps {
  purchase: Purchase;
  showPdf?: boolean;
}

export default function PurchaseSummary({ purchase, showPdf }: PurchaseSummaryProps) {
  const [loading, setLoading] = useState(false);
  const lastChange = purchase.statusHistory[purchase.statusHistory.length - 1];
  const timeInStage = lastChange ? timeSince(lastChange.date) : "—";
  const nextStatus = getNextStatus(purchase.status, purchase.materialFlow);

  const handlePdf = async () => {
    setLoading(true);
    try {
      const demos = await loadDemonstrativos(purchase.id);
      const latest = demos[demos.length - 1];
      if (!latest) { toast.error("Nenhum demonstrativo encontrado"); return; }
      const url = await generateDemonstrativoPdf(purchase.id, latest.id);
      const safeName = (s: string) => (s || "").replace(/[^a-zA-Z0-9-]/g, "_").replace(/_+/g, "_"); const fname = `${safeName(purchase.erpNumber)}_${safeName(purchase.purchaseNumber)}_${safeName(purchase.supplierName)}.pdf`; const a = document.createElement("a"); a.href = url; a.download = fname; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { toast.error("Erro ao gerar PDF"); } finally { setLoading(false); }
  };

  const handleWhatsApp = async () => {
    setLoading(true);
    try {
      const demos = await loadDemonstrativos(purchase.id);
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
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        <div className="text-muted-foreground">Pedido</div>
        <div className="font-mono font-semibold">{purchase.purchaseNumber}</div>

        <div className="text-muted-foreground">Boleto Syge</div>
        <div className={purchase.erpNumber ? "font-mono" : "text-red-500"}>
          {purchase.erpNumber || "—"}
        </div>

        <div className="text-muted-foreground">Fornecedor</div>
        <div className="font-medium">{purchase.supplierName}</div>

        {purchase.buyer && <>
          <div className="text-muted-foreground">Comprador</div>
          <div>{purchase.buyer}</div>
        </>}

        <div className="text-muted-foreground">Fluxo</div>
        <div>
          <Badge variant="outline" className={`text-[10px] ${purchase.materialFlow === "ceramico" ? "bg-orange-500/10 text-orange-700 border-orange-300" : "bg-blue-500/10 text-blue-700 border-blue-300"}`}>
            {purchase.materialFlow === "ceramico" ? "Cerâmico" : "Peças"}
          </Badge>
        </div>

        <div className="text-muted-foreground">Valor</div>
        <div className="font-semibold">{purchase.totalBrl > 0 ? fmtBrl(purchase.totalBrl) : "Pendente"}</div>

        <div className="text-muted-foreground">Itens</div>
        <div>{purchase.items.length} {purchase.items.length === 1 ? "item" : "itens"}</div>

        <div className="text-muted-foreground">Tempo na etapa</div>
        <div>{timeInStage}</div>

        {purchase.weightDeclared != null && <>
          <div className="text-muted-foreground">Peso declarado</div>
          <div>{fmtNum(purchase.weightDeclared, 4)} kg</div>
        </>}

        {purchase.weightReal != null && <>
          <div className="text-muted-foreground">Peso real</div>
          <div>{fmtNum(purchase.weightReal, 4)} kg</div>
        </>}
      </div>

      <Separator />

      <div className="flex items-center gap-2 text-sm">
        <Badge variant="outline" className={`text-[10px] ${getStatusColor(purchase.status)}`}>
          {purchase.status}
        </Badge>
        {nextStatus && <>
          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
          <Badge variant="outline" className={`text-[10px] ${getStatusColor(nextStatus)}`}>
            {nextStatus}
          </Badge>
        </>}
      </div>

      {showPdf && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="flex-1" disabled={loading} onClick={handlePdf}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <FileDown className="h-3 w-3 mr-1" />}
            PDF
          </Button>
          <Button size="sm" variant="outline" className="flex-1" disabled={loading} onClick={handleWhatsApp}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <MessageCircle className="h-3 w-3 mr-1" />}
            WhatsApp
          </Button>
        </div>
      )}
    </div>
  );
}
