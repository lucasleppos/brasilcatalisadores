import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Purchase } from "@/lib/purchases";

const fmtBrl = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (n: number, d = 2) => n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

const entryLabels: Record<string, string> = {
  peca_fechada: "Peça Fechada",
  peca_sacola: "Peça Sacola",
  grupo: "Grupo",
};

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
            <p>{purchase.items.length} cotação(ões)</p>
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
              <TableHead className="text-xs text-right">Peso (kg)</TableHead>
              <TableHead className="text-xs text-right">Pt</TableHead>
              <TableHead className="text-xs text-right">Pd</TableHead>
              <TableHead className="text-xs text-right">Rh</TableHead>
              <TableHead className="text-xs text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchase.items.map((q, i) => (
              <TableRow key={q.id}>
                <TableCell className="text-xs">{i + 1}</TableCell>
                <TableCell className="text-xs">{entryLabels[q.input.entryType] ?? q.input.entryType}</TableCell>
                <TableCell className="text-xs text-right">{fmt(q.input.grossWeight - q.input.tare, 4)}</TableCell>
                <TableCell className="text-xs text-right">{fmt(q.input.ptPpm, 0)}</TableCell>
                <TableCell className="text-xs text-right">{fmt(q.input.pdPpm, 0)}</TableCell>
                <TableCell className="text-xs text-right">{fmt(q.input.rhPpm, 0)}</TableCell>
                <TableCell className="text-xs text-right font-semibold">{fmtBrl(q.result.finalValueBrl)}</TableCell>
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
