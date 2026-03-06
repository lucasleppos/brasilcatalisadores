import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Package, Search, Trash2, Eye, Plus, Pencil, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Purchase, PurchaseStatus, PURCHASE_STATUSES, loadPurchases, updatePurchaseStatus, deletePurchase } from "@/lib/purchases";
import PurchaseDetail from "@/components/purchases/PurchaseDetail";
import NewPurchaseDialog from "@/components/purchases/NewPurchaseDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useSortable } from "@/hooks/use-sortable";
import { SortableTableHead } from "@/components/ui/sortable-table-head";

const fmtBrl = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusColors: Record<string, string> = {
  "Recebimento": "bg-blue-500/10 text-blue-700 border-blue-300",
  "Conferência": "bg-cyan-500/10 text-cyan-700 border-cyan-300",
  "Separação": "bg-indigo-500/10 text-indigo-700 border-indigo-300",
  "Corte da Peça": "bg-violet-500/10 text-violet-700 border-violet-300",
  "Trituração": "bg-orange-500/10 text-orange-700 border-orange-300",
  "Homogeneização": "bg-amber-500/10 text-amber-700 border-amber-300",
  "Amostragem": "bg-yellow-500/10 text-yellow-700 border-yellow-300",
  "Análise": "bg-lime-500/10 text-lime-700 border-lime-300",
  "Aprovação do Fornecedor": "bg-emerald-500/10 text-emerald-700 border-emerald-300",
  "Pagamento": "bg-green-500/10 text-green-700 border-green-300",
  "Enviado ao Bag": "bg-teal-500/10 text-teal-700 border-teal-300",
  "Exportação/Venda": "bg-primary/10 text-primary border-primary/30",
};

export default function PurchasesPage() {
  const { role } = useAuth();
  const isAdmin = role === "super_admin" || role === "admin";
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [editPurchase, setEditPurchase] = useState<Purchase | null>(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  const reload = async () => setPurchases(await loadPurchases());
  useEffect(() => { reload(); }, []);

  const filtered = purchases.filter((p) => {
    const matchSearch = [p.supplierName, p.purchaseNumber, p.erpNumber]
      .some((f) => (f || "").toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const { sorted, sort, toggleSort } = useSortable(filtered);

  const handleStatusChange = async (id: string, status: PurchaseStatus) => {
    await updatePurchaseStatus(id, status);
    reload();
  };

  const handleDelete = async (id: string) => {
    await deletePurchase(id);
    reload();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-display">Compras</h1>
        </div>
        <Button size="sm" onClick={() => setNewDialogOpen(true)}>
          <Plus className="mr-1 h-3 w-3" />Nova Compra
        </Button>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar por fornecedor, nº pedido ou ERP..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-sm w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {PURCHASE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead column="purchaseNumber" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort}>Nº Pedido</SortableTableHead>
                <SortableTableHead column="supplierName" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort}>Fornecedor</SortableTableHead>
                <SortableTableHead column="erpNumber" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort}>Boleto Syge</SortableTableHead>
                <SortableTableHead column="itemCount" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort}>Itens</SortableTableHead>
                <SortableTableHead column="totalBrl" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort} className="text-right">Total</SortableTableHead>
                <SortableTableHead column="status" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort}>Status</SortableTableHead>
                <TableHead className="text-xs w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                    Nenhuma compra encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm font-mono">{p.purchaseNumber}</TableCell>
                    <TableCell className="text-sm font-medium">{p.supplierName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.erpNumber || "—"}</TableCell>
                    <TableCell className="text-sm">{p.items.length}</TableCell>
                    <TableCell className="text-sm text-right font-semibold">
                      {(() => {
                        const hasPending = p.items.some(i => !i.result && !i.totalValue);
                        if (p.totalBrl > 0) {
                          return (
                            <span className={`inline-flex items-center gap-1 ${hasPending ? "text-destructive" : ""}`}>
                              {hasPending && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                                    </TooltipTrigger>
                                    <TooltipContent><p>Há itens pendentes de análise</p></TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {fmtBrl(p.totalBrl)}
                            </span>
                          );
                        }
                        return (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300 text-xs">Pendente</Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <Select value={p.status} onValueChange={(v) => handleStatusChange(p.id, v as PurchaseStatus)}>
                          <SelectTrigger className="h-7 text-xs w-44 border-0 p-0">
                            <Badge variant="outline" className={`text-xs ${statusColors[p.status] || ""}`}>
                              {p.status}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {PURCHASE_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className={`text-xs ${statusColors[p.status] || ""}`}>
                          {p.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 items-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedPurchase(p)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditPurchase(p)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <div className="w-2" />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir compra?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(p.id)}>Excluir</AlertDialogAction>
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

      <PurchaseDetail purchase={selectedPurchase} onClose={() => setSelectedPurchase(null)} />
      <NewPurchaseDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} onCreated={reload} />
      <NewPurchaseDialog
        open={!!editPurchase}
        onOpenChange={(o) => { if (!o) setEditPurchase(null); }}
        onCreated={reload}
        editPurchase={editPurchase}
      />
    </div>
  );
}
