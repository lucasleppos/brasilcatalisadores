import { supabase } from "@/integrations/supabase/client";

// ===== Types =====

export interface Branch {
  id: string;
  name: string;
  code: string;
  contactPerson: string;
  phone: string;
  hasLocalStock: boolean;
  active: boolean;
  createdAt: string;
}

export type TransferStatus = "aberto" | "em_transito" | "recebido" | "conferido";

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  aberto: "Aberto",
  em_transito: "Em Trânsito",
  recebido: "Recebido",
  conferido: "Conferido",
};

export interface BranchTransfer {
  id: string;
  branchId: string;
  status: TransferStatus;
  sentAt: string | null;
  receivedAt: string | null;
  notes: string;
  createdAt: string;
}

export type LedgerEntryType = "credito" | "debito";

export interface BranchLedgerEntry {
  id: string;
  branchId: string;
  purchaseId: string | null;
  entryType: LedgerEntryType;
  amountBrl: number;
  reason: string;
  weightDeclared: number | null;
  weightReal: number | null;
  valueDeclared: number | null;
  valueReal: number | null;
  settlementId: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface BranchSettlement {
  id: string;
  branchId: string;
  periodStart: string;
  periodEnd: string;
  totalBrl: number;
  notes: string;
  closedAt: string;
}

/** Status inicial de uma compra de filial, antes de chegar na matriz */
export const AWAITING_TRANSFER_STATUS = "Aguardando Transferência";

/** Compra importada aguardando a conferência do usuário da filial */
export const BRANCH_CONFERENCE_STATUS = "Filial: Em Conferência";

/** Compra de filial ainda em pré-fluxo (não visível nos módulos da matriz) */
export function isBranchPreTransfer(p: { branchId?: string | null; status: string }): boolean {
  return !!p.branchId && (p.status === BRANCH_CONFERENCE_STATUS || p.status === AWAITING_TRANSFER_STATUS);
}


// ===== Mappers =====

function mapBranch(r: any): Branch {
  return {
    id: r.id,
    name: r.name,
    code: r.code,
    contactPerson: r.contact_person || "",
    phone: r.phone || "",
    hasLocalStock: !!r.has_local_stock,
    active: !!r.active,
    createdAt: r.created_at,
  };
}

function mapTransfer(r: any): BranchTransfer {
  return {
    id: r.id,
    branchId: r.branch_id,
    status: r.status as TransferStatus,
    sentAt: r.sent_at,
    receivedAt: r.received_at,
    notes: r.notes || "",
    createdAt: r.created_at,
  };
}

function mapLedger(r: any): BranchLedgerEntry {
  return {
    id: r.id,
    branchId: r.branch_id,
    purchaseId: r.purchase_id,
    entryType: r.entry_type as LedgerEntryType,
    amountBrl: Number(r.amount_brl) || 0,
    reason: r.reason || "",
    weightDeclared: r.weight_declared != null ? Number(r.weight_declared) : null,
    weightReal: r.weight_real != null ? Number(r.weight_real) : null,
    valueDeclared: r.value_declared != null ? Number(r.value_declared) : null,
    valueReal: r.value_real != null ? Number(r.value_real) : null,
    settlementId: r.settlement_id,
    createdBy: r.created_by,
    createdAt: r.created_at,
  };
}

function mapSettlement(r: any): BranchSettlement {
  return {
    id: r.id,
    branchId: r.branch_id,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    totalBrl: Number(r.total_brl) || 0,
    notes: r.notes || "",
    closedAt: r.closed_at,
  };
}

// ===== Branches CRUD =====

export async function loadBranches(): Promise<Branch[]> {
  const { data, error } = await supabase
    .from("branches")
    .select("*")
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data.map(mapBranch);
}

export async function createBranch(input: {
  name: string;
  code: string;
  contactPerson?: string;
  phone?: string;
  hasLocalStock?: boolean;
  active?: boolean;
}): Promise<Branch | null> {
  const { data, error } = await supabase
    .from("branches")
    .insert({
      name: input.name,
      code: input.code,
      contact_person: input.contactPerson || "",
      phone: input.phone || "",
      has_local_stock: input.hasLocalStock ?? false,
      active: input.active ?? true,
    })
    .select()
    .single();
  if (error || !data) return null;
  return mapBranch(data);
}

export async function updateBranch(id: string, input: Partial<{
  name: string;
  code: string;
  contactPerson: string;
  phone: string;
  hasLocalStock: boolean;
  active: boolean;
}>): Promise<boolean> {
  const update: any = {};
  if (input.name !== undefined) update.name = input.name;
  if (input.code !== undefined) update.code = input.code;
  if (input.contactPerson !== undefined) update.contact_person = input.contactPerson;
  if (input.phone !== undefined) update.phone = input.phone;
  if (input.hasLocalStock !== undefined) update.has_local_stock = input.hasLocalStock;
  if (input.active !== undefined) update.active = input.active;
  const { error } = await supabase.from("branches").update(update).eq("id", id);
  return !error;
}

export async function deleteBranch(id: string): Promise<boolean> {
  const { error } = await supabase.from("branches").delete().eq("id", id);
  return !error;
}

// ===== Transfers =====

export async function loadTransfers(branchId?: string): Promise<BranchTransfer[]> {
  let query = supabase.from("branch_transfers").select("*").order("created_at", { ascending: false });
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(mapTransfer);
}

export async function createTransfer(branchId: string, notes = ""): Promise<BranchTransfer | null> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("branch_transfers")
    .insert({ branch_id: branchId, notes, created_by: userData?.user?.id ?? null })
    .select()
    .single();
  if (error || !data) return null;
  return mapTransfer(data);
}

