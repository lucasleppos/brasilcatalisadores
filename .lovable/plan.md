

# Problema: Edição da compra apaga peças precificadas

## Causa raiz

A função `updatePurchase` (linha 682 de `purchases.ts`) faz **DELETE de todos os `purchase_items`** do pedido e re-insere apenas os itens que vêm do dialog de edição. Porém, as peças adicionadas pelo `PiecePricingPanel` (com `catalog_part_id`) **não fazem parte do formulário de edição** — então ao salvar a edição, esses itens são apagados.

## Solução

### `src/lib/purchases.ts` — `updatePurchase`

Em vez de deletar todos os itens e re-inserir, preservar os itens que têm `catalog_part_id` (adicionados via precificação):

1. Deletar apenas os itens **sem** `catalog_part_id` (os itens originais da compra editáveis)
2. Re-inserir os itens editados do formulário (que também não têm `catalog_part_id`)
3. Os itens com `catalog_part_id` permanecem intocados

Mudança na linha 682:
```typescript
// Antes:
await supabase.from("purchase_items").delete().eq("purchase_id", id);

// Depois:
await supabase.from("purchase_items").delete().eq("purchase_id", id).is("catalog_part_id", null);
```

4. No recálculo do total, somar também os itens de catálogo existentes:
```typescript
const { data: catalogItems } = await supabase
  .from("purchase_items")
  .select("total_value")
  .eq("purchase_id", id)
  .not("catalog_part_id", "is", null);
const catalogTotal = (catalogItems || []).reduce((sum, i) => sum + (Number(i.total_value) || 0), 0);
const totalBrl = calcTotal(data.items) + catalogTotal;
```

## Arquivo afetado

| Arquivo | Mudança |
|---------|---------|
| `src/lib/purchases.ts` | `updatePurchase`: deletar apenas itens sem `catalog_part_id`; somar total dos itens de catálogo ao recalcular |

