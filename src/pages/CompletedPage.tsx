import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Search, Eye } from "lucide-react";
import { Purchase, loadPurchases, getItemLabel, getStatusColor } from "@/lib/purchases";
import { supabase } from "@/integrations/supabase/client";
import PurchaseDetail from "@/components/purchases/PurchaseDetail";
import { fmtBrl } from "@/lib/utils";

interface BagAllocation {
  purchaseId: string;
  bagNumber: string;
  bagLabel: string;
}

export default function CompletedPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [bagAllocations, setBagAllocations] = useState<Record<string, BagAllocation[]>>({});
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  useEffect(() => {
    reload();
  }, []);

  const reload = async () => {
    const all = await loadPurchases();
    // Somente cerâmicos concluídos (Cerâmico: Encerrado, Concluído, ou op_status=Bag Alocado)
    const completed = all.filter(p =>
      p.materialFlow === "ceramico" && (
        p.status === "Cerâmico: Encerrado" ||
        p.status === "Concluído" ||
        p.opStatus === "Bag Alocado"
      )
    );
    setPurchases(completed);

    // Carregar bags alocados por compra
    const ids = completed.map(p => p.id);
    if (ids.length > 0) {
      const { data: bagItems } = await supabase
        .from("bag_items")
        .select("purchase_id, bag_id, bags(bag_number, bag_label)")
        .in("purchase_id", ids);
      const map: Record<string, BagAllocation[]> = {};
      (bagItems || []).forEach((bi: any) => {
        const key = bi.purchase_id;
        if (!map[key]) map[key] = [];
        const bagNumber = bi.bags?.bag_number || "—";
        const bagLabel = bi.bags?.bag_label || "";
        // dedupe
        if (!map[key].some(b => b.bagNumber === bagNumber)) {
          map[key].push({ purchaseId: key, bagNumber, bagLabel });
        }
      });
      setBagAllocations(map);
    }
  };

  const suppliers = useMemo(() => [...new Set(purchases.map(p => p.supplierName))], [purchases]);

  const filtered = purchases.filter(p => {
    const matchSearch = [p.supplierName, p.purchaseNumber, p.erpNumber, p.buyer]
      .some(f => (f || "").toLowerCase().includes(search.toLowerCase()));
    const matchSupplier = supplierFilter === "all" || p.supplierName === supplierFilter;
    return matchSearch && matchSupplier;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-display">Concluídos</h1>
        <Badge variant="secondary">{filtered.length}</Badge>
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por fornecedor, nº pedido, Syge..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger className="h-8 text-sm w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos fornecedores</SelectItem>
            {suppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Pedido</TableHead>
                <TableHead>Boleto Syge</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Comprador</TableHead>
                <TableHead>Peso/Qtd</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Bag(s)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-sm text-muted-foreground">
                    Nenhum material concluído encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(p => {
                  const bags = bagAllocations[p.id] || [];
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm font-mono">{p.purchaseNumber}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.erpNumber || "—"}</TableCell>
                      <TableCell className="text-sm font-medium">{p.supplierName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.buyer || "—"}</TableCell>
                      <TableCell className="text-sm">{getItemLabel(p)}</TableCell>
                      <TableCell className="text-sm text-right font-semibold">{fmtBrl(p.totalBrl)}</TableCell>
                      <TableCell className="text-sm">
                        {bags.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {bags.map(b => (
                              <Badge key={b.bagNumber} variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-300 text-xs">
                                {b.bagNumber}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${getStatusColor(p.status)}`}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedPurchase(p)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PurchaseDetail purchase={selectedPurchase} onClose={() => setSelectedPurchase(null)} />
    </div>
  );
}
