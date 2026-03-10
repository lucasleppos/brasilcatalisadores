import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Supplier } from "@/lib/suppliers";
import { parseNum } from "@/lib/utils";

const numFilter = (v: string) => v.replace(/[^0-9.,]/g, "");

interface SupplierFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Omit<Supplier, "id" | "createdAt">) => void;
  initial?: Supplier | null;
}

export default function SupplierForm({ open, onOpenChange, onSave, initial }: SupplierFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [document, setDocument] = useState(initial?.document ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [branch, setBranch] = useState(initial?.branch ?? "");
  const [buyer, setBuyer] = useState(initial?.buyer ?? "");
  const [marginStr, setMarginStr] = useState(String(initial?.margin ?? 15));

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setDocument(initial?.document ?? "");
      setEmail(initial?.email ?? "");
      setBranch(initial?.branch ?? "");
      setBuyer(initial?.buyer ?? "");
      setMarginStr(String(initial?.margin ?? 15));
    }
  }, [open, initial]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), document: document.trim(), email: email.trim(), branch: branch.trim(), buyer: buyer.trim(), margin: parseNum(marginStr) });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">CNPJ/CPF</Label>
              <Input value={document} onChange={(e) => setDocument(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Filial</Label>
              <Input value={branch} onChange={(e) => setBranch(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Comprador</Label>
              <Input value={buyer} onChange={(e) => setBuyer(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Margem (%)</Label>
            <Input type="text" inputMode="decimal" value={marginStr} onChange={(e) => setMarginStr(numFilter(e.target.value))} className="h-8 text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
