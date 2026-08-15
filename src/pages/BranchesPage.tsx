import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Building2, FileUp, Plus, Truck, Loader2, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { fmtBrl, fmtKg, fmtPctFixed } from "@/lib/utils";
import { usePermissions } from "@/lib/permissions";
import { useAuth } from "@/contexts/AuthContext";
import {
  Branch,
  BranchTransfer,
  BranchLedgerEntry,
  BranchSettlement,
  TransferStatus,
  TRANSFER_STATUS_LABELS,
  AWAITING_TRANSFER_STATUS,
  loadBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  loadTransfers,
  createTransfer,
  updateTransferStatus,
  addPurchaseToTransfer,
  loadLedgerEntries,
  createLedgerEntry,
  loadBranchBalance,
  loadSettlements,
  closeSettlementPeriod,
} from "@/lib/branches";
import { Purchase, loadPurchases } from "@/lib/purchases";
import ImportPedidoDialog from "@/components/branches/ImportPedidoDialog";

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function BranchesPage() {
  const { user } = useAuth();
  const { canDo } = usePermissions();
  const canCreate = canDo("filiais", "create");
  const canEdit = canDo("filiais", "edit");
  const canLedger = canDo("filiais", "ledger");
  const canSettle = canDo("filiais", "settle");

  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [transfers, setTransfers] = useState<BranchTransfer[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [ledger, setLedger] = useState<BranchLedgerEntry[]>([]);
  const [settlements, setSettlements] = useState<BranchSettlement[]>([]);
  const [balance, setBalance] = useState({ balanceBrl: 0, openEntries: 0 });

  const [importOpen, setImportOpen] = useState(false);
  const [branchDialog, setBranchDialog] = useState<Branch | "new" | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [b, t, p] = await Promise.all([loadBranches(), loadTransfers(), loadPurchases()]);
      setBranches(b);
      setTransfers(t);
      setPurchases(p);
      setSelectedBranch((prev) => prev || b[0]?.id || "");
    } catch {
      toast({ title: "Erro ao carregar filiais", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  const refreshLedger = useCallback(async (branchId: string) => {
    if (!branchId) return;
    const [entries, bal, setts] = await Promise.all([
      loadLedgerEntries(branchId),
      loadBranchBalance(branchId),
      loadSettlements(branchId),
    ]);
    setLedger(entries);
    setBalance(bal);
    setSettlements(setts);
  }, []);

  useEffect(() => {
    refreshLedger(selectedBranch);
  }, [selectedBranch, refreshLedger]);

  const branchName = (id?: string | null) => branches.find((b) => b.id === id)?.name || "—";

  const pendingPurchases = purchases.filter(
    (p) => p.branchId && p.status === AWAITING_TRANSFER_STATUS && !p.transferBatchId
  );

  // ===== Filiais (cadastro) =====
  const [form, setForm] = useState({ name: "", code: "", contactPerson: "", phone: "", hasLocalStock: false, active: true });

  const openBranchDialog = (b: Branch | "new") => {
    setBranchDialog(b);
    if (b === "new") setForm({ name: "", code: "", contactPerson: "", phone: "", hasLocalStock: false, active: true });
    else setForm({ name: b.name, code: b.code, contactPerson: b.contactPerson, phone: b.phone, hasLocalStock: b.hasLocalStock, active: b.active });
  };

  const saveBranch = async () => {
    if (!form.name.trim()) {
      toast({ title: "Informe o nome da filial", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const ok = branchDialog === "new"
        ? !!(await createBranch(form))
        : await updateBranch((branchDialog as Branch).id, form);
      if (!ok) {
        toast({ title: "Não foi possível salvar a filial", variant: "destructive" });
        return;
      }
      toast({ title: branchDialog === "new" ? "Filial cadastrada" : "Filial atualizada" });
      setBranchDialog(null);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const removeBranch = async (b: Branch) => {
    if (!confirm(`Excluir a filial ${b.name}?`)) return;
    const ok = await deleteBranch(b.id);
    toast({
      title: ok ? "Filial excluída" : "Não foi possível excluir",
      description: ok ? undefined : "Verifique se existem compras ou lançamentos vinculados.",
      variant: ok ? undefined : "destructive",
    });
    if (ok) refresh();
  };

  // ===== Lotes =====
  const newTransfer = async (branchId: string) => {
    setBusy(true);
    try {
      const t = await createTransfer(branchId);
      if (!t) {
        toast({ title: "Erro ao abrir o lote", variant: "destructive" });
        return;
      }
      toast({ title: "Lote aberto" });
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const advanceTransfer = async (t: BranchTransfer) => {
    const order: TransferStatus[] = ["aberto", "em_transito", "recebido", "conferido"];
    const next = order[order.indexOf(t.status) + 1];
    if (!next) return;
    setBusy(true);
    try {
      const ok = await updateTransferStatus(t.id, next);
      if (!ok) {
        toast({ title: "Erro ao atualizar o lote", variant: "destructive" });
        return;
      }
      toast({
        title: `Lote marcado como ${TRANSFER_STATUS_LABELS[next]}`,
        description: next === "recebido" ? "As compras do lote entraram em Conferência na matriz." : undefined,
      });
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const attach = async (purchaseId: string, transferId: string) => {
    const ok = await addPurchaseToTransfer(purchaseId, transferId);
    toast({ title: ok ? "Compra vinculada ao lote" : "Erro ao vincular", variant: ok ? undefined : "destructive" });
    if (ok) refresh();
  };

  // ===== Confronto =====
  const reconciliationRows = purchases
    .filter((p) => p.branchId && (p.weightReal != null || p.totalBrl != null))
    .filter((p) => !selectedBranch || p.branchId === selectedBranch)
    .map((p) => {
      const wDecl = Number(p.weightDeclared) || 0;
      const wReal = Number(p.weightReal) || 0;
      const vDecl = Number(p.declaredValueBrl) || 0;
      const vReal = Number(p.totalBrl) || 0;
      return {
        purchase: p,
        wDecl,
        wReal,
        wDiff: wReal - wDecl,
        wPct: wDecl > 0 ? ((wReal - wDecl) / wDecl) * 100 : 0,
        vDecl,
        vReal,
        vDiff: vReal - vDecl,
        vPct: vDecl > 0 ? ((vReal - vDecl) / vDecl) * 100 : 0,
      };
    });

  const [ledgerDialog, setLedgerDialog] = useState<(typeof reconciliationRows)[number] | null>(null);
  const [ledgerForm, setLedgerForm] = useState({ amount: "0", type: "debito" as "credito" | "debito", reason: "" });

  const openLedgerDialog = (row: (typeof reconciliationRows)[number]) => {
    setLedgerDialog(row);
    setLedgerForm({
      amount: Math.abs(row.vDiff).toFixed(2).replace(".", ","),
      type: row.vDiff >= 0 ? "credito" : "debito",
      reason: `Diferença do pedido ${row.purchase.sourcePedidoNumber || row.purchase.purchaseNumber}`,
    });
  };

  const saveLedger = async () => {
    if (!ledgerDialog) return;
    const amount = parseFloat(ledgerForm.amount.replace(/\./g, "").replace(",", ".")) || 0;
    if (amount <= 0 || !ledgerForm.reason.trim()) {
      toast({ title: "Informe valor e motivo", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const created = await createLedgerEntry({
        branchId: ledgerDialog.purchase.branchId!,
        purchaseId: ledgerDialog.purchase.id,
        entryType: ledgerForm.type,
        amountBrl: amount,
        reason: ledgerForm.reason.trim(),
        weightDeclared: ledgerDialog.wDecl,
        weightReal: ledgerDialog.wReal,
        valueDeclared: ledgerDialog.vDecl,
        valueReal: ledgerDialog.vReal,
      });
      if (!created) {
        toast({ title: "Erro ao lançar na conta corrente", variant: "destructive" });
        return;
      }
      toast({ title: "Lançamento registrado" });
      setLedgerDialog(null);
      refreshLedger(ledgerDialog.purchase.branchId!);
    } finally {
      setBusy(false);
    }
  };

  // ===== Fechamento =====
  const [period, setPeriod] = useState({ start: todayIso().slice(0, 8) + "01", end: todayIso() });

  const closePeriod = async () => {
    if (!selectedBranch) return;
    if (!confirm("Fechar o período? Os lançamentos em aberto serão marcados como liquidados.")) return;
    setBusy(true);
    try {
      const s = await closeSettlementPeriod({
        branchId: selectedBranch,
        periodStart: period.start,
        periodEnd: period.end,
      });
      if (!s) {
        toast({ title: "Nenhum lançamento em aberto no período", variant: "destructive" });
        return;
      }
      toast({ title: "Período fechado", description: `Total liquidado: ${fmtBrl(s.totalBrl)}` });
      refreshLedger(selectedBranch);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" /> Filiais
          </h1>
          <p className="text-sm text-muted-foreground">Pedidos das filiais, lotes de transferência e conta corrente</p>
        </div>
        {canCreate && (
          <Button onClick={() => setImportOpen(true)}>
            <FileUp className="h-4 w-4 mr-2" /> Importar pedido (PDF)
          </Button>
        )}
      </div>

      <Tabs defaultValue="pedidos">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
          <TabsTrigger value="lotes">Lotes</TabsTrigger>
          <TabsTrigger value="confronto">Confronto</TabsTrigger>
          <TabsTrigger value="conta">Conta Corrente</TabsTrigger>
          <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
        </TabsList>

        {/* ===== Pedidos aguardando transferência ===== */}
        <TabsContent value="pedidos" className="space-y-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Aguardando transferência ({pendingPurchases.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {pendingPurchases.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum pedido pendente de envio para a matriz.</p>
              )}
              {pendingPurchases.map((p) => {
                const openTransfers = transfers.filter((t) => t.branchId === p.branchId && t.status === "aberto");
                return (
                  <div key={p.id} className="border rounded-md p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <p className="font-medium">
                        {p.purchaseNumber} · {p.supplierName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {branchName(p.branchId)} · pedido {p.sourcePedidoNumber || "—"} · {fmtKg(Number(p.weightDeclared) || 0, 3)} ·{" "}
                        {fmtBrl(Number(p.declaredValueBrl) || 0)}
                      </p>
                    </div>
                    {canEdit && (
                      <Select onValueChange={(v) => (v === "__new" ? newTransfer(p.branchId!) : attach(p.id, v))}>
                        <SelectTrigger className="sm:w-56"><SelectValue placeholder="Vincular a um lote" /></SelectTrigger>
                        <SelectContent>
                          {openTransfers.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              Lote {t.id.slice(0, 8)} · {TRANSFER_STATUS_LABELS[t.status]}
                            </SelectItem>
                          ))}
                          <SelectItem value="__new">+ Abrir novo lote</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Lotes ===== */}
        <TabsContent value="lotes" className="space-y-3">
          {transfers.length === 0 && <p className="text-sm text-muted-foreground">Nenhum lote de transferência criado.</p>}
          {transfers.map((t) => {
            const linked = purchases.filter((p) => p.transferBatchId === t.id);
            const weight = linked.reduce((a, p) => a + (Number(p.weightDeclared) || 0), 0);
            const value = linked.reduce((a, p) => a + (Number(p.declaredValueBrl) || 0), 0);
            return (
              <Card key={t.id}>
                <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Truck className="h-4 w-4" /> Lote {t.id.slice(0, 8)} · {branchName(t.branchId)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {linked.length} compra(s) · {fmtKg(weight, 3)} · {fmtBrl(value)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={t.status === "conferido" ? "default" : "secondary"}>{TRANSFER_STATUS_LABELS[t.status]}</Badge>
                    {canEdit && t.status !== "conferido" && (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => advanceTransfer(t)}>
                        Avançar
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {linked.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma compra vinculada.</p>
                  ) : (
                    <ul className="text-sm space-y-1">
                      {linked.map((p) => (
                        <li key={p.id} className="flex justify-between gap-2">
                          <span>{p.purchaseNumber} · {p.supplierName}</span>
                          <span className="text-muted-foreground">{p.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ===== Confronto ===== */}
        <TabsContent value="confronto" className="space-y-3">
          <div className="max-w-xs">
            <Label>Filial</Label>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Compra</TableHead>
                  <TableHead>Peso declarado</TableHead>
                  <TableHead>Peso real</TableHead>
                  <TableHead>Dif. peso</TableHead>
                  <TableHead>Valor declarado</TableHead>
                  <TableHead>Valor real</TableHead>
                  <TableHead>Dif. valor</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {reconciliationRows.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhuma compra para confronto.</TableCell></TableRow>
                )}
                {reconciliationRows.map((r) => (
                  <TableRow key={r.purchase.id}>
                    <TableCell>
                      <p className="font-medium">{r.purchase.purchaseNumber}</p>
                      <p className="text-xs text-muted-foreground">{r.purchase.supplierName}</p>
                    </TableCell>
                    <TableCell>{fmtKg(r.wDecl, 3)}</TableCell>
                    <TableCell>{fmtKg(r.wReal, 3)}</TableCell>
                    <TableCell className={r.wDiff < 0 ? "text-destructive" : "text-emerald-600"}>
                      {fmtKg(r.wDiff, 3)} ({fmtPctFixed(r.wPct)})
                    </TableCell>
                    <TableCell>{fmtBrl(r.vDecl)}</TableCell>
                    <TableCell>{fmtBrl(r.vReal)}</TableCell>
                    <TableCell className={r.vDiff < 0 ? "text-destructive" : "text-emerald-600"}>
                      {fmtBrl(r.vDiff)} ({fmtPctFixed(r.vPct)})
                    </TableCell>
                    <TableCell>
                      {canLedger && (
                        <Button size="sm" variant="outline" onClick={() => openLedgerDialog(r)}>
                          Lançar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ===== Conta corrente ===== */}
        <TabsContent value="conta" className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <Label>Filial</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Card className="sm:col-span-2">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Saldo em aberto</p>
                  <p className="text-xl font-bold">{fmtBrl(balance.balanceBrl)}</p>
                  <p className="text-xs text-muted-foreground">{balance.openEntries} lançamento(s) em aberto</p>
                </div>
                {canSettle && (
                  <div className="flex flex-col sm:flex-row items-end gap-2">
                    <div>
                      <Label className="text-xs">De</Label>
                      <Input type="date" value={period.start} onChange={(e) => setPeriod({ ...period, start: e.target.value })} className="h-9" />
                    </div>
                    <div>
                      <Label className="text-xs">Até</Label>
                      <Input type="date" value={period.end} onChange={(e) => setPeriod({ ...period, end: e.target.value })} className="h-9" />
                    </div>
                    <Button variant="outline" disabled={busy} onClick={closePeriod}>Fechar período</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum lançamento.</TableCell></TableRow>
                )}
                {ledger.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{new Date(e.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <Badge variant={e.entryType === "credito" ? "default" : "secondary"}>
                        {e.entryType === "credito" ? "Crédito" : "Débito"}
                      </Badge>
                    </TableCell>
                    <TableCell className={e.entryType === "credito" ? "text-emerald-600" : "text-destructive"}>
                      {fmtBrl(e.amountBrl)}
                    </TableCell>
                    <TableCell className="text-sm">{e.reason}</TableCell>
                    <TableCell>
                      {e.settlementId ? <Badge variant="outline">Liquidado</Badge> : <Badge variant="secondary">Em aberto</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {settlements.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Períodos fechados</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {settlements.map((s) => (
                  <div key={s.id} className="flex justify-between">
                    <span>
                      {new Date(s.periodStart).toLocaleDateString("pt-BR")} — {new Date(s.periodEnd).toLocaleDateString("pt-BR")}
                    </span>
                    <span className="font-medium">{fmtBrl(s.totalBrl)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== Cadastro ===== */}
        <TabsContent value="cadastro" className="space-y-3">
          {canCreate && (
            <Button variant="outline" onClick={() => openBranchDialog("new")}>
              <Plus className="h-4 w-4 mr-2" /> Nova filial
            </Button>
          )}
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Bag própria</TableHead>
                  <TableHead>Ativa</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>{b.code || "—"}</TableCell>
                    <TableCell>{b.contactPerson || "—"}</TableCell>
                    <TableCell>{b.phone || "—"}</TableCell>
                    <TableCell>{b.hasLocalStock ? "Sim" : "Não"}</TableCell>
                    <TableCell>{b.active ? <Badge>Ativa</Badge> : <Badge variant="secondary">Inativa</Badge>}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {canEdit && <Button size="sm" variant="outline" onClick={() => openBranchDialog(b)}>Editar</Button>}
                      {canDo("filiais", "delete") && (
                        <Button size="icon" variant="ghost" onClick={() => removeBranch(b)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <ImportPedidoDialog open={importOpen} onOpenChange={setImportOpen} branches={branches} onCreated={refresh} />

      {/* Dialog filial */}
      <Dialog open={!!branchDialog} onOpenChange={(v) => !v && setBranchDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{branchDialog === "new" ? "Nova filial" : "Editar filial"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Código</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Responsável</Label>
              <Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Possui Bag própria</Label>
              <Switch checked={form.hasLocalStock} onCheckedChange={(v) => setForm({ ...form, hasLocalStock: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Ativa</Label>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBranchDialog(null)} disabled={busy}>Cancelar</Button>
            <Button onClick={saveBranch} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog lançamento */}
      <Dialog open={!!ledgerDialog} onOpenChange={(v) => !v && setLedgerDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Lançar na conta corrente</DialogTitle></DialogHeader>
          {ledgerDialog && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {ledgerDialog.purchase.purchaseNumber} · declarado {fmtBrl(ledgerDialog.vDecl)} · real {fmtBrl(ledgerDialog.vReal)}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={ledgerForm.type} onValueChange={(v) => setLedgerForm({ ...ledgerForm, type: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credito">Crédito (a favor da filial)</SelectItem>
                      <SelectItem value="debito">Débito (a favor da matriz)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor (R$)</Label>
                  <Input
                    inputMode="decimal"
                    value={ledgerForm.amount}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, amount: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Motivo</Label>
                <Textarea value={ledgerForm.reason} onChange={(e) => setLedgerForm({ ...ledgerForm, reason: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLedgerDialog(null)} disabled={busy}>Cancelar</Button>
            <Button onClick={saveLedger} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Confirmar lançamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