export async function updateTransferStatus(id: string, status: TransferStatus): Promise<boolean> {
  const update: any = { status };
  if (status === "em_transito") update.sent_at = new Date().toISOString();
  if (status === "recebido") update.received_at = new Date().toISOString();

  const { error } = await supabase.from("branch_transfers").update(update).eq("id", id);
  if (error) return false;

  // Ao receber o lote, as compras entram no pipeline normal da matriz
  if (status === "recebido") {
    await releaseTransferPurchases(id);
  }
  return true;
}

/** Volta o lote de "Em Trânsito" para "Aberto" (envio registrado por engano) */
export async function revertTransferStatus(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("branch_transfers")
    .update({ status: "aberto", sent_at: null })
    .eq("id", id)
    .eq("status", "em_transito");
  return !error;
}

/** Código legível do lote: CODIGOFILIAL-DDMMYY-NN (sequência do dia na filial) */
export function transferCode(
  transfer: BranchTransfer,
  branch: Branch | undefined,
  allTransfers: BranchTransfer[]
): string {
  const d = new Date(transfer.createdAt);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const dayKey = d.toDateString();
  const sameDay = allTransfers
    .filter((t) => t.branchId === transfer.branchId && new Date(t.createdAt).toDateString() === dayKey)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const seq = sameDay.findIndex((t) => t.id === transfer.id) + 1;
  const prefix = (branch?.code || branch?.name || "FIL").slice(0, 6).toUpperCase();
  return `${prefix}-${dd}${mm}${yy}-${String(Math.max(seq, 1)).padStart(2, "0")}`;
}


/** Move as compras do lote de "Aguardando Transferência" para "Em Conferência" */
async function releaseTransferPurchases(transferId: string) {
  const { data: rows } = await supabase
    .from("purchases")
    .select("id, status, status_history")
    .eq("transfer_batch_id", transferId);

  const now = new Date().toISOString();
  for (const r of rows || []) {
    if (r.status !== AWAITING_TRANSFER_STATUS) continue;
    const history = [...(((r.status_history as any[]) || [])), { status: "Em Conferência", date: now }];
    await supabase
      .from("purchases")
      .update({ status: "Em Conferência", status_history: history, transfer_status: "recebido", location: "matriz" })
      .eq("id", r.id);
  }
}

