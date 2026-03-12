import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { CatalogGroup, loadGroups, createGroup, updateGroup, deleteGroup } from "@/lib/catalog";
import { toast } from "sonner";

interface GroupManagerProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChanged: () => void;
}

export default function GroupManager({ open, onOpenChange, onChanged }: GroupManagerProps) {
  const [groups, setGroups] = useState<CatalogGroup[]>([]);
  const [name, setName] = useState("");
  const [margin, setMargin] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const refresh = () => loadGroups().then(setGroups);

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  const handleSave = async () => {
    const m = parseFloat(margin.replace(",", "."));
    if (!name.trim() || isNaN(m)) return;

    if (editId) {
      await updateGroup(editId, name.trim(), m);
      toast.success("Grupo atualizado");
    } else {
      await createGroup(name.trim(), m);
      toast.success("Grupo criado");
    }
    setName("");
    setMargin("");
    setEditId(null);
    refresh();
    onChanged();
  };

  const handleEdit = (g: CatalogGroup) => {
    setEditId(g.id);
    setName(g.name);
    setMargin(String(g.margin));
  };

  const handleDelete = async (id: string) => {
    await deleteGroup(id);
    toast.success("Grupo removido");
    refresh();
    onChanged();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Grupos</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_100px_auto] gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: A, B, C..." className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Margem %</Label>
              <Input value={margin} onChange={e => setMargin(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="5" className="h-8 text-sm" />
            </div>
            <Button size="sm" className="h-8" onClick={handleSave}>
              {editId ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            </Button>
          </div>

          {editId && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setEditId(null); setName(""); setMargin(""); }}>
              Cancelar edição
            </Button>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Nome</TableHead>
                <TableHead className="text-xs text-right">Margem %</TableHead>
                <TableHead className="text-xs w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map(g => (
                <TableRow key={g.id}>
                  <TableCell className="text-sm font-medium">{g.name}</TableCell>
                  <TableCell className="text-sm text-right">{g.margin}%</TableCell>
                  <TableCell className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(g)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(g.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {groups.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">
                    Nenhum grupo cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
