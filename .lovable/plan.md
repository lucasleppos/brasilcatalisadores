

# Mostrar código da peça em vez de "Peça catálogo" + no PDF

## Problema
Na lista de peças adicionadas (PiecePricingPanel) e no PDF/WhatsApp, aparece "Peça catálogo" ou "Peça" genérico em vez do código real da peça selecionada do catálogo. O fornecedor precisa ver cada código para conferir o pedido.

## Alterações

### 1. `src/lib/purchases.ts` — Carregar dados do catálogo junto aos itens

Na função `loadPurchases`, após buscar os `purchase_items`, buscar também os dados das peças do catálogo (`catalog_parts`) para os itens que têm `catalog_part_id`. Adicionar campos `catalogPartCode` e `catalogPartRef` ao `PurchaseQuoteItem`:

- Novo campo na interface: `catalogPartCode?: string`, `catalogPartRef?: string`
- Após carregar itens, coletar todos `catalog_part_id` únicos → buscar na tabela `catalog_parts` (code, reference, brand) → mapear nos itens

### 2. `src/components/processes/PiecePricingPanel.tsx` — Exibir código real

Linha 210: trocar `{item.catalogPartId ? 'Peça catálogo' : item.itemType}` por:
```tsx
{item.catalogPartCode || item.catalogPartRef || item.itemType}
```

### 3. `supabase/functions/generate-demonstrativo-pdf/index.ts` — Código no PDF

- Buscar `catalog_parts` para os itens com `catalog_part_id` (query adicional)
- Na coluna "Tipo" da tabela de itens (linha 180), mostrar o código da peça em vez de "Peça":
  ```typescript
  // Em vez de: typeLabels[item.item_type]
  // Para peças com catalog_part_id: mostrar code ou reference da peça
  ```

### 4. WhatsApp — Já usa o PDF ou dados do demonstrativo, então ao corrigir o PDF o WhatsApp será corrigido automaticamente se o texto for gerado do mesmo dado.

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/purchases.ts` | Adicionar `catalogPartCode`/`catalogPartRef` ao `PurchaseQuoteItem`; buscar `catalog_parts` no `loadPurchases` |
| `src/components/processes/PiecePricingPanel.tsx` | Exibir código real em vez de "Peça catálogo" |
| `supabase/functions/generate-demonstrativo-pdf/index.ts` | Buscar dados do catálogo; exibir código da peça na coluna "Tipo" |

