import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createBag, BagMaterialType, WEIGHT_LIMIT } from "@/lib/bags";
import { useToast } from "@/hooks/use-toast";
import { parseNum } from "@/lib/utils";

const numFilter = (v: string) => v.replace(/[^0-9.,]/g, "");

interface NewBagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function NewBagDialog({ open, onOpenChange, onCreated }: NewBagDialogProps) {
  const { toast } = useToast();
  const [label, setLabel] = useState("");
  const [materialType, setMaterialType] = useState<BagMaterialType>("medio");
  const [buyer, setBuyer] = useState("");
  const [maxWeightStr, setMaxWeightStr] = useState(WEIGHT_LIMIT.toString());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!label.trim()) {
      toast({ title: "Informe o nome do bag", variant: "destructive" });
      return;
    }
    setSaving(true);
    const bag = await createBag({
      bagLabel: label.trim(),
      materialType,
      buyer: buyer.trim(),
      maxWeight: parseNum(maxWeightStr) || WEIGHT_LIMIT,
      notes: notes.trim(),
    });
    setSaving(false);
    if (bag) {
      toast({ title: `${bag.bagNumber} criado com sucesso` });
      setLabel(""); setBuyer(""); setNotes(""); setMaxWeightStr(WEIGHT_LIMIT.toString());
      onCreated();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Bag</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome / Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: TV Super, Brasil Diesel" />
          </div>
          <div>
            <Label>Tipo de Material</Label>
            <Select value={materialType} onValueChange={(v) => setMaterialType(v as BagMaterialType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="super">Super</SelectItem>
                <SelectItem value="pecas">Peças</SelectItem>
                <SelectItem value="medio">Médio</SelectItem>
                <SelectItem value="diesel">Diesel</SelectItem>
                <SelectItem value="cliente">Cliente / Fornecedor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Comprador / Filial</Label>
            <Input value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="Ex: TV, Marcos, Minas Gerais" />
          </div>
          <div>
            <Label>Peso Máximo (kg)</Label>
            <Input type="text" inputMode="decimal" value={maxWeightStr} onChange={(e) => setMaxWeightStr(numFilter(e.target.value))} />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Criar Bag"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
