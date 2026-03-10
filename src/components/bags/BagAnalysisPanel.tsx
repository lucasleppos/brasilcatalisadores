import { useEffect, useState } from "react";
import { Bag, BagItem, loadBagItems, loadBags, updateBagAnalysis } from "@/lib/bags";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { fmtNum, fmtBrl } from "@/lib/utils";

export function BagAnalysisPanel() {
  const { toast } = useToast();
  const [bags, setBags] = useState<Bag[]>([]);
  const [selectedBagId, setSelectedBagId] = useState("");
  const [items, setItems] = useState<BagItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [provisionalPt, setProvisionalPt] = useState("");
  const [provisionalPd, setProvisionalPd] = useState("");
  const [provisionalRh, setProvisionalRh] = useState("");
  const [refinerPt, setRefinerPt] = useState("");
  const [refinerPd, setRefinerPd] = useState("");
  const [refinerRh, setRefinerRh] = useState("");
  const [refinerValue, setRefinerValue] = useState("");

  useEffect(() => {
    loadBags().then((all) => {
      setBags(all.filter(b => b.status === "Fechado" || b.status === "Exportado"));
    });
  }, []);

  const selectedBag = bags.find(b => b.id === selectedBagId);

  useEffect(() => {
    if (!selectedBag) return;
    loadBagItems(selectedBag.id).then(setItems);
    setProvisionalPt(selectedBag.provisionalPtPpm?.toString() || "");
    setProvisionalPd(selectedBag.provisionalPdPpm?.toString() || "");
    setProvisionalRh(selectedBag.provisionalRhPpm?.toString() || "");
    setRefinerPt(selectedBag.refinerPtPpm?.toString() || "");
    setRefinerPd(selectedBag.refinerPdPpm?.toString() || "");
    setRefinerRh(selectedBag.refinerRhPpm?.toString() || "");
    setRefinerValue(selectedBag.refinerTotalValue?.toString() || "");
  }, [selectedBagId]);

  // Weighted averages
  const totalW = items.reduce((s, i) => s + i.weight, 0);
  const estPt = totalW > 0 ? items.reduce((s, i) => s + i.estimatedPtPpm * i.weight, 0) / totalW : 0;
  const estPd = totalW > 0 ? items.reduce((s, i) => s + i.estimatedPdPpm * i.weight, 0) / totalW : 0;
  const estRh = totalW > 0 ? items.reduce((s, i) => s + i.estimatedRhPpm * i.weight, 0) / totalW : 0;

  const variance = (estimated: number, actual: string) => {
    const a = parseFloat(actual);
    if (!a || !estimated) return null;
    return ((a - estimated) / estimated * 100);
  };

  const VarianceBadge = ({ value }: { value: number | null }) => {
    if (value === null) return <span className="text-muted-foreground">—</span>;
    const positive = value >= 0;
    return (
      <Badge className={positive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
        {positive ? "+" : ""}{fmtNum(value, 1)}%
      </Badge>
    );
  };

  const handleSave = async () => {
    if (!selectedBag) return;
    setSaving(true);
    await updateBagAnalysis(selectedBag.id, {
      provisionalPtPpm: provisionalPt ? parseFloat(provisionalPt) : null,
      provisionalPdPpm: provisionalPd ? parseFloat(provisionalPd) : null,
      provisionalRhPpm: provisionalRh ? parseFloat(provisionalRh) : null,
      refinerPtPpm: refinerPt ? parseFloat(refinerPt) : null,
      refinerPdPpm: refinerPd ? parseFloat(refinerPd) : null,
      refinerRhPpm: refinerRh ? parseFloat(refinerRh) : null,
      refinerTotalValue: refinerValue ? parseFloat(refinerValue) : null,
    });
    setSaving(false);
    toast({ title: "Dados de análise salvos" });
    const updated = await loadBags();
    setBags(updated.filter(b => b.status === "Fechado" || b.status === "Exportado"));
  };

  // Financial
  const costPerKg = selectedBag && selectedBag.totalWeight > 0 ? selectedBag.totalPaidBrl / selectedBag.totalWeight : 0;
  const supplierTotals = items.reduce((acc, item) => {
    acc[item.supplierName] = (acc[item.supplierName] || 0) + item.paidValue;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div>
        <Label>Selecionar Bag</Label>
        <Select value={selectedBagId} onValueChange={setSelectedBagId}>
          <SelectTrigger><SelectValue placeholder="Selecione um bag fechado ou exportado..." /></SelectTrigger>
          <SelectContent>
            {bags.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.bagNumber} — {b.bagLabel} ({b.status})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedBag && (
        <>
          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Valor Total Pago</CardTitle></CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{fmtBrl(selectedBag.totalPaidBrl)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Custo Médio/kg</CardTitle></CardHeader>
              <CardContent>
                <div className="text-xl font-bold">R$ {fmtNum(costPerKg, 2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Peso Total</CardTitle></CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{fmtNum(selectedBag.totalWeight, 1)} kg</div>
              </CardContent>
            </Card>
          </div>

          {/* Supplier Breakdown */}
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

          {/* Analysis inputs */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Provisional Assay (Nosso Laboratório)</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">Pt (ppm)</Label><Input value={provisionalPt} onChange={e => setProvisionalPt(e.target.value)} type="number" /></div>
                <div><Label className="text-xs">Pd (ppm)</Label><Input value={provisionalPd} onChange={e => setProvisionalPd(e.target.value)} type="number" /></div>
                <div><Label className="text-xs">Rh (ppm)</Label><Input value={provisionalRh} onChange={e => setProvisionalRh(e.target.value)} type="number" /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Final Assay (Refinador / Cliente)</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div><Label className="text-xs">Pt (ppm)</Label><Input value={refinerPt} onChange={e => setRefinerPt(e.target.value)} type="number" /></div>
                <div><Label className="text-xs">Pd (ppm)</Label><Input value={refinerPd} onChange={e => setRefinerPd(e.target.value)} type="number" /></div>
                <div><Label className="text-xs">Rh (ppm)</Label><Input value={refinerRh} onChange={e => setRefinerRh(e.target.value)} type="number" /></div>
              </div>
              <div>
                <Label className="text-xs">Valor Total do Refinador (R$)</Label>
                <Input value={refinerValue} onChange={e => setRefinerValue(e.target.value)} type="number" />
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar Dados de Análise"}</Button>

          {/* Comparison Table */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Comparativo de PPMs</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metal</TableHead>
                    <TableHead>Estimado (Compra)</TableHead>
                    <TableHead>Provisional Assay</TableHead>
                    <TableHead>Final Assay</TableHead>
                    <TableHead>Var. Prov. vs Estim.</TableHead>
                    <TableHead>Var. Final vs Prov.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { metal: "Pt", est: estPt, prov: provisionalPt, final: refinerPt },
                    { metal: "Pd", est: estPd, prov: provisionalPd, final: refinerPd },
                    { metal: "Rh", est: estRh, prov: provisionalRh, final: refinerRh },
                  ].map((row) => (
                    <TableRow key={row.metal}>
                      <TableCell className="font-medium">{row.metal}</TableCell>
                      <TableCell>{fmtNum(row.est, 1)}</TableCell>
                      <TableCell>{row.prov || "—"}</TableCell>
                      <TableCell>{row.final || "—"}</TableCell>
                      <TableCell><VarianceBadge value={variance(row.est, row.prov)} /></TableCell>
                      <TableCell><VarianceBadge value={row.prov ? variance(parseFloat(row.prov), row.final) : null} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Value comparison */}
          {refinerValue && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Comparativo de Valor</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Valor Pago:</span>{" "}
                    <strong>{fmtBrl(selectedBag.totalPaidBrl)}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valor Refinador:</span>{" "}
                    <strong>{fmtBrl(parseFloat(refinerValue))}</strong>
                  </div>
                  <div>
                    <VarianceBadge value={selectedBag.totalPaidBrl > 0
                      ? ((parseFloat(refinerValue) - selectedBag.totalPaidBrl) / selectedBag.totalPaidBrl * 100)
                      : null
                    } />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}