import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalculatorInput, CalculatorResult } from "@/lib/calculator";
import { X, Send } from "lucide-react";

export interface QuoteItem {
  id: string;
  input: CalculatorInput;
  result: CalculatorResult;
}

const fmt = (n: number, decimals = 2) => n.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
const fmtBrl = (n: number) => `R$ ${fmt(n)}`;

const entryLabels: Record<string, string> = {
  peca_fechada: "Peça Fechada",
  peca_sacola: "Peça Sacola",
  grupo: "Grupo",
};

export default function QuoteList({ items, onRemove, onSendToPurchases }: { items: QuoteItem[]; onRemove: (id: string) => void; onSendToPurchases?: () => void }) {
  if (items.length === 0) return null;

  const total = items.reduce((sum, q) => sum + q.result.finalValueBrl, 0);

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Lista de Cotações</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{items.length} item(ns)</span>
          {onSendToPurchases && (
            <Button size="sm" variant="default" className="h-7 text-xs" onClick={onSendToPurchases}>
              <Send className="mr-1 h-3 w-3" />Enviar para Compras
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">#</TableHead>
              <TableHead className="text-xs">Tipo</TableHead>
              <TableHead className="text-xs text-right">Peso (kg)</TableHead>
              <TableHead className="text-xs text-right">Pt ppm</TableHead>
              <TableHead className="text-xs text-right">Pd ppm</TableHead>
              <TableHead className="text-xs text-right">Rh ppm</TableHead>
              <TableHead className="text-xs text-right">Valor (BRL)</TableHead>
              <TableHead className="text-xs w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((q, i) => (
              <TableRow key={q.id}>
                <TableCell className="py-1.5 text-xs">{i + 1}</TableCell>
                <TableCell className="py-1.5 text-xs">{entryLabels[q.input.entryType] ?? q.input.entryType}</TableCell>
                <TableCell className="py-1.5 text-xs text-right">{fmt(q.input.grossWeight - q.input.tare, 4)}</TableCell>
                <TableCell className="py-1.5 text-xs text-right">{fmt(q.input.ptPpm, 0)}</TableCell>
                <TableCell className="py-1.5 text-xs text-right">{fmt(q.input.pdPpm, 0)}</TableCell>
                <TableCell className="py-1.5 text-xs text-right">{fmt(q.input.rhPpm, 0)}</TableCell>
                <TableCell className="py-1.5 text-xs text-right font-semibold">{fmtBrl(q.result.finalValueBrl)}</TableCell>
                <TableCell className="py-1.5">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemove(q.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/30">
              <TableCell colSpan={6} className="py-2 text-xs font-semibold text-right">Total</TableCell>
              <TableCell className="py-2 text-xs text-right font-bold text-primary">{fmtBrl(total)}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
