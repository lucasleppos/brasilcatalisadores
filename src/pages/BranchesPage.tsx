import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Building2, FileUp, Plus, Truck, Loader2, Trash2, Undo2, Download, X } from "lucide-react";
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
  BRANCH_CONFERENCE_STATUS,
  loadBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  loadTransfers,
  createTransfer,
  updateTransferStatus,
  revertTransferStatus,
  transferCode,
  addPurchaseToTransfer,
  removePurchaseFromTransfer,
  loadLedgerEntries,
  createLedgerEntry,
  loadBranchBalance,
  loadSettlements,
  closeSettlementPeriod,
} from "@/lib/branches";
import { Purchase, loadPurchases, EXCLUDED_CATEGORY } from "@/lib/purchases";
import ImportPedidoDialog from "@/components/branches/ImportPedidoDialog";
import BranchConferenciaPanel from "@/components/branches/BranchConferenciaPanel";

const todayIso = () => new Date().toISOString().slice(0, 10);
const parseBrl = (s: string) => parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;

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
  const branchById = (id?: string | null) => branches.find((b) => b.id === id);

  const pendingPurchases = purchases.filter(
    (p) => p.branchId && p.status === AWAITING_TRANSFER_STATUS && !p.transferBatchId
  );

  // ===== Conferência da filial =====
  const [conferPurchase, setConferPurchase] = useState<Purchase | null>(null);

  const conferencePurchases = purchases.filter(
    (p) => p.branchId && p.status === BRANCH_CONFERENCE_STATUS
  );

  /** Códigos das peças aptas de uma compra (para relatório/lista) */
  const aptCodes = (p: Purchase) =>
    p.items
      .filter((i) => i.category !== EXCLUDED_CATEGORY)
      .map((i) => i.catalogPartCode || i.partCode || (i.itemType === "ceramico" ? "granel" : "s/código"));

  /** Unidades aptas (marcadas) e não marcadas de uma compra de filial */
  const unitCounts = (p: Purchase) => {
    const apt = p.items.filter((i) => i.category !== EXCLUDED_CATEGORY);
    const out = p.items.filter((i) => i.category === EXCLUDED_CATEGORY);
    const qty = (list: typeof p.items) =>
      list.reduce((a, i) => a + (i.itemType === "ceramico" ? 0 : i.quantity || 1), 0);
    return { apt: qty(apt), out: qty(out) };
  };

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
  const [selectedPending, setSelectedPending] = useState<string[]>([]);
  const [loteFilterBranch, setLoteFilterBranch] = useState<string>("todas");
  const [loteFilterStatus, setLoteFilterStatus] = useState<string>("todos");

  const togglePending = (id: string) =>
    setSelectedPending((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const newTransfer = async (branchId: string, attachIds: string[] = []) => {
    setBusy(true);
    try {
      const t = await createTransfer(branchId);
      if (!t) {
        toast({ title: "Erro ao abrir o lote", variant: "destructive" });
        return;
      }
      for (const pid of attachIds) await addPurchaseToTransfer(pid, t.id);
      toast({ title: "Lote aberto", description: attachIds.length ? `${attachIds.length} compra(s) vinculada(s).` : undefined });
      setSelectedPending([]);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const attachMany = async (transferId: string, ids: string[]) => {
    setBusy(true);
    try {
      let ok = true;
      for (const pid of ids) ok = (await addPurchaseToTransfer(pid, transferId)) && ok;
      toast({
        title: ok ? `${ids.length} compra(s) vinculada(s)` : "Erro ao vincular",
        variant: ok ? undefined : "destructive",
      });
      setSelectedPending([]);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const detach = async (purchaseId: string) => {
    const ok = await removePurchaseFromTransfer(purchaseId);
    toast({ title: ok ? "Compra removida do lote" : "Erro ao remover", variant: ok ? undefined : "destructive" });
    if (ok) refresh();
  };

  const advanceTransfer = async (t: BranchTransfer, linked: Purchase[]) => {
    const order: TransferStatus[] = ["aberto", "em_transito", "recebido", "conferido"];
    const next = order[order.indexOf(t.status) + 1];
    if (!next) return;
    if (next === "em_transito" && linked.length === 0) {
      toast({ title: "Vincule ao menos uma compra ao lote", variant: "destructive" });
      return;
    }
    if (next === "conferido") {
      const missing = linked.filter((p) => p.weightReal == null);
      if (missing.length > 0) {
        toast({
          title: "Conferência incompleta",
          description: `${missing.length} compra(s) ainda sem peso real registrado na matriz.`,
          variant: "destructive",
        });
        return;
      }
    }
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

  const revertTransfer = async (t: BranchTransfer) => {
    if (t.status !== "em_transito") return;
    setBusy(true);
    try {
      const ok = await revertTransferStatus(t.id);
      toast({ title: ok ? "Lote voltou para Aberto" : "Erro ao voltar etapa", variant: ok ? undefined : "destructive" });
      if (ok) refresh();
    } finally {
      setBusy(false);
    }
  };

  const exportTransferReport = (t: BranchTransfer, linked: Purchase[]) => {
    const rows = [
      ["Compra", "Fornecedor", "Pedido", "Código", "Referência", "Un", "Peso (kg)", "Valor (R$)", "Situação"],
      ...linked.flatMap((p) =>
        p.items.map((i) => [
          p.purchaseNumber,
          p.supplierName.replace(/;/g, ","),
          i.pedidoNumber || "",
          i.catalogPartCode || i.partCode || "",
          (i.catalogPartRef || i.partReference || "").replace(/;/g, ","),
          i.itemType === "ceramico" ? "granel" : String(i.quantity || 1),
          (Number(i.weight) || 0).toFixed(3).replace(".", ","),
          (Number(i.totalValue) || 0).toFixed(2).replace(".", ","),
          i.category === EXCLUDED_CATEGORY ? "recusada" : "apta",
        ])
      ),
    ];
    const csv = rows.map((r) => r.join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `lote-${transferCode(t, branchById(t.branchId), transfers)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const visibleTransfers = transfers.filter(
    (t) =>
      (loteFilterBranch === "todas" || t.branchId === loteFilterBranch) &&
      (loteFilterStatus === "todos" || t.status === loteFilterStatus)
  );

  // ===== Confronto =====
  const [confrontoFrom, setConfrontoFrom] = useState("");
  const [confrontoTo, setConfrontoTo] = useState("");

  const launchedPurchaseIds = useMemo(
    () => new Set(ledger.filter((e) => e.purchaseId).map((e) => e.purchaseId as string)),
    [ledger]
  );

  const reconciliationRows = purchases
    .filter((p) => p.branchId && p.weightReal != null)
    .filter((p) => !selectedBranch || p.branchId === selectedBranch)
    .filter((p) => {
      const d = p.date?.slice(0, 10) || "";
      if (confrontoFrom && d < confrontoFrom) return false;
      if (confrontoTo && d > confrontoTo) return false;
      return true;
    })
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
        launched: launchedPurchaseIds.has(p.id),
      };
    });

  const totals = reconciliationRows.reduce(
    (a, r) => ({
      wDecl: a.wDecl + r.wDecl,
      wReal: a.wReal + r.wReal,
      vDecl: a.vDecl + r.vDecl,
      vReal: a.vReal + r.vReal,
    }),
    { wDecl: 0, wReal: 0, vDecl: 0, vReal: 0 }
  );

  type ReconRow = (typeof reconciliationRows)[number];
  const [ledgerDialog, setLedgerDialog] = useState<ReconRow | "manual" | null>(null);
  const [ledgerForm, setLedgerForm] = useState({ amount: "0", type: "debito" as "credito" | "debito", reason: "", base: "valor" as "valor" | "peso" });

  const weightDiffBrl = (row: ReconRow) => {
    // Valor por kg declarado, aplicado à diferença de peso
    const perKg = row.wDecl > 0 ? row.vDecl / row.wDecl : 0;
    return Math.abs(row.wDiff) * perKg;
  };

  const openLedgerDialog = (row: ReconRow) => {
    if (row.launched && !confirm("Esta compra já possui lançamento na conta corrente. Deseja lançar novamente?")) return;
    setLedgerDialog(row);
    setLedgerForm({
      base: "valor",
      amount: Math.abs(row.vDiff).toFixed(2).replace(".", ","),
      type: row.vDiff >= 0 ? "credito" : "debito",
      reason: `Diferença do pedido ${row.purchase.sourcePedidoNumber || row.purchase.purchaseNumber}`,
    });
  };

  const openManualLedger = () => {
    if (!selectedBranch) {
      toast({ title: "Selecione uma filial", variant: "destructive" });
      return;
    }
    setLedgerDialog("manual");
    setLedgerForm({ base: "valor", amount: "", type: "debito", reason: "" });
  };

  const changeBase = (base: "valor" | "peso") => {
    const row = ledgerDialog && ledgerDialog !== "manual" ? ledgerDialog : null;
    if (!row) return;
    const value = base === "valor" ? Math.abs(row.vDiff) : weightDiffBrl(row);
    const sign = base === "valor" ? row.vDiff : row.wDiff;
    setLedgerForm((f) => ({
      ...f,
      base,
      amount: value.toFixed(2).replace(".", ","),
      type: sign >= 0 ? "credito" : "debito",
    }));
  };

  const saveLedger = async () => {
    if (!ledgerDialog) return;
    const amount = parseBrl(ledgerForm.amount);
    if (amount <= 0 || !ledgerForm.reason.trim()) {
      toast({ title: "Informe valor e motivo", variant: "destructive" });
      return;
    }
    const row = ledgerDialog === "manual" ? null : ledgerDialog;
    const branchId = row ? row.purchase.branchId! : selectedBranch;
    setBusy(true);
    try {
      const created = await createLedgerEntry({
        branchId,
        purchaseId: row?.purchase.id ?? null,
        entryType: ledgerForm.type,
        amountBrl: amount,
        reason: ledgerForm.reason.trim(),
        weightDeclared: row?.wDecl ?? null,
        weightReal: row?.wReal ?? null,
        valueDeclared: row?.vDecl ?? null,
        valueReal: row?.vReal ?? null,
      });
      if (!created) {
        toast({ title: "Erro ao lançar na conta corrente", variant: "destructive" });
        return;
      }
      toast({ title: "Lançamento registrado" });
      setLedgerDialog(null);
      refreshLedger(branchId);
    } finally {
      setBusy(false);
    }
  };

  // ===== Conta corrente =====
  const [ledgerFilter, setLedgerFilter] = useState<"aberto" | "liquidado" | "todos">("todos");
  const visibleLedger = ledger.filter((e) =>
    ledgerFilter === "todos" ? true : ledgerFilter === "aberto" ? !e.settlementId : !!e.settlementId
  );

  const exportLedgerCsv = () => {
    const rows = [
      ["Data", "Tipo", "Valor", "Motivo", "Situação"],
      ...visibleLedger.map((e) => [
        new Date(e.createdAt).toLocaleDateString("pt-BR"),
        e.entryType === "credito" ? "Crédito" : "Débito",
        e.amountBrl.toFixed(2).replace(".", ","),
        e.reason.replace(/;/g, ","),
        e.settlementId ? "Liquidado" : "Em aberto",
      ]),
    ];
    const csv = rows.map((r) => r.join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `extrato-${(branchById(selectedBranch)?.code || "filial").toLowerCase()}-${todayIso()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ===== Fechamento =====
  const [period, setPeriod] = useState({ start: todayIso().slice(0, 8) + "01", end: todayIso() });

  const periodPreview = useMemo(() => {
    const inRange = ledger.filter((e) => {
      if (e.settlementId) return false;
      const d = e.createdAt.slice(0, 10);
      return d >= period.start && d <= period.end;
    });
    const credito = inRange.filter((e) => e.entryType === "credito").reduce((a, e) => a + e.amountBrl, 0);
    const debito = inRange.filter((e) => e.entryType === "debito").reduce((a, e) => a + e.amountBrl, 0);
    return { count: inRange.length, credito, debito, saldo: credito - debito };
  }, [ledger, period]);

  const closePeriod = async () => {
    if (!selectedBranch) return;
    if (periodPreview.count === 0) {
      toast({ title: "Nenhum lançamento em aberto no período", variant: "destructive" });
      return;
    }
    if (
      !confirm(
        `Fechar o período?\n${periodPreview.count} lançamento(s)\nCréditos: ${fmtBrl(periodPreview.credito)}\nDébitos: ${fmtBrl(
          periodPreview.debito
        )}\nSaldo: ${fmtBrl(periodPreview.saldo)}`
      )
    )
      return;
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

      <Tabs defaultValue="conferencia">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="conferencia">
            Conferência{conferencePurchases.length > 0 ? ` (${conferencePurchases.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="pedidos">Estoque</TabsTrigger>
          <TabsTrigger value="lotes">Lotes</TabsTrigger>
          <TabsTrigger value="confronto">Confronto</TabsTrigger>
          <TabsTrigger value="conta">Conta Corrente</TabsTrigger>
          <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
        </TabsList>

        {/* ===== Conferência da filial ===== */}
        <TabsContent value="conferencia" className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Compras importadas aguardando conferência ({conferencePurchases.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {conferencePurchases.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma compra aguardando conferência. Importe um pedido em PDF para começar.
                </p>
              )}
              {conferencePurchases.map((p) => {
                const c = unitCounts(p);
                return (
                  <div key={p.id} className="border rounded-md p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        {p.purchaseNumber} · {p.supplierName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {branchName(p.branchId)} · {c.apt + c.out} un · {fmtKg(Number(p.weightDeclared) || 0, 3)} ·{" "}
                        {fmtBrl(Number(p.declaredValueBrl) || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        pedidos de origem: {p.sourcePedidoNumber || "—"}
                      </p>
                    </div>
                    {canEdit && (
                      <Button size="sm" onClick={() => setConferPurchase(p)}>
                        Conferir
                      </Button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Pedidos aguardando transferência ===== */}
        <TabsContent value="pedidos" className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Estoque da filial · aguardando transferência ({pendingPurchases.length})
              </CardTitle>
              {pendingPurchases.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Total conferido: {pendingPurchases.reduce((a, p) => a + unitCounts(p).apt, 0)} un ·{" "}
                  {fmtKg(pendingPurchases.reduce((a, p) => a + (Number(p.weightDeclared) || 0), 0), 3)} ·{" "}
                  {fmtBrl(pendingPurchases.reduce((a, p) => a + (Number(p.declaredValueBrl) || 0), 0))}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingPurchases.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum pedido pendente de envio para a matriz.</p>
              )}

              {canEdit && selectedPending.length > 0 && (() => {
                const branchIds = new Set(
                  pendingPurchases.filter((p) => selectedPending.includes(p.id)).map((p) => p.branchId)
                );
                const single = branchIds.size === 1 ? ([...branchIds][0] as string) : null;
                const openTransfers = single ? transfers.filter((t) => t.branchId === single && t.status === "aberto") : [];
                return (
                  <div className="border rounded-md p-3 bg-muted/40 flex flex-col sm:flex-row sm:items-center gap-2">
                    {(() => {
                      const sel = pendingPurchases.filter((p) => selectedPending.includes(p.id));
                      const un = sel.reduce((a, p) => a + unitCounts(p).apt, 0);
                      const w = sel.reduce((a, p) => a + (Number(p.weightDeclared) || 0), 0);
                      const v = sel.reduce((a, p) => a + (Number(p.declaredValueBrl) || 0), 0);
                      return (
                        <p className="text-sm flex-1">
                          {sel.length} compra(s) · {un} un · {fmtKg(w, 3)} · {fmtBrl(v)}
                        </p>
                      );
                    })()}
                    {!single ? (
                      <p className="text-xs text-destructive">Selecione pedidos de uma única filial para agrupar.</p>
                    ) : (
                      <Select
                        onValueChange={(v) =>
                          v === "__new" ? newTransfer(single, selectedPending) : attachMany(v, selectedPending)
                        }
                      >
                        <SelectTrigger className="sm:w-64"><SelectValue placeholder="Vincular selecionados a um lote" /></SelectTrigger>
                        <SelectContent>
                          {openTransfers.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {transferCode(t, branchById(t.branchId), transfers)}
                            </SelectItem>
                          ))}
                          <SelectItem value="__new">+ Abrir novo lote</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setSelectedPending([])}>Limpar</Button>
                  </div>
                );
              })()}

              {pendingPurchases.map((p) => {
                const openTransfers = transfers.filter((t) => t.branchId === p.branchId && t.status === "aberto");
                return (
                  <div key={p.id} className="border rounded-md p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    {canEdit && (
                      <Checkbox checked={selectedPending.includes(p.id)} onCheckedChange={() => togglePending(p.id)} />
                    )}
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
                      <Select
                        onValueChange={(v) => (v === "__new" ? newTransfer(p.branchId!, [p.id]) : attachMany(v, [p.id]))}
                      >
                        <SelectTrigger className="sm:w-56"><SelectValue placeholder="Vincular a um lote" /></SelectTrigger>
                        <SelectContent>
                          {openTransfers.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {transferCode(t, branchById(t.branchId), transfers)}
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
          <div className="grid gap-2 sm:grid-cols-2 max-w-xl">
            <div>
              <Label className="text-xs">Filial</Label>
              <Select value={loteFilterBranch} onValueChange={setLoteFilterBranch}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={loteFilterStatus} onValueChange={setLoteFilterStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {(Object.keys(TRANSFER_STATUS_LABELS) as TransferStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{TRANSFER_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {visibleTransfers.length === 0 && <p className="text-sm text-muted-foreground">Nenhum lote de transferência.</p>}
          {visibleTransfers.map((t) => {
            const linked = purchases.filter((p) => p.transferBatchId === t.id);
            const weight = linked.reduce((a, p) => a + (Number(p.weightDeclared) || 0), 0);
            const value = linked.reduce((a, p) => a + (Number(p.declaredValueBrl) || 0), 0);
            const checked = linked.filter((p) => p.weightReal != null).length;
            const arrived = t.status === "recebido" || t.status === "conferido";
            return (
              <Card key={t.id}>
                <CardHeader className="pb-2 flex flex-col sm:flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Truck className="h-4 w-4" /> {transferCode(t, branchById(t.branchId), transfers)} · {branchName(t.branchId)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {linked.length} compra(s) · {fmtKg(weight, 3)} · {fmtBrl(value)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Enviado: {t.sentAt ? new Date(t.sentAt).toLocaleDateString("pt-BR") : "—"} · Recebido:{" "}
                      {t.receivedAt ? new Date(t.receivedAt).toLocaleDateString("pt-BR") : "—"}
                      {arrived && ` · Conferidas ${checked}/${linked.length}`}
                    </p>
                    {t.notes && <p className="text-xs text-muted-foreground mt-1">Obs.: {t.notes}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={t.status === "conferido" ? "default" : "secondary"}>{TRANSFER_STATUS_LABELS[t.status]}</Badge>
                    {canEdit && t.status === "em_transito" && (
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => revertTransfer(t)}>
                        <Undo2 className="h-4 w-4 mr-1" /> Voltar etapa
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => exportTransferReport(t, linked)}>
                      <Download className="h-4 w-4 mr-1" /> Relatório
                    </Button>
                    {canEdit && t.status !== "conferido" && (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => advanceTransfer(t, linked)}>
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
                        <li key={p.id} className="flex items-center justify-between gap-2 border-b last:border-0 py-1">
                          <span className="flex-1">
                            {p.purchaseNumber} · {p.supplierName}
                            <span className="text-xs text-muted-foreground ml-2">
                              {unitCounts(p).apt} un aptas
                              {unitCounts(p).out > 0 ? ` · ${unitCounts(p).out} recusadas` : ""} ·{" "}
                              {fmtKg(Number(p.weightDeclared) || 0, 3)} · {fmtBrl(Number(p.declaredValueBrl) || 0)}
                            </span>
                            {arrived && (
                              <span className="text-xs text-muted-foreground ml-2">
                                {p.weightReal != null
                                  ? `real ${fmtKg(Number(p.weightReal), 3)}`
                                  : "aguardando conferência"}
                              </span>
                            )}
                          </span>
                          <span className="text-muted-foreground text-xs hidden sm:block max-w-[16rem] truncate font-mono">
                            {aptCodes(p).slice(0, 4).join(", ")}
                            {aptCodes(p).length > 4 ? ` +${aptCodes(p).length - 4}` : ""}
                          </span>
                          <span className="text-muted-foreground text-xs">{p.status}</span>
                          {canEdit && t.status === "aberto" && (
                            <Button size="icon" variant="ghost" onClick={() => detach(p.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
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
          <div className="grid gap-2 sm:grid-cols-3 max-w-2xl">
            <div>
              <Label className="text-xs">Filial</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">De</Label>
              <Input type="date" value={confrontoFrom} onChange={(e) => setConfrontoFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Até</Label>
              <Input type="date" value={confrontoTo} onChange={(e) => setConfrontoTo(e.target.value)} />
            </div>
          </div>

          {/* Mobile: cartões */}
          <div className="space-y-2 md:hidden">
            {reconciliationRows.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma compra conferida para confronto.</p>
            )}
            {reconciliationRows.map((r) => (
              <Card key={r.purchase.id}>
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{r.purchase.purchaseNumber}</p>
                    {r.launched && <Badge variant="outline">Lançado</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{r.purchase.supplierName}</p>
                  <p className="text-sm">Peso: {fmtKg(r.wDecl, 3)} → {fmtKg(r.wReal, 3)}{" "}
                    <span className={r.wDiff < 0 ? "text-destructive" : "text-emerald-600"}>({fmtPctFixed(r.wPct)})</span>
                  </p>
                  <p className="text-sm">Valor: {fmtBrl(r.vDecl)} → {fmtBrl(r.vReal)}{" "}
                    <span className={r.vDiff < 0 ? "text-destructive" : "text-emerald-600"}>({fmtPctFixed(r.vPct)})</span>
                  </p>
                  {canLedger && (
                    <Button size="sm" variant="outline" className="w-full mt-1" onClick={() => openLedgerDialog(r)}>
                      Lançar na conta corrente
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="border rounded-md overflow-x-auto hidden md:block">
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
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhuma compra conferida para confronto.</TableCell></TableRow>
                )}
                {reconciliationRows.map((r) => (
                  <TableRow key={r.purchase.id}>
                    <TableCell>
                      <p className="font-medium flex items-center gap-2">
                        {r.purchase.purchaseNumber}
                        {r.launched && <Badge variant="outline">Lançado</Badge>}
                      </p>
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
                {reconciliationRows.length > 0 && (
                  <TableRow className="font-medium bg-muted/40">
                    <TableCell>Totais</TableCell>
                    <TableCell>{fmtKg(totals.wDecl, 3)}</TableCell>
                    <TableCell>{fmtKg(totals.wReal, 3)}</TableCell>
                    <TableCell className={totals.wReal - totals.wDecl < 0 ? "text-destructive" : "text-emerald-600"}>
                      {fmtKg(totals.wReal - totals.wDecl, 3)}
                    </TableCell>
                    <TableCell>{fmtBrl(totals.vDecl)}</TableCell>
                    <TableCell>{fmtBrl(totals.vReal)}</TableCell>
                    <TableCell className={totals.vReal - totals.vDecl < 0 ? "text-destructive" : "text-emerald-600"}>
                      {fmtBrl(totals.vReal - totals.vDecl)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                )}
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
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Saldo em aberto</p>
                  <p className="text-xl font-bold">{fmtBrl(balance.balanceBrl)}</p>
                  <p className="text-xs text-muted-foreground">{balance.openEntries} lançamento(s) em aberto</p>
                </div>
                {canSettle && (
                  <div className="flex flex-col sm:flex-row sm:items-end gap-2">
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

          {canSettle && (
            <p className="text-xs text-muted-foreground">
              No período selecionado: {periodPreview.count} lançamento(s) · créditos {fmtBrl(periodPreview.credito)} · débitos{" "}
              {fmtBrl(periodPreview.debito)} · saldo {fmtBrl(periodPreview.saldo)}
            </p>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Select value={ledgerFilter} onValueChange={(v) => setLedgerFilter(v as any)}>
              <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aberto">Em aberto</SelectItem>
                <SelectItem value="liquidado">Liquidados</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              {canLedger && (
                <Button variant="outline" size="sm" onClick={openManualLedger}>
                  <Plus className="h-4 w-4 mr-1" /> Lançamento avulso
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={exportLedgerCsv} disabled={visibleLedger.length === 0}>
                <Download className="h-4 w-4 mr-1" /> Exportar CSV
              </Button>
            </div>
          </div>

          {/* Mobile: cartões */}
          <div className="space-y-2 md:hidden">
            {visibleLedger.length === 0 && <p className="text-sm text-muted-foreground">Nenhum lançamento.</p>}
            {visibleLedger.map((e) => (
              <Card key={e.id}>
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant={e.entryType === "credito" ? "default" : "secondary"}>
                      {e.entryType === "credito" ? "Crédito" : "Débito"}
                    </Badge>
                    <span className={e.entryType === "credito" ? "text-emerald-600 font-medium" : "text-destructive font-medium"}>
                      {fmtBrl(e.amountBrl)}
                    </span>
                  </div>
                  <p className="text-sm">{e.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.createdAt).toLocaleDateString("pt-BR")} · {e.settlementId ? "Liquidado" : "Em aberto"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="border rounded-md overflow-x-auto hidden md:block">
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
                {visibleLedger.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum lançamento.</TableCell></TableRow>
                )}
                {visibleLedger.map((e) => (
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

      {conferPurchase && (
        <BranchConferenciaPanel
          purchase={conferPurchase}
          open={!!conferPurchase}
          onOpenChange={(v) => !v && setConferPurchase(null)}
          onCompleted={refresh}
        />
      )}


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
          <DialogHeader>
            <DialogTitle>{ledgerDialog === "manual" ? "Lançamento avulso" : "Lançar na conta corrente"}</DialogTitle>
          </DialogHeader>
          {ledgerDialog && (
            <div className="space-y-3">
              {ledgerDialog !== "manual" && (
                <>
                  <p className="text-sm text-muted-foreground">
                    {ledgerDialog.purchase.purchaseNumber} · declarado {fmtBrl(ledgerDialog.vDecl)} · real {fmtBrl(ledgerDialog.vReal)}
                  </p>
                  <div>
                    <Label>Base sugerida</Label>
                    <Select value={ledgerForm.base} onValueChange={(v) => changeBase(v as "valor" | "peso")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="valor">
                          Diferença de valor · {fmtBrl(Math.abs(ledgerDialog.vDiff))}
                        </SelectItem>
                        <SelectItem value="peso">
                          Diferença de peso · {fmtKg(Math.abs(ledgerDialog.wDiff), 3)} ≈ {fmtBrl(weightDiffBrl(ledgerDialog))}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
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
