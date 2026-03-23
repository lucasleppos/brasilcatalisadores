import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Package } from "lucide-react";
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
  const [staged, setStaged] = useState<StagedPart | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const existingItems = purchase.items.filter(i => i.catalogPartId);

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
    <div className="space-y-3 pt-1 border-t border-border/40">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <Package className="h-3 w-3" />
        Precificação de Peças
      </p>

      {/* Existing items */}
      {existingItems.length > 0 && (
        <div className="space-y-1">
          {existingItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1.5 border">
              <div className="flex-1 min-w-0">
                <span className="font-medium">{item.quantity || 1}x</span>
                <span className="ml-1 text-muted-foreground truncate">
                  {item.catalogPartId ? `Peça catálogo` : item.itemType}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{fmtBrl(item.totalValue || 0)}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  disabled={removing === item.id}
                  onClick={() => handleRemove(item.id)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex justify-between text-xs font-semibold pt-1">
            <span>Total</span>
            <span>{fmtBrl(purchase.totalBrl)}</span>
          </div>
        </div>
      )}

      {/* Search catalog */}
      <PartSearch onSelect={handleSelectPart} />

      {/* Staged part */}
      {staged && (
        <Card className="p-3 space-y-2 border-primary/30 bg-primary/5">
          <div className="flex justify-between items-start">
            <div className="text-xs space-y-0.5">
              <p className="font-medium">{staged.part.code || staged.part.reference}</p>
              <p className="text-muted-foreground">{staged.part.brand} {staged.part.vehicle}</p>
              <p className="text-muted-foreground">{staged.part.weight} kg | Pt:{staged.part.ptPpm} Pd:{staged.part.pdPpm} Rh:{staged.part.rhPpm}</p>
            </div>
            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setStaged(null)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Quantidade</label>
              <Input
                type="number"
                min={1}
                value={staged.quantity}
                onChange={(e) => setStaged({ ...staged, quantity: parseInt(e.target.value) || 1 })}
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Valor unit. (R$)</label>
              <Input
                inputMode="decimal"
                value={staged.value}
                onChange={(e) => setStaged({ ...staged, value: e.target.value.replace(/[^0-9.,]/g, "") })}
                placeholder="0,00"
                className="h-7 text-xs"
              />
            </div>
          </div>
          <Button size="sm" className="w-full h-7 text-xs" disabled={adding} onClick={handleAdd}>
            <Plus className="h-3 w-3 mr-1" />
            Adicionar
          </Button>
        </Card>
      )}
    </div>
  );
}
