## Causa

As peças da conferência são gravadas em `purchase_items` com `category = "conferencia"`. O painel de precificação (`PiecePricingPanel`) lista os itens por `getOriginalItems()`, que justamente **filtra fora** tudo que tem `category = "conferencia"` — por isso a lista aparece vazia (imagem 2), enquanto o Visualizar/Demonstrativo, que lê os itens direto do banco, mostra as duas peças (imagem 1).

## Alteração

**`src/components/processes/PiecePricingPanel.tsx` (reescrita do conteúdo do diálogo)**

- Passa a carregar os itens via `getConferenciaItems(purchase)` (fallback para os itens de peça quando não houver nenhum com `category = "conferencia"`, para compras antigas).
- Remove a busca no catálogo, o botão "Adicionar item manual", o formulário de inclusão e o botão de excluir item. Nenhuma peça nova pode ser criada nesta etapa.
- O diálogo vira uma tabela em coluna única, uma linha por item conferido:
  - Código / Referência do catálogo
  - Quantidade (un) e peso total (kg) — somente leitura
  - Campo editável **Valor unit. (R$)** (`inputMode="decimal"`, vírgula), com subtotal calculado = valor unit. × quantidade
- Rodapé com Total de peças, Peso total e **Valor total** do pedido, atualizado em tempo real.
- Botão **Salvar precificação** grava os valores com `batchUpdateItemPricing(purchase.id, [{ itemId, totalValue, pricingSource: "catalogo" }])`, que já recalcula `purchases.total_brl`. Sem avanço automático de etapa (o avanço continua pelo card).
- Botão do card muda para "Precificar Peças Conferidas" e o badge passa a mostrar a quantidade de peças conferidas + total.

## Detalhes técnicos

- Sem migração de banco: só muda a origem da leitura e o modo de gravação (update em vez de insert).
- `getConferenciaItems` e `batchUpdateItemPricing` já existem em `src/lib/purchases.ts`; `addItemToPurchase` / `removeItemFromPurchase` deixam de ser usados neste painel.
- Valores exibidos em formato brasileiro (`fmtBrl`, vírgula decimal), pesos com 4 casas.