export async function addPurchaseToTransfer(purchaseId: string, transferId: string): Promise<boolean> {
  const { error } = await supabase
    .from("purchases")
    .update({ transfer_batch_id: transferId, transfer_status: "em_transito" })
    .eq("id", purchaseId);
  return !error;
}

export async function removePurchaseFromTransfer(purchaseId: string): Promise<boolean> {
  const { error } = await supabase
    .from("purchases")
    .update({ transfer_batch_id: null, transfer_status: "pendente" })
    .eq("id", purchaseId);
  return !error;
}

// ===== Ledger =====

export async function loadLedgerEntries(branchId: string): Promise<BranchLedgerEntry[]> {
  const { data, error } = await supabase
    .from("branch_ledger_entries")
    .select("*")
    .eq("branch_id", branchId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(mapLedger);
}

export async function createLedgerEntry(input: {
  branchId: string;
  purchaseId?: string | null;
  entryType: LedgerEntryType;
  amountBrl: number;
  reason: string;
  weightDeclared?: number | null;
  weightReal?: number | null;
  valueDeclared?: number | null;
  valueReal?: number | null;
}): Promise<BranchLedgerEntry | null> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("branch_ledger_entries")
    .insert({
      branch_id: input.branchId,
      purchase_id: input.purchaseId ?? null,
      entry_type: input.entryType,
      amount_brl: input.amountBrl,
      reason: input.reason,
      weight_declared: input.weightDeclared ?? null,
      weight_real: input.weightReal ?? null,
      value_declared: input.valueDeclared ?? null,
      value_real: input.valueReal ?? null,
      created_by: userData?.user?.id ?? null,
    })
    .select()
    .single();
  if (error || !data) return null;
  return mapLedger(data);
}

export async function loadBranchBalance(branchId: string): Promise<{ balanceBrl: number; openEntries: number }> {
  const { data } = await supabase
    .from("branch_ledger_balance")
    .select("*")
    .eq("branch_id", branchId)
    .maybeSingle();
  return {
    balanceBrl: data ? Number((data as any).balance_brl) || 0 : 0,
    openEntries: data ? Number((data as any).open_entries) || 0 : 0,
  };
}

export async function loadSettlements(branchId: string): Promise<BranchSettlement[]> {
  const { data, error } = await supabase
    .from("branch_settlements")
    .select("*")
    .eq("branch_id", branchId)
    .order("closed_at", { ascending: false });
  if (error || !data) return [];
  return data.map(mapSettlement);
}

export async function closeSettlementPeriod(input: {
  branchId: string;
  periodStart: string;
  periodEnd: string;
  notes?: string;
}): Promise<BranchSettlement | null> {
  const endExclusive = new Date(input.periodEnd);
  endExclusive.setDate(endExclusive.getDate() + 1);

  const { data: open } = await supabase
    .from("branch_ledger_entries")
    .select("id, entry_type, amount_brl")
    .eq("branch_id", input.branchId)
    .is("settlement_id", null)
    .gte("created_at", new Date(input.periodStart).toISOString())
    .lt("created_at", endExclusive.toISOString());

  const entries = open || [];
  if (entries.length === 0) return null;

  const total = entries.reduce(
    (acc, e: any) => acc + (e.entry_type === "credito" ? Number(e.amount_brl) : -Number(e.amount_brl)),
    0
  );

  const { data: userData } = await supabase.auth.getUser();
  const { data: settlement, error } = await supabase
    .from("branch_settlements")
    .insert({
      branch_id: input.branchId,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      total_brl: total,
      notes: input.notes || "",
      closed_by: userData?.user?.id ?? null,
    })
    .select()
    .single();

  if (error || !settlement) return null;

  await supabase
    .from("branch_ledger_entries")
    .update({ settlement_id: settlement.id })
    .in("id", entries.map((e: any) => e.id));

  return mapSettlement(settlement);
}
