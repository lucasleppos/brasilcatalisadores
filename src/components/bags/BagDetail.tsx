import { useEffect, useState } from "react";
import { Bag, BagItem, loadBagItems, removeAllocation, updateBagStatus, getWeightPercentage, getMaterialTypeLabel, getStatusColor, deleteBag } from "@/lib/bags";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fmtNum, fmtBrl } from "@/lib/utils";

interface BagDetailProps {
  bag: Bag;
  onBack: () => void;
  onRefresh: () => void;
}

export function BagDetail({ bag, onBack, onRefresh }: BagDetailProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<BagItem[]>([]);

  const loadItems = async () => {
    const data = await loadBagItems(bag.id);
    setItems(data);
  };

  useEffect(() => { loadItems(); }, [bag.id]);

  const pct = getWeightPercentage(bag);

  const handleStatusChange = async (status: "Fechado" | "Exportado") => {
    await updateBagStatus(bag.id, status);
    toast({ title: `Bag marcado como ${status}` });
    onRefresh();
  };

  const handleRemoveItem = async (item: BagItem) => {
    await removeAllocation(item.id, bag.id);
    toast({ title: "Item removido do bag" });
    loadItems();
    onRefresh();
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir este bag e todos os itens?")) return;
    await deleteBag(bag.id);
    toast({ title: "Bag excluído" });
    onRefresh();
    onBack();
  };

  // Financial summary
  const supplierTotals = items.reduce((acc, item) => {
    acc[item.supplierName] = (acc[item.supplierName] || 0) + item.paidValue;
    return acc;
  }, {} as Record<string, number>);

  const costPerKg = bag.totalWeight > 0 ? bag.totalPaidBrl / bag.totalWeight : 0;

  // Weighted average PPMs
  const totalW = items.reduce((s, i) => s + i.weight, 0);
  const avgPt = totalW > 0 ? items.reduce((s, i) => s + i.estimatedPtPpm * i.weight, 0) / totalW : 0;
  const avgPd = totalW > 0 ? items.reduce((s, i) => s + i.estimatedPdPpm * i.weight, 0) / totalW : 0;
  const avgRh = totalW > 0 ? items.reduce((s, i) => s + i.estimatedRhPpm * i.weight, 0) / totalW : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <h2 className="text-xl font-semibold">{bag.bagNumber} — {bag.bagLabel}</h2>
        <Badge className={getStatusColor(bag.status)}>{bag.status}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Peso</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtNum(bag.totalWeight, 4)} kg</div>
            <Progress value={Math.min(pct, 110)} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">{fmtNum(pct, 0)}% de {bag.maxWeight} kg</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Valor Total Pago</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtBrl(bag.totalPaidBrl)}</div>
            <p className="text-xs text-muted-foreground mt-1">Custo médio: R$ {fmtNum(costPerKg, 2)}/kg</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">PPMs Estimados (Média Pond.)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <div>Pt: <strong>{fmtNum(avgPt, 4)}</strong></div>
              <div>Pd: <strong>{fmtNum(avgPd, 4)}</strong></div>
              <div>Rh: <strong>{fmtNum(avgRh, 4)}</strong></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supplier breakdown */}
      {Object.keys(supplierTotals).length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Valor por Fornecedor</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.entries(supplierTotals).map(([name, val]) => (
                <div key={name} className="flex justify-between text-sm">
                  <span>{name}</span>
                  <span>{fmtBrl(val)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Itens Alocados ({items.length})</CardTitle></CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item alocado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Peso (kg)</TableHead>
                  <TableHead>Valor Pago</TableHead>
                  <TableHead>Pt</TableHead>
                  <TableHead>Pd</TableHead>
                  <TableHead>Rh</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.supplierName}</TableCell>
                    <TableCell>{fmtNum(item.weight, 2)}</TableCell>
                    <TableCell>{fmtBrl(item.paidValue)}</TableCell>
                    <TableCell>{fmtNum(item.estimatedPtPpm, 1)}</TableCell>
                    <TableCell>{fmtNum(item.estimatedPdPpm, 1)}</TableCell>
                    <TableCell>{fmtNum(item.estimatedRhPpm, 1)}</TableCell>
                    <TableCell>
                      {bag.status === "Aberto" && (
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        {bag.status === "Aberto" && (
          <Button onClick={() => handleStatusChange("Fechado")}>Fechar Bag</Button>
        )}
        {bag.status === "Fechado" && (
          <Button onClick={() => handleStatusChange("Exportado")}>Marcar como Exportado</Button>
        )}
        <Button variant="destructive" onClick={handleDelete}>Excluir Bag</Button>
      </div>
    </div>
  );
}
