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
import { Purchase, loadPurchases, updatePurchaseStatus, deletePurchase, getFlowStatuses, getStatusColor, ALL_STATUSES } from "@/lib/purchases";
import PurchaseDetail from "@/components/purchases/PurchaseDetail";
import NewPurchaseDialog from "@/components/purchases/NewPurchaseDialog";
import { usePermissions } from "@/lib/permissions";
import { useAuth } from "@/contexts/AuthContext";
import { useSortable } from "@/hooks/use-sortable";
import { SortableTableHead } from "@/components/ui/sortable-table-head";

const fmtBrl = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PurchasesPage() {
  const { role, profile } = useAuth();
  const { canDo, isFieldHidden } = usePermissions();
  const canCreate = canDo("compras", "create");
  const canEdit = canDo("compras", "edit");
  const canDelete = canDo("compras", "delete");
  const hideTotal = isFieldHidden("compras", "total_brl");
  const isBuyer = role === "comprador";

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [buyerFilter, setBuyerFilter] = useState<string>("all");
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [editPurchase, setEditPurchase] = useState<Purchase | null>(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  const reload = async () => {
    let data = await loadPurchases();
    // Buyer role: filter to only their purchases
    if (isBuyer && profile) {
      data = data.filter(p => p.buyer === profile.full_name);
    }
    setPurchases(data);
  };
  useEffect(() => { reload(); }, []);

  const buyers = [...new Set(purchases.map(p => p.buyer).filter(Boolean))];
  const activeStatuses = [...new Set(purchases.map(p => p.status))];

  const filtered = purchases.filter((p) => {
    const matchSearch = [p.supplierName, p.purchaseNumber, p.erpNumber, p.buyer]
      .some((f) => (f || "").toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchBuyer = buyerFilter === "all" || p.buyer === buyerFilter;
    return matchSearch && matchStatus && matchBuyer;
  });

  const { sorted, sort, toggleSort } = useSortable(filtered);

  const handleStatusChange = async (id: string, status: string) => {
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
        {canCreate && (
          <Button size="sm" onClick={() => setNewDialogOpen(true)}>
            <Plus className="mr-1 h-3 w-3" />Nova Compra
          </Button>
        )}
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar por fornecedor, nº pedido, comprador..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-sm w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {activeStatuses.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isBuyer && (
          <Select value={buyerFilter} onValueChange={setBuyerFilter}>
            <SelectTrigger className="h-8 text-sm w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos compradores</SelectItem>
              {buyers.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead column="purchaseNumber" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort}>Nº Pedido</SortableTableHead>
                <SortableTableHead column="erpNumber" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort}>Boleto Syge</SortableTableHead>
                <SortableTableHead column="supplierName" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort}>Fornecedor</SortableTableHead>
                <SortableTableHead column="buyer" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort}>Comprador</SortableTableHead>
                <SortableTableHead column="itemCount" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort}>Itens</SortableTableHead>
                {!hideTotal && <SortableTableHead column="totalBrl" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort} className="text-right">Total</SortableTableHead>}
                <SortableTableHead column="status" currentColumn={sort.column} direction={sort.direction} onToggle={toggleSort}>Status</SortableTableHead>
                <TableHead className="text-xs w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">
                    Nenhuma compra encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm font-mono">{p.purchaseNumber}</TableCell>
                    <TableCell className={`text-sm ${p.erpNumber ? "text-muted-foreground" : "text-red-500 bg-red-50 dark:bg-red-950/20"}`}>
                      {p.erpNumber || "—"}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{p.supplierName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.buyer || "—"}</TableCell>
                    <TableCell className="text-sm">{p.items.length}</TableCell>
                    {!hideTotal && (
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
                    )}
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${getStatusColor(p.status)}`}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 items-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedPurchase(p)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        {canEdit && !isBuyer && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditPurchase(p)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                        {canDelete && !isBuyer && (
                          <>
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
                          </>
                        )}
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
      {canCreate && <NewPurchaseDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} onCreated={reload} />}
      {canEdit && (
        <NewPurchaseDialog
          open={!!editPurchase}
          onOpenChange={(o) => { if (!o) setEditPurchase(null); }}
          onCreated={reload}
          editPurchase={editPurchase}
        />
      )}
    </div>
  );
}
