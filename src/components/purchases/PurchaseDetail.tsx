import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Purchase, PurchaseQuoteItem } from "@/lib/purchases";

const fmtBrl = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (n: number, d = 2) => n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

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
  if (!purchase) return null;

  return (
    <Dialog open={!!purchase} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Compra — {purchase.supplierName}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Data</p>
            <p>{new Date(purchase.date).toLocaleString("pt-BR")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge variant="outline">{purchase.status}</Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-semibold text-primary">{fmtBrl(purchase.totalBrl)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Itens</p>
            <p>{purchase.items.length} item(ns)</p>
          </div>
        </div>

        {purchase.notes && (
          <>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Observações</p>
              <p className="text-sm">{purchase.notes}</p>
            </div>
          </>
        )}

        <Separator />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">#</TableHead>
              <TableHead className="text-xs">Tipo</TableHead>
              <TableHead className="text-xs text-right">Qtd/Peso</TableHead>
              <TableHead className="text-xs text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchase.items.map((q, i) => (
              <TableRow key={q.id}>
                <TableCell className="text-xs">{i + 1}</TableCell>
                <TableCell className="text-xs">{itemTypeLabels[q.itemType] ?? q.itemType}</TableCell>
                <TableCell className="text-xs text-right">
                  {q.itemType === "peca" || (q.itemType === "peca_sacola" && !q.input)
                    ? `${q.quantity || 0} pç`
                    : q.input ? `${fmt(q.input.grossWeight - q.input.tare, 2)} kg` : "-"}
                </TableCell>
                <TableCell className="text-xs text-right font-semibold">{fmtBrl(getItemValue(q))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

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
