import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users, Plus, Upload, Pencil, Trash2, Search } from "lucide-react";
import { Supplier, loadSuppliers, addSupplier, updateSupplier, deleteSupplier, importSuppliers } from "@/lib/suppliers";
import SupplierForm from "@/components/suppliers/SupplierForm";
import SupplierImport from "@/components/suppliers/SupplierImport";
import { useSortable } from "@/hooks/use-sortable";
import { SortableTableHead } from "@/components/ui/sortable-table-head";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const reload = async () => setSuppliers(await loadSuppliers());
  useEffect(() => { reload(); }, []);

  const filtered = suppliers.filter((s) =>
    [s.name, s.document, s.email, s.branch, s.buyer]
      .some((f) => (f || "").toLowerCase().includes(search.toLowerCase()))
  );

  const { sorted, sort, toggleSort } = useSortable(filtered);

  const handleSave = async (data: Omit<Supplier, "id" | "createdAt">) => {
    if (editing) {
      await updateSupplier(editing.id, data);
    } else {
      await addSupplier(data);
    }
    setEditing(null);
    reload();
  };

  const handleImport = async (rows: Omit<Supplier, "id" | "createdAt">[]) => {
    await importSuppliers(rows);
    reload();
  };

  const handleDelete = async (id: string) => {
    await deleteSupplier(id);
    reload();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-display">Fornecedores</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="mr-1 h-3 w-3" />Importar Excel
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="mr-1 h-3 w-3" />Novo Fornecedor
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="Buscar fornecedor..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-sm" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead column="name" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort}>Nome</SortableTableHead>
                <SortableTableHead column="document" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort}>CNPJ/CPF</SortableTableHead>
                <SortableTableHead column="email" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort}>E-mail</SortableTableHead>
                <SortableTableHead column="branch" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort}>Filial</SortableTableHead>
                <SortableTableHead column="buyer" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort}>Comprador</SortableTableHead>
                <SortableTableHead column="margin" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort} className="text-right">Margem %</SortableTableHead>
                <TableHead className="text-xs w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                    Nenhum fornecedor encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm">{s.document}</TableCell>
                    <TableCell className="text-sm">{s.email}</TableCell>
                    <TableCell className="text-sm">{s.branch}</TableCell>
                    <TableCell className="text-sm">{s.buyer}</TableCell>
                    <TableCell className="text-sm text-right">{s.margin}%</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(s); setFormOpen(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir fornecedor?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(s.id)}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SupplierForm
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(null); }}
        onSave={handleSave}
        initial={editing}
      />
      <SupplierImport open={importOpen} onOpenChange={setImportOpen} onImport={handleImport} />
    </div>
  );
}
