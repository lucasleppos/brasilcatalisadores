## Problema

No card do processo (etapa de Corte, e demais etapas do fluxo de Peças), a linha de itens mostra "0 peças".

Causa confirmada em `src/lib/purchases.ts`: `getItemLabel()` para o fluxo de peças usa `getOriginalItemCount()`, que soma apenas itens **originais** (`category !== "conferencia"`). Como na Conferência o item placeholder criado na compra é removido e as peças reais são gravadas com `category = "conferencia"`, não sobra nenhum item original → contagem 0.

## Correção

Ajustar `getItemLabel()` (fluxo peças / peça em sacola) para usar, nesta ordem:

1. Soma de `quantity` dos itens de conferência (`getConferenciaItems`) quando existirem — é a quantidade real conferida;
2. Senão, `getOriginalItemCount()` (compras antigas / antes da conferência);
3. Senão, `bulkWeight` (total de peças declarado na criação da compra), evitando o "0".

Também exibir o peso quando disponível, no formato `12 peças · 3,450 kg`, usando a soma dos pesos dos itens de conferência (opcional, mas útil na etapa de Corte).

## Detalhe técnico

- Arquivo único: `src/lib/purchases.ts`, função `getItemLabel`.
- Nenhuma mudança de schema, de fluxo ou de outros componentes: `StageActionCard` e `PurchaseSummary` já consomem `getItemLabel`, então a correção propaga automaticamente para todas as etapas.
