import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Package, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import PartSearch from "@/components/catalog/PartSearch";
import { CatalogPart } from "@/lib/catalog";
import { Purchase, addItemToPurchase, removeItemFromPurchase } from "@/lib/purchases";
import { fmtBrl } from "@/lib/utils";

interface PiecePricingPanelProps {
  purchase: Purchase;
  onCompleted: () => void;
}

interface StagedPart {
  part: CatalogPart;
  quantity: number;
  value: string;
}

export default function PiecePricingPanel({ purchase, onCompleted }: PiecePricingPanelProps) {
  const [open, setOpen] = useState(false);
  const [staged, setStaged] = useState<StagedPart | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const existingItems = purchase.items.filter(i => i.catalogPartId);
  const totalQty = existingItems.reduce((sum, i) => sum + (i.quantity || 1), 0);

  const handleSelectPart = (part: CatalogPart) => {
    setStaged({ part, quantity: 1, value: "" });
  };

  const handleAdd = async () => {
    if (!staged) return;
    const val = parseFloat(staged.value.replace(",", "."));
    if (isNaN(val) || val <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (staged.quantity <= 0) {
      toast.error("Informe a quantidade");
      return;
    }

    setAdding(true);
    try {
      const ok = await addItemToPurchase(purchase.id, {
        catalogPartId: staged.part.id,
        itemType: "peca",
        quantity: staged.quantity,
        totalValue: val * staged.quantity,
        weight: staged.part.weight,
      });
      if (ok) {
        toast.success("Peça adicionada");
        setStaged(null);
        onCompleted();
      } else {
        toast.error("Erro ao adicionar peça");
      }
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (itemId: string) => {
    setRemoving(itemId);
    try {
      await removeItemFromPurchase(purchase.id, itemId);
      toast.success("Item removido");
      onCompleted();
    } finally {
      setRemoving(null);
    }
  };

  return (
    <>
      {/* Trigger button in the card */}
      <div className="space-y-2 pt-1 border-t border-border/40">
        <Button
          variant="outline"
          className="w-full justify-between h-10"
          onClick={() => setOpen(true)}
        >
          <span className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Precificar Peças
          </span>
          <span className="flex items-center gap-2">
            {existingItems.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {totalQty} peças · {fmtBrl(purchase.totalBrl)}
              </Badge>
            )}
            <ChevronRight className="h-4 w-4" />
          </span>
        </Button>
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg">Precificação de Peças</DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  Pedido {purchase.purchaseNumber} · {purchase.supplierName}
                </DialogDescription>
              </div>
              {existingItems.length > 0 && (
                <Badge className="text-sm px-3 py-1">
                  {totalQty} peças · {fmtBrl(purchase.totalBrl)}
                </Badge>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-border">
            {/* Left column - Search & Staging */}
            <div className="p-4 space-y-3 border-r border-border overflow-auto">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Buscar no Catálogo</p>
              <PartSearch onSelect={handleSelectPart} />

              {staged && (
                <Card className="p-4 space-y-3 border-primary/30 bg-primary/5">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{staged.part.code || staged.part.reference}</p>
                      <p className="text-xs text-muted-foreground">{staged.part.brand} · {staged.part.vehicle}</p>
                      <p className="text-xs text-muted-foreground">
                        {staged.part.weight} kg | Pt:{staged.part.ptPpm} Pd:{staged.part.pdPpm} Rh:{staged.part.rhPpm}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setStaged(null)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Quantidade</label>
                      <Input
                        type="number"
                        min={1}
                        value={staged.quantity}
                        onChange={(e) => setStaged({ ...staged, quantity: parseInt(e.target.value) || 1 })}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Valor unit. (R$)</label>
                      <Input
                        inputMode="decimal"
                        value={staged.value}
                        onChange={(e) => setStaged({ ...staged, value: e.target.value.replace(/[^0-9.,]/g, "") })}
                        placeholder="0,00"
                        className="h-9"
                      />
                    </div>
                  </div>
                  {staged.value && parseFloat(staged.value.replace(",", ".")) > 0 && (
                    <p className="text-xs text-muted-foreground text-right">
                      Subtotal: {fmtBrl(parseFloat(staged.value.replace(",", ".")) * staged.quantity)}
                    </p>
                  )}
                  <Button className="w-full" disabled={adding} onClick={handleAdd}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar ao Pedido
                  </Button>
                </Card>
              )}

              {!staged && (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  Busque e selecione uma peça acima para precificar
                </div>
              )}
            </div>

            {/* Right column - Added items */}
            <div className="flex flex-col overflow-hidden">
              <div className="px-4 py-2 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Peças Adicionadas ({totalQty})
                </p>
              </div>

              <ScrollArea className="flex-1">
                {existingItems.length === 0 ? (
                  <div className="flex items-center justify-center h-40 text-muted-foreground text-xs">
                    Nenhuma peça adicionada
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {existingItems.map((item, idx) => (
                      <div key={item.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-xs text-muted-foreground font-mono w-6 text-right shrink-0">
                            {idx + 1}.
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {item.catalogPartCode || item.catalogPartRef || item.itemType}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity || 1}x · {fmtBrl((item.totalValue || 0) / (item.quantity || 1))}/un
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-semibold">{fmtBrl(item.totalValue || 0)}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            disabled={removing === item.id}
                            onClick={() => handleRemove(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {existingItems.length > 0 && (
                <div className="px-4 py-3 border-t border-border bg-muted/20">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">Total do Pedido</span>
                    <span className="text-lg font-bold">{fmtBrl(purchase.totalBrl)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
