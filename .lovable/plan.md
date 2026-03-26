

# Inconsistências encontradas no app

## Problema raiz

O `loadPurchases()` carrega **todos** os `purchase_items` sem filtrar por `category`. Quando a conferência adiciona itens com `category = 'conferencia'`, eles entram no array `purchase.items`. Resultado: uma compra com 1 item original (qty=5) passa a ter 6 itens após conferência (1 original + 5 conferência).

## Mapa de inconsistências

| Local | O que mostra | Problema |
|-------|-------------|----------|
| **PurchasesPage** (tabela, col. Itens) | `p.items.length` = nº de linhas | Após conferência, inclui itens de conferência, inflando o número |
| **StageActionCard** (header) | `sum(quantity \|\| 1)` = soma de qtd | Soma duplicada: original (qty=5) + 5 conferência (qty=1 cada) = 10 |
| **PurchaseDetail** (cabeçalho) | `purchase.items.length` + "item(ns)" | Mesmo problema do PurchasesPage |
| **PurchaseSummary** (dialog confirmação) | `purchase.items.length` + "itens" | Idem |
| **PiecePricingPanel** | `items.filter(i => i.catalogPartId)` | Mistura itens originais e de conferência que tenham catalogPartId |
| **calcTotal** | Soma `totalValue` de todos os itens | Inclui itens de conferência (valor 0), não quebra mas é semanticamente errado |

## Solução proposta

### 1. Separar itens por categoria no `loadPurchases`
Não mudar a carga, mas criar helpers para filtrar:

```typescript
// Em purchases.ts
export function getOriginalItems(purchase: Purchase): PurchaseQuoteItem[] {
  return purchase.items.filter(i => !i.category || i.category !== 'conferencia');
}

export function getConferenciaItems(purchase: Purchase): PurchaseQuoteItem[] {
  return purchase.items.filter(i => i.category === 'conferencia');
}
```

### 2. Usar itens originais para contagem em todos os locais

| Arquivo | Linha | Correção |
|---------|-------|----------|
| `PurchasesPage.tsx` | col Itens | `getOriginalItems(p).reduce((s,i) => s + (i.quantity \|\| 1), 0)` |
| `StageActionCard.tsx` | header | `getOriginalItems(purchase).reduce(...)` |
| `PurchaseDetail.tsx` | cabeçalho "Itens" | `getOriginalItems(purchase)` para contagem |
| `PurchaseSummary.tsx` | "Itens" | Idem |
| `PiecePricingPanel.tsx` | filtro de existingItems | Filtrar apenas itens com `catalogPartId` E `category !== 'conferencia'` (ou usar a lista original) |

### 3. Exibição consistente de quantidade
Padronizar: mostrar sempre **soma de quantidades** (não `items.length`) e com sufixo correto (`pç` para peças, `kg` para cerâmico).

### 4. Tabela de itens no PurchaseDetail
Separar visualmente: primeiro os itens originais do pedido, depois (se existirem) os itens de conferência em seção separada com título "Peças Conferidas".

### Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/purchases.ts` | Adicionar helpers `getOriginalItems` / `getConferenciaItems` |
| `src/pages/PurchasesPage.tsx` | Usar helper para col. Itens |
| `src/components/processes/StageActionCard.tsx` | Usar helper para contagem no header |
| `src/components/purchases/PurchaseDetail.tsx` | Usar helper + separar seções |
| `src/components/processes/PurchaseSummary.tsx` | Usar helper para contagem |
| `src/components/processes/PiecePricingPanel.tsx` | Filtrar corretamente |

