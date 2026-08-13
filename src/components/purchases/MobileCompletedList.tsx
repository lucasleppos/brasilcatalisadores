import { Purchase, getItemLabel } from "@/lib/purchases";
import { fmtBrl } from "@/lib/utils";
import { MobileListRow, MobileListDivider } from "@/components/mobile/MobileListRow";
import { MobileSearchBar } from "@/components/mobile/MobileSearchBar";
import { purchaseFlowBadge } from "@/components/purchases/MobilePurchaseList";
import { Inbox } from "lucide-react";

interface Props {
  purchases: Purchase[];
  bagsByPurchase: Record<string, { bagNumber: string }[]>;
  search: string;
  onSearch: (v: string) => void;
  onSelect: (p: Purchase) => void;
}

export default function MobileCompletedList({ purchases, bagsByPurchase, search, onSearch, onSelect }: Props) {
  return (
    <div className="pb-20">
      <MobileSearchBar value={search} onChange={onSearch} placeholder="Fornecedor, nº pedido, boleto…" />

      {purchases.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-10 text-center">
          <Inbox className="h-9 w-9 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhum material concluído encontrado.</p>
        </div>
      ) : (
        purchases.map((p, idx) => {
          const flow = purchaseFlowBadge(p);
          const bags = bagsByPurchase[p.id] || [];
          return (
            <div key={p.id}>
              {idx > 0 && <MobileListDivider />}
              <MobileListRow
                badge={flow.label}
                badgeClassName={flow.className}
                title={p.supplierName}
                subtitle={`${p.purchaseNumber} · ${p.status}`}
                detail={`${getItemLabel(p)} · ${fmtBrl(p.totalBrl)}${
                  bags.length ? ` · Bag ${bags.map((b) => b.bagNumber).join(", ")}` : " · Aguardando bag"
                }`}
                stamp={new Date(p.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                onClick={() => onSelect(p)}
              />
            </div>
          );
        })
      )}
    </div>
  );
}
