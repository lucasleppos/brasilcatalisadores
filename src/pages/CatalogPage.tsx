import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, Settings2, Search, Trash2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CatalogPart, CatalogGroup, loadParts, loadGroups, createPart, updatePart, deletePart } from "@/lib/catalog";
import CatalogImport from "@/components/catalog/CatalogImport";
import GroupManager from "@/components/catalog/GroupManager";
import { toast } from "sonner";
import { fmtNum } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const numFilter = (v: string) => v.replace(/[^0-9.,]/g, "");

export default function CatalogPage() {
  const [parts, setParts] = useState<CatalogPart[]>([]);
  const [groups, setGroups] = useState<CatalogGroup[]>([]);
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [importOpen, setImportOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editPart, setEditPart] = useState<CatalogPart | null>(null);

  // Form fields
  const [fCode, setFCode] = useState("");
  const [fRef, setFRef] = useState("");
  const [fBrand, setFBrand] = useState("");
  const [fVehicle, setFVehicle] = useState("");
  const [fWeight, setFWeight] = useState("");
  const [fPt, setFPt] = useState("");
  const [fPd, setFPd] = useState("");
  const [fRh, setFRh] = useState("");
  const [fGroupId, setFGroupId] = useState("");

  const refresh = async () => {
    const [p, g] = await Promise.all([loadParts(), loadGroups()]);
    setParts(p);
    setGroups(g);
  };

  useEffect(() => { refresh(); }, []);

  const filtered = parts.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.code.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.vehicle.toLowerCase().includes(q);
    const matchGroup = filterGroup === "all" || p.groupId === filterGroup;
    return matchSearch && matchGroup;
  });

  const openEdit = (part: CatalogPart | null) => {
    setEditPart(part);
    if (part) {
      setFCode(part.code); setFRef(part.reference); setFBrand(part.brand); setFVehicle(part.vehicle);
      setFWeight(String(part.weight)); setFPt(String(part.ptPpm)); setFPd(String(part.pdPpm)); setFRh(String(part.rhPpm));
      setFGroupId(part.groupId || "");
    } else {
      setFCode(""); setFRef(""); setFBrand(""); setFVehicle("");
      setFWeight(""); setFPt(""); setFPd(""); setFRh(""); setFGroupId("");
    }
    setEditOpen(true);
  };

  const handleSave = async () => {
    const data = {
      code: fCode.trim(), reference: fRef.trim(), brand: fBrand.trim(), vehicle: fVehicle.trim(),
      weight: parseFloat(fWeight.replace(",", ".")) || 0,
      ptPpm: parseFloat(fPt.replace(",", ".")) || 0,
      pdPpm: parseFloat(fPd.replace(",", ".")) || 0,
      rhPpm: parseFloat(fRh.replace(",", ".")) || 0,
      groupId: fGroupId || null,
    };
    if (editPart) {
      await updatePart(editPart.id, data);
      toast.success("Peça atualizada");
    } else {
      await createPart(data);
      toast.success("Peça cadastrada");
    }
    setEditOpen(false);
    refresh();
  };

  const handleDelete = async (id: string) => {
    await deletePart(id);
    toast.success("Peça removida");
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Catálogo de Peças</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setGroupsOpen(true)}>
            <Settings2 className="h-3 w-3 mr-1" />Grupos
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-3 w-3 mr-1" />Importar
          </Button>
          <Button size="sm" onClick={() => openEdit(null)}>
            <Plus className="h-3 w-3 mr-1" />Nova Peça
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por código, ref, marca, carro..." className="pl-8" />
        </div>
        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os grupos</SelectItem>
            {groups.map(g => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Código</TableHead>
              <TableHead className="text-xs">Referência</TableHead>
              <TableHead className="text-xs">Marca</TableHead>
              <TableHead className="text-xs">Carro</TableHead>
              <TableHead className="text-xs text-right">Peso</TableHead>
              <TableHead className="text-xs text-right">Pt</TableHead>
              <TableHead className="text-xs text-right">Pd</TableHead>
              <TableHead className="text-xs text-right">Rh</TableHead>
              <TableHead className="text-xs">Grupo</TableHead>
              <TableHead className="text-xs w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell className="text-xs font-mono">{p.code || "—"}</TableCell>
                <TableCell className="text-xs">{p.reference || "—"}</TableCell>
                <TableCell className="text-xs">{p.brand || "—"}</TableCell>
                <TableCell className="text-xs">{p.vehicle || "—"}</TableCell>
                <TableCell className="text-xs text-right">{fmtNum(p.weight, 4)} kg</TableCell>
                <TableCell className="text-xs text-right">{fmtNum(p.ptPpm, 4)}</TableCell>
                <TableCell className="text-xs text-right">{fmtNum(p.pdPpm, 4)}</TableCell>
                <TableCell className="text-xs text-right">{fmtNum(p.rhPpm, 4)}</TableCell>
                <TableCell>
                  {p.groupName ? (
                    <Badge variant="outline" className="text-[10px]">{p.groupName}</Badge>
                  ) : "—"}
                </TableCell>
                <TableCell className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(p)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">
                  {parts.length === 0 ? "Nenhuma peça cadastrada. Importe via Excel ou cadastre manualmente." : "Nenhuma peça encontrada para este filtro."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} de {parts.length} peças</p>

      {/* Edit/Create Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editPart ? "Editar Peça" : "Nova Peça"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Código</Label>
                <Input value={fCode} onChange={e => setFCode(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Referência</Label>
                <Input value={fRef} onChange={e => setFRef(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Marca</Label>
                <Input value={fBrand} onChange={e => setFBrand(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Carro</Label>
                <Input value={fVehicle} onChange={e => setFVehicle(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Peso (kg)</Label>
                <Input value={fWeight} onChange={e => setFWeight(numFilter(e.target.value))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Grupo</Label>
                <Select value={fGroupId} onValueChange={setFGroupId}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {groups.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name}{isSuperAdmin ? ` (${g.margin}%)` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Pt (ppm)</Label>
                <Input value={fPt} onChange={e => setFPt(numFilter(e.target.value))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Pd (ppm)</Label>
                <Input value={fPd} onChange={e => setFPd(numFilter(e.target.value))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Rh (ppm)</Label>
                <Input value={fRh} onChange={e => setFRh(numFilter(e.target.value))} className="h-8 text-sm" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editPart ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CatalogImport open={importOpen} onOpenChange={setImportOpen} onImported={refresh} />
      <GroupManager open={groupsOpen} onOpenChange={setGroupsOpen} onChanged={refresh} />
    </div>
  );
}
