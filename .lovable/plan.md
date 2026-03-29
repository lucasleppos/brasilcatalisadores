

# Plano: Ajustar exibição de "peças" vs "kg" por tipo de fluxo

## Problema
O card de processo exibe `"1 peças"` para compras cerâmicas, quando deveria exibir o peso (ex: `"5,000 kg"`). Isso ocorre porque `getOriginalItemCount()` conta itens originais — e cerâmicos criados com o novo fluxo não têm itens originais (só `bulk_weight`).

## Locais afetados (5 pontos)

1. **`StageActionCard.tsx` linha 194** — `{getOriginalItemCount(purchase)} peças`
2. **`PurchaseSummary.tsx` linha 91** — `{getOriginalItemCount(purchase)} itens`
3. **`PurchaseDetail.tsx` linha 92** — `{getOriginalItemCount(purchase)} item(ns)`
4. **`PurchasesPage.tsx` linha 141** — coluna "Itens" na tabela de compras
5. **`ProcessKPIs.tsx`** — sem impacto direto (conta compras, não itens)

## Solução

### 1. Nova função utilitária em `src/lib/purchases.ts`

Criar `getItemLabel(purchase): string` que retorna o texto correto baseado no fluxo:
- Se `materialFlow === "ceramico"`: retorna `"{bulkWeight} kg"` (ou peso dos lotes conferidos se houver)
- Se `materialFlow === "pecas"` com sacola: retorna `"{count} peças"` (contagem original)
- Demais: retorna `"{count} peças"`

```typescript
export function getItemLabel(purchase: Purchase): string {
  if (purchase.materialFlow === "ceramico") {
    const confItems = getConferenciaItems(purchase);
    if (confItems.length > 0) {
      const totalWeight = confItems.reduce((s, i) => s + (i.weight || 0), 0);
      return `${fmtNum(totalWeight, 3)} kg`;
    }
    return purchase.bulkWeight ? `${fmtNum(purchase.bulkWeight, 3)} kg` : "—";
  }
  const count = getOriginalItemCount(purchase);
  return `${count} ${count === 1 ? "peça" : "peças"}`;
}
```

### 2. Atualizar os 4 pontos de exibição

- **`StageActionCard.tsx`**: trocar `{getOriginalItemCount(purchase)} peças` por `{getItemLabel(purchase)}`
- **`PurchaseSummary.tsx`**: trocar a linha de itens por `{getItemLabel(purchase)}`
- **`PurchaseDetail.tsx`**: trocar por `{getItemLabel(purchase)}`
- **`PurchasesPage.tsx`**: na coluna "Itens", trocar por `{getItemLabel(p)}` e renomear o header para "Qtd/Peso"

## Arquivos editados
- `src/lib/purchases.ts` — nova função `getItemLabel`
- `src/components/processes/StageActionCard.tsx`
- `src/components/processes/PurchaseSummary.tsx`
- `src/components/purchases/PurchaseDetail.tsx`
- `src/pages/PurchasesPage.tsx`

