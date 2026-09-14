import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Purchase } from "@/lib/purchases";
import { fetchAllByIds } from "@/lib/db";

/** Mapa id do fornecedor → filial cadastrada. */
export function useSupplierBranches(purchases: Purchase[]) {
  const [branchBySupplier, setBranchBySupplier] = useState<Record<string, string>>({});
  const ids = [...new Set(purchases.map((p) => p.supplierId).filter(Boolean))] as string[];
  const key = ids.sort().join(",");

  useEffect(() => {
    if (ids.length === 0) return;
    let cancelled = false;
    (async () => {
      const data = await fetchAllByIds<any>(ids, (chunkIds) =>
        supabase.from("suppliers").select("id, branch").in("id", chunkIds) as any
      );
      if (cancelled) return;
      const map: Record<string, string> = {};
      (data || []).forEach((s: any) => { map[s.id] = s.branch || ""; });
      setBranchBySupplier(map);
    })();
    return () => { cancelled = true; };
  }, [key]);

  return branchBySupplier;
}
