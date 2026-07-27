import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  Purchase,
  getConferenciaItems,
  getOriginalItems,
  batchUpdateItemPricing,
} from "@/lib/purchases";
import { fmtBrl } from "@/lib/utils";

interface PiecePricingPanelProps {
  purchase: Purchase;
  onCompleted: () => void;
}

const parseNum = (v: string) => {
  const n = parseFloat((v || "").replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};

const fmtWeight = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

export default function PiecePricingPanel({ purchase, onCompleted }: PiecePricingPanelProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unitValues, setUnitValues] = useState<Record<string, string>>({});

  // Itens conferidos (category = "conferencia"); fallback para compras antigas
  const items = useMemo(() => {
    const conf = getConferenciaItems(purchase).filter(
      i => i.itemType === "peca" || i.itemType === "peca_sacola"
    );
    if (conf.length > 0) return conf;
    return getOriginalItems(purchase).filter(
      i => i.itemType === "peca" || i.itemType === "peca_sacola"
    );
  }, [purchase]);

  const totalQty = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
  const totalWeight = items.reduce((sum, i) => sum + (i.weight || 0), 0);

  useEffect(() => {
    if (!open) return;
    const initial: Record<string, string> = {};
    items.forEach(i => {
      const q = i.quantity || 1;
      const unit = (i.totalValue || 0) / q;
      initial[i.id] = unit > 0 ? unit.toFixed(2).replace(".", ",") : "";
    });
    setUnitValues(initial);
  }, [open, purchase.id]);

  const computedTotal = items.reduce(
    (sum, i) => sum + parseNum(unitValues[i.id] || "") * (i.quantity || 1),
    0
  );

  const handleSave = async () => {
    const updates = items
      .filter(i => parseNum(unitValues[i.id] || "") > 0)
      .map(i => ({
        itemId: i.id,
        totalValue: parseNum(unitValues[i.id] || "") * (i.quantity || 1),
        pricingSource: "catalogo" as const,
      }));

    if (updates.length === 0) {
      toast.error("Informe ao menos um valor unitário");
      return;
    }

    setSaving(true);
    try {
      await batchUpdateItemPricing(purchase.id, updates);
      toast.success("Precificação salva");
      setOpen(false);
      onCompleted();
    } catch {
      toast.error("Erro ao salvar precificação");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-2 pt-1 border-t border-border/40">
        <Button
          variant="outline"
          className="w-full justify-between h-10"
          onClick={() => setOpen(true)}
        >
          <span className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Precificar Peças Conferidas
          </span>
          <span className="flex items-center gap-2">
            {items.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {totalQty} peças · {fmtBrl(purchase.totalBrl)}
              </Badge>
            )}
            <ChevronRight className="h-4 w-4" />
          </span>
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-lg">Precificação de Peças</DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  Pedido {purchase.purchaseNumber} · {purchase.supplierName} — peças da conferência (não é possível incluir novas peças)
                </DialogDescription>
              </div>
              {items.length > 0 && (
                <Badge className="text-sm px-3 py-1 shrink-0">
                  {totalQty} peças
                </Badge>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col border-t border-border">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-border bg-muted/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <div className="col-span-5">Peça</div>
              <div className="col-span-2 text-right">Qtd / Peso</div>
              <div className="col-span-3 text-right">Valor unit. (R$)</div>
              <div className="col-span-2 text-right">Subtotal</div>
            </div>

            <ScrollArea className="flex-1">
              {items.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-xs">
                  Nenhuma peça conferida encontrada
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {items.map((item, idx) => {
                    const qty = item.quantity || 1;
                    const unit = parseNum(unitValues[item.id] || "");
                    return (
                      <div key={item.id} className="grid grid-cols-12 gap-2 items-center px-4 py-2.5">
                        <div className="col-span-5 min-w-0">
                          <p className="text-sm font-medium truncate">
                            <span className="text-muted-foreground text-xs mr-1">Código:</span>
                            {item.catalogPartCode || item.category || `Item ${idx + 1}`}
                          </p>
                          {item.catalogPartRef && (
                            <p className="text-xs text-muted-foreground truncate">
                              Referência: {item.catalogPartRef}
                            </p>
                          )}
                        </div>
                        <div className="col-span-2 text-right">
                          <p className="text-sm font-medium">{qty} un</p>
                          <p className="text-xs text-muted-foreground">{fmtWeight(item.weight || 0)} kg</p>
                        </div>
                        <div className="col-span-3">
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={unitValues[item.id] ?? ""}
                            onChange={(e) =>
                              setUnitValues(prev => ({
                                ...prev,
                                [item.id]: e.target.value.replace(/[^0-9.,]/g, ""),
                              }))
                            }
                            placeholder="0,00"
                            className="h-9 text-right"
                          />
                        </div>
                        <div className="col-span-2 text-right text-sm font-semibold">
                          {fmtBrl(unit * qty)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {items.length > 0 && (
              <div className="px-4 py-3 border-t border-border bg-muted/20 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Total de peças: {totalQty} un</span>
                  <span>Peso total: {fmtWeight(totalWeight)} kg</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Valor total</span>
                  <span className="text-lg font-bold">{fmtBrl(computedTotal)}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Fechar
            </Button>
            <Button disabled={saving || items.length === 0} onClick={handleSave}>
              Salvar precificação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
