# Corrigir "1 peça" em compras criadas com várias peças

## O que está acontecendo (confirmado no código)

Na criação simplificada (fluxo Peças / Peça em Sacola), o diálogo grava **um item placeholder com quantidade 1**
(`NewPurchaseDialog.tsx`, `items: [{ itemType, quantity: 1 }]`), enquanto o total realmente recebido fica só no
campo de peso/quantidade declarada (`bulk_weight`). Como a lista de compras e o detalhe leem a quantidade dos itens,
uma compra de 5 peças aparece como "1 peça" e a tabela de itens mostra "1 pç" — igual às telas enviadas
(070826-07: "Total de Peças Recebidas 5 un" mas "Itens: 1 peça").

## Correção

1. **Placeholder com a quantidade declarada** (`src/components/purchases/NewPurchaseDialog.tsx`):
   no fluxo de Peças / Peça em Sacola, criar o item de entrada com `quantity` igual ao total declarado
   (5 un → `quantity: 5`), em vez de fixo em 1. Cerâmico continua com o peso em `bulk_weight`.
2. **Rótulo prioriza o declarado** (`getItemLabel` em `src/lib/purchases.ts`):
   enquanto não houver itens de conferência, usar o total declarado (`bulkWeight`) como contagem de peças,
   caindo para a soma dos itens originais só quando não houver declaração. Isso corrige também as compras
   já existentes, sem precisar mexer nos dados.
3. **Detalhe da compra**: o item de entrada passa a exibir a quantidade declarada ("5 pç"), ficando coerente
   com o bloco "Total de Peças Recebidas" e com o confronto declarado × conferido (`QtyCheckBadge`).

Sem migração de banco: a contagem exibida passa a derivar do valor declarado, que já está salvo.

## Arquivos afetados

- `src/components/purchases/NewPurchaseDialog.tsx` — quantidade do item de entrada.
- `src/lib/purchases.ts` — `getItemLabel` (e, se necessário, `getOriginalItemCount`) priorizando o declarado.
