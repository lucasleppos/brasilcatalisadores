import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Purchase } from "@/lib/purchases";
import { fmtNum } from "@/lib/utils";
import { MobileListRow, MobileListDivider } from "@/components/mobile/MobileListRow";
import { useSupplierBranches } from "@/hooks/use-supplier-branches";
import StageActionCard from "./StageActionCard";
import {
  flowBadge,
  purchaseWeight,
  timeSince,
  daysSince,
  lastChangeDate,
} from "./process-list-utils";

interface ProcessListViewProps {
  purchases: Purchase[];
  stageLabel: string;
  readOnly?: boolean;
  onCompleted: () => void;
}

export default function ProcessListView({
  purchases,
  stageLabel,
  readOnly,
  onCompleted,
}: ProcessListViewProps) {
  const branchBySupplier = useSupplierBranches(purchases);
  const [selected, setSelected] = useState<Purchase | null>(null);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="grid md:grid-cols-2 md:divide-x md:divide-border">
        {purchases.map((p, idx) => {
          const flow = flowBadge(p);
          const branch = branchBySupplier[p.supplierId || ""];
          const qty = p.items.reduce((s, i) => s + (i.quantity || 1), 0);
          const weight = purchaseWeight(p);
          const days = daysSince(lastChangeDate(p));
          const noErp = !p.erpNumber?.trim();
          return (
            <div key={p.id} className={idx >= 2 ? "md:border-t md:border-border" : undefined}>
              {idx > 0 && <div className="md:hidden"><MobileListDivider /></div>}
              {idx === 1 && <div className="md:hidden" />}
              <MobileListRow
                badge={flow.label}
                badgeClassName={flow.className}
                title={p.supplierName}
                subtitle={[p.purchaseNumber, flow.name, branch, p.buyer].filter(Boolean).join(" · ")}
                detail={
                  <>
                    {p.materialFlow !== "ceramico" && qty > 0 && <>{qty} pç · </>}
                    {fmtNum(weight, 4)} kg ·{" "}
                    {noErp ? (
                      <span className="text-destructive font-medium">Sem boleto</span>
                    ) : (
                      <>Boleto {p.erpNumber}</>
                    )}
                  </>
                }
                alert={noErp}
                stamp={timeSince(lastChangeDate(p))}
                stampClassName={days > 7 ? "text-destructive font-semibold" : undefined}
                onClick={() => setSelected(p)}
              />
            </div>
          );
        })}
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-4">
          {selected && (
            <div className="mt-6">
              <p className="text-sm text-muted-foreground mb-3">
                {stageLabel} · {selected.purchaseNumber}
              </p>
              <StageActionCard
                purchase={selected}
                readOnly={readOnly}
                onCompleted={() => {
                  setSelected(null);
                  onCompleted();
                }}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
