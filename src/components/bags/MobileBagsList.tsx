import { Bag, getMaterialTypeLabel, getWeightPercentage } from "@/lib/bags";
import { fmtNum } from "@/lib/utils";
import { MobileListRow, MobileListDivider } from "@/components/mobile/MobileListRow";
import { MobileSearchBar } from "@/components/mobile/MobileSearchBar";
import { MobileFab } from "@/components/mobile/MobileFab";
import { Package } from "lucide-react";

interface Props {
  bags: Bag[];
  search: string;
  onSearch: (v: string) => void;
  canCreate: boolean;
  onNew: () => void;
  onSelect: (b: Bag) => void;
}

const statusClass: Record<string, string> = {
  Aberto: "bg-sky-100 text-sky-800",
  Fechado: "bg-amber-100 text-amber-800",
  Exportado: "bg-emerald-100 text-emerald-800",
};

export default function MobileBagsList({ bags, search, onSearch, canCreate, onNew, onSelect }: Props) {
  return (
    <div className="pb-24">
      <MobileSearchBar value={search} onChange={onSearch} placeholder="Nº do bag, rótulo, comprador…" />

      {bags.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-10 text-center">
          <Package className="h-9 w-9 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhum bag encontrado.</p>
        </div>
      ) : (
        bags.map((b, idx) => {
          const pct = getWeightPercentage(b);
          return (
            <div key={b.id}>
              {idx > 0 && <MobileListDivider />}
              <MobileListRow
                badge={b.bagNumber?.slice(-3) || "BAG"}
                badgeClassName={statusClass[b.status] || ""}
                title={b.bagLabel || b.bagNumber}
                subtitle={`${b.bagNumber} · ${getMaterialTypeLabel(b.materialType)} · ${b.status}`}
                detail={`${fmtNum(b.totalWeight, 4)} kg de ${fmtNum(b.maxWeight, 0)} kg · ${fmtNum(pct, 0)}%`}
                alert={pct > 100}
                stamp={b.buyer || undefined}
                onClick={() => onSelect(b)}
              />
            </div>
          );
        })
      )}

      {canCreate && <MobileFab onClick={onNew} label="Novo bag" />}
    </div>
  );
}
