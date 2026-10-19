import { Purchase, getExcludedItems } from "@/lib/purchases";
import { getSupplierBranch } from "@/lib/suppliers";
import { printSeparatedPiecesReport } from "@/lib/separated-pieces-report";
import { computeSeparatedPieceValues } from "@/lib/separated-pieces-value";

/** Gera o PDF de peças separadas do fluxo (intercorrência / fora do fluxo) de uma compra. */
export async function printSeparatedPiecesForPurchase(purchase: Purchase): Promise<void> {
  const separatedItems = getExcludedItems(purchase);
  const branch = await getSupplierBranch(purchase.supplierId);
  const values = await computeSeparatedPieceValues(
    purchase.supplierId,
    separatedItems.map(i => ({ catalogPartId: i.catalogPartId, quantity: i.quantity, weight: i.weight })),
    purchase.id,
  );
  await printSeparatedPiecesReport({
    purchaseNumber: purchase.purchaseNumber,
    date: purchase.date,
    supplierName: purchase.supplierName,
    branch: branch || undefined,
    buyer: purchase.buyer,
    erpNumber: purchase.erpNumber || undefined,
    pieces: separatedItems.map((i, idx) => ({
      seq: i.seq ?? idx + 1,
      code: i.catalogPartCode || i.partCode || "—",
      reference: i.catalogPartRef || i.partReference || null,
      unitValue: values[idx]?.unitValue ?? null,
    })),
  });
}
