import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Activity, TrendingUp, Package, Clock, BarChart3 } from "lucide-react";
import { Purchase, PURCHASE_STATUSES, loadPurchases } from "@/lib/purchases";

const fmtBrl = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function timeSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function ProcessBoard() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [supplierFilter, setSupplierFilter] = useState("all");

  useEffect(() => { loadPurchases().then(setPurchases); }, []);

  const suppliers = useMemo(() => [...new Set(purchases.map((p) => p.supplierName))], [purchases]);

  const filtered = supplierFilter === "all" ? purchases : purchases.filter((p) => p.supplierName === supplierFilter);

  const byStatus = useMemo(() => {
    const map: Record<string, Purchase[]> = {};
    PURCHASE_STATUSES.forEach((s) => { map[s] = []; });
    filtered.forEach((p) => { map[p.status]?.push(p); });
    return map;
  }, [filtered]);

  const totalValue = filtered.reduce((sum, p) => sum + p.totalBrl, 0);
  const activeCount = filtered.filter((p) => p.status !== "Exportação/Venda").length;
  const completedCount = filtered.filter((p) => p.status === "Exportação/Venda").length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-display">Processos</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-primary/60" />
              <div>
                <p className="text-xs text-muted-foreground">Total Compras</p>
                <p className="text-2xl font-bold">{filtered.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-500/60" />
              <div>
                <p className="text-xs text-muted-foreground">Em Produção</p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500/60" />
              <div>
                <p className="text-xs text-muted-foreground">Finalizadas</p>
                <p className="text-2xl font-bold">{completedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary/60" />
              <div>
                <p className="text-xs text-muted-foreground">Valor Total</p>
                <p className="text-lg font-bold">{fmtBrl(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger className="h-8 text-sm w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os fornecedores</SelectItem>
            {suppliers.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Status Board */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {PURCHASE_STATUSES.map((status) => {
          const items = byStatus[status];
          return (
            <Card key={status} className={items.length > 0 ? "border-primary/20" : "opacity-60"}>
              <CardHeader className="pb-2 pt-3 px-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium">{status}</CardTitle>
                  <Badge variant="secondary" className="text-[10px] h-5">{items.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                {items.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-2">—</p>
                ) : (
                  items.map((p) => {
                    const lastChange = p.statusHistory[p.statusHistory.length - 1];
                    return (
                      <div key={p.id} className="rounded-md border p-2 text-xs space-y-1 bg-muted/30">
                        <div className="flex justify-between">
                          <span className="font-medium truncate">{p.supplierName}</span>
                          <span className="text-muted-foreground">{timeSince(lastChange.date)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>{p.items.length} itens</span>
                          <span className="font-semibold text-foreground">{fmtBrl(p.totalBrl)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
