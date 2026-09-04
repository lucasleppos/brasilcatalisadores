import { Purchase, getItemLabel, isSacolaFlow } from "@/lib/purchases";
import { fmtBrl } from "@/lib/utils";
import { stageOfPurchase } from "@/lib/status-stages";
import { MobileListRow, MobileListDivider } from "@/components/mobile/MobileListRow";
import { MobileSearchBar } from "@/components/mobile/MobileSearchBar";
import { MobileFab } from "@/components/mobile/MobileFab";
import { Button } from "@/components/ui/button";
import { Inbox } from "lucide-react";

export function purchaseFlowBadge(p: Purchase) {
  if (p.materialFlow === "ceramico") return { label: "CE", className: "bg-amber-100 text-amber-800" };
  if (isSacolaFlow(p)) return { label: "SA", className: "bg-emerald-100 text-emerald-800" };
  return { label: "PC", className: "bg-sky-100 text-sky-800" };
}

interface Props {
  purchases: Purchase[];
  search: string;
  onSearch: (v: string) => void;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  hideTotal: boolean;
  canCreate: boolean;
  onNew: () => void;
  onSelect: (p: Purchase) => void;
}

export default function MobilePurchaseList({
  purchases, search, onSearch, loading, error, onRetry, hideTotal, canCreate, onNew, onSelect,
}: Props) {
  return (
    <div className="pb-24">
      <MobileSearchBar value={search} onChange={onSearch} placeholder="Fornecedor, nº pedido, boleto…" />

      {loading && purchases.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">Carregando compras…</p>
      ) : error ? (
        <div className="p-8 text-center space-y-2">
          <p className="text-sm text-destructive">Não foi possível carregar as compras.</p>
          <Button size="sm" variant="outline" onClick={onRetry}>Tentar novamente</Button>
        </div>
      ) : purchases.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-10 text-center">
          <Inbox className="h-9 w-9 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhuma compra encontrada.</p>
        </div>
      ) : (
        purchases.map((p, idx) => {
          const flow = purchaseFlowBadge(p);
          return (
            <div key={p.id}>
              {idx > 0 && <MobileListDivider />}
              <MobileListRow
                badge={flow.label}
                badgeClassName={flow.className}
                title={p.supplierName}
                subtitle={`${p.purchaseNumber} · ${stageOfPurchase(p)}`}
                detail={`${getItemLabel(p)}${
                  !hideTotal && p.totalBrl > 0 ? ` · ${fmtBrl(p.totalBrl)}` : ""
                }${p.erpNumber ? ` · Boleto ${p.erpNumber}` : ""}`}
                alert={!p.erpNumber?.trim()}
                stamp={new Date(p.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                onClick={() => onSelect(p)}
              />
            </div>
          );
        })
      )}

      {canCreate && <MobileFab onClick={onNew} label="Nova compra" />}
    </div>
  );
}
