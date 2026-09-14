import { useEffect, useMemo, useState } from "react";
import {
  Bag, BagItem, BagItemMovement, loadBagItems, loadBagItemHistory, removeAllocation,
  updateBagStatus, getWeightPercentage, getStatusColor, deleteBag,
} from "@/lib/bags";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fmtNum, fmtBrl } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllByIds } from "@/lib/db";
import { useIsMobile } from "@/hooks/use-mobile";

interface BagDetailProps {
  bag: Bag;
  onBack: () => void;
  onRefresh: () => void;
}

interface Origin {
  purchaseNumber: string;
  supplierName: string;
  supplierBranch: string;
  buyer: string;
  erpNumber: string;
  date: string;
  materialFlow: string;
}

const FLOW_LABEL: Record<string, string> = {
  ceramico: "Cerâmico",
  pecas: "Peça",
  sacola: "Peça em Sacola",
};

/** Flex / Carbono vem do sufixo do id do item alocado. */
function fractionLabel(purchaseItemId: string): string {
  const suffix = String(purchaseItemId).split("::")[1] || "";
  if (suffix.includes("carbono")) return "Carbono";
  if (suffix.includes("flex")) return "Flex";
  return "—";
}

function fmtDate(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

export function BagDetail({ bag, onBack, onRefresh }: BagDetailProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [items, setItems] = useState<BagItem[]>([]);
  const [origins, setOrigins] = useState<Record<string, Origin>>({});
  const [history, setHistory] = useState<BagItemMovement[]>([]);
  const [detailItem, setDetailItem] = useState<BagItem | null>(null);

  const loadItems = async () => {
    const data = await loadBagItems(bag.id);
    setItems(data);
    await loadOrigins(data);
  };

  const loadOrigins = async (list: BagItem[]) => {
    const purchases = await fetchAllByIds<any>(list.map(i => i.purchaseId), (chunkIds) =>
      supabase
        .from("purchases")
        .select("id, purchase_number, supplier_id, supplier_name, buyer, erp_number, date, material_flow")
        .in("id", chunkIds) as any
    );
    const branches = await fetchAllByIds<any>((purchases || []).map((p: any) => p.supplier_id), (chunkIds) =>
      supabase.from("suppliers").select("id, branch").in("id", chunkIds) as any
    );
    const branchMap = new Map((branches || []).map((s: any) => [s.id, s.branch || ""]));

    const map: Record<string, Origin> = {};
    (purchases || []).forEach((p: any) => {
      map[p.id] = {
        purchaseNumber: p.purchase_number || "—",
        supplierName: p.supplier_name || "—",
        supplierBranch: branchMap.get(p.supplier_id) || "—",
        buyer: p.buyer || "—",
        erpNumber: p.erp_number || "",
        date: p.date,
        materialFlow: p.material_flow || "",
      };
    });
    setOrigins(map);
  };

  const loadHistory = async () => setHistory(await loadBagItemHistory(bag.id));

  useEffect(() => { loadItems(); loadHistory(); }, [bag.id]);

  const pct = getWeightPercentage(bag);

  const handleStatusChange = async (status: "Fechado" | "Exportado") => {
    await updateBagStatus(bag.id, status);
    toast({ title: `Bag marcado como ${status}` });
    onRefresh();
  };

  const handleRemoveItem = async (item: BagItem) => {
    const origin = origins[item.purchaseId];
    const label = origin ? `${origin.purchaseNumber} — ${item.supplierName}` : item.supplierName;
    if (!confirm(`Retirar ${label} deste bag? O material volta para a aba Alocar Material e a saída fica registrada no histórico.`)) return;
    await removeAllocation(item.id, bag.id);
    toast({ title: "Material retirado do bag", description: "Voltou para Alocar Material." });
    loadItems();
    loadHistory();
    onRefresh();
  };

  const handleDelete = async () => {
    const list = items.map(i => `• ${origins[i.purchaseId]?.purchaseNumber || "—"} — ${i.supplierName} — ${fmtNum(i.weight, 4)} kg`).join("\n");
    const msg = items.length
      ? `Excluir o bag ${bag.bagNumber}? Os ${items.length} materiais abaixo voltam para Alocar Material:\n\n${list}`
      : `Excluir o bag ${bag.bagNumber}?`;
    if (!confirm(msg)) return;
    const err = await deleteBag(bag.id);
    if (err) {
      toast({ title: "Não foi possível excluir", description: err, variant: "destructive" });
      return;
    }
    toast({ title: "Bag excluído", description: items.length ? "Materiais devolvidos para Alocar Material." : undefined });
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

  const detailOrigin = detailItem ? origins[detailItem.purchaseId] : null;

  const itemsBlock = useMemo(() => {
    if (items.length === 0) return <p className="text-sm text-muted-foreground">Nenhum item alocado.</p>;

    if (isMobile) {
      return (
        <div className="space-y-2">
          {items.map((item) => {
            const o = origins[item.purchaseId];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setDetailItem(item)}
                className="w-full text-left rounded-lg border border-border p-3 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{o?.purchaseNumber || "—"}</span>
                  <span className="text-sm font-semibold">{fmtNum(item.weight, 4)} kg</span>
                </div>
                <div className="text-sm font-medium truncate">{item.supplierName}</div>
                <div className="text-xs text-muted-foreground">
                  {o?.supplierBranch || "—"} · {FLOW_LABEL[o?.materialFlow || ""] || "—"} · {fractionLabel(item.purchaseItemId)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {fmtBrl(item.paidValue)} · Pt {fmtNum(item.estimatedPtPpm, 0)} / Pd {fmtNum(item.estimatedPdPpm, 0)} / Rh {fmtNum(item.estimatedRhPpm, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Alocado em {fmtDate(item.allocatedAt)}</div>
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>OP</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Filial</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Carbono</TableHead>
            <TableHead>Peso (kg)</TableHead>
            <TableHead>Valor Pago</TableHead>
            <TableHead>Pt</TableHead>
            <TableHead>Pd</TableHead>
            <TableHead>Rh</TableHead>
            <TableHead>Alocado em</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const o = origins[item.purchaseId];
            return (
              <TableRow key={item.id} className="cursor-pointer" onClick={() => setDetailItem(item)}>
                <TableCell className="font-mono text-xs">{o?.purchaseNumber || "—"}</TableCell>
                <TableCell className="max-w-[180px] truncate">{item.supplierName}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{o?.supplierBranch || "—"}</TableCell>
                <TableCell className="text-xs">{FLOW_LABEL[o?.materialFlow || ""] || "—"}</TableCell>
                <TableCell className="text-xs">{fractionLabel(item.purchaseItemId)}</TableCell>
                <TableCell>{fmtNum(item.weight, 4)}</TableCell>
                <TableCell>{fmtBrl(item.paidValue)}</TableCell>
                <TableCell>{fmtNum(item.estimatedPtPpm, 0)}</TableCell>
                <TableCell>{fmtNum(item.estimatedPdPpm, 0)}</TableCell>
                <TableCell>{fmtNum(item.estimatedRhPpm, 0)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{fmtDate(item.allocatedAt)}</TableCell>
                <TableCell>
                  {bag.status === "Aberto" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); handleRemoveItem(item); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  }, [items, origins, isMobile, bag.status]);

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
        <CardContent className="overflow-x-auto">{itemsBlock}</CardContent>
      </Card>

      {/* Movement history */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Histórico de movimentações ({history.length})</CardTitle></CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum material foi retirado deste bag.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="text-sm border-b border-border/60 pb-2 last:border-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{h.purchaseNumber || "—"}</span>
                    <span className="font-medium">{h.supplierName || "—"}</span>
                    <Badge variant="outline" className="text-xs">
                      {h.action === "bag_deleted" ? "Bag excluído" : "Retirado do bag"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {fmtNum(h.weight, 4)} kg · {fmtBrl(h.paidValue)} · {fmtDate(h.createdAt)}
                  </div>
                </div>
              ))}
            </div>
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
        {bag.status === "Aberto" && (
          <Button variant="destructive" onClick={handleDelete}>Excluir Bag</Button>
        )}
      </div>

      {/* Origem do material */}
      <Sheet open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Origem do material</SheetTitle>
          </SheetHeader>
          {detailItem && (
            <div className="mt-4 space-y-3 text-sm">
              <Row label="OP" value={detailOrigin?.purchaseNumber || "—"} />
              <Row label="Fornecedor" value={detailItem.supplierName} />
              <Row label="Filial" value={detailOrigin?.supplierBranch || "—"} />
              <Row label="Comprador" value={detailOrigin?.buyer || "—"} />
              <Row label="Boleto Syge" value={detailOrigin?.erpNumber || "—"} />
              <Row label="Data da compra" value={fmtDate(detailOrigin?.date)} />
              <Row label="Tipo" value={FLOW_LABEL[detailOrigin?.materialFlow || ""] || "—"} />
              <Row label="Flex / Carbono" value={fractionLabel(detailItem.purchaseItemId)} />
              <Row label="Peso alocado" value={`${fmtNum(detailItem.weight, 4)} kg`} />
              <Row label="Valor pago" value={fmtBrl(detailItem.paidValue)} />
              <Row label="Pt / Pd / Rh" value={`${fmtNum(detailItem.estimatedPtPpm, 0)} / ${fmtNum(detailItem.estimatedPdPpm, 0)} / ${fmtNum(detailItem.estimatedRhPpm, 0)}`} />
              <Row label="Alocado em" value={fmtDate(detailItem.allocatedAt)} />
              <Row label="Bag" value={`${bag.bagNumber} — ${bag.bagLabel}`} />
              {bag.status === "Aberto" && (
                <Button
                  variant="destructive"
                  className="w-full mt-2"
                  onClick={async () => { const it = detailItem; setDetailItem(null); await handleRemoveItem(it); }}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Retirar do bag
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/60 pb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
