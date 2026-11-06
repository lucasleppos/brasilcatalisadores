# Mostrar "Alocado" nas compras já colocadas em Bag

## O que muda
Na lista de Compras (e no detalhe da compra), quando o material da compra já estiver dentro de algum Bag, o status passa a aparecer como **Alocado** em vez de "Alocação em Bag".
- Compra aprovada, ainda fora de Bag: continua "Alocação em Bag".
- Compra com material em Bag (total ou parcial, ex.: só Flex alocado): "Alocado".
- Se o item for retirado do Bag, volta a mostrar "Alocação em Bag" sozinho.

Só muda o texto exibido. Nenhum status salvo, valor, fluxo ou relatório é alterado.

## Detalhes técnicos
- Adicionar `STAGES.alocado = "Alocado"` em `src/lib/status-stages.ts` e um helper `displayStage(purchase, allocatedIds)`.
- Em `PurchasesPage.tsx` e `PurchaseDetail.tsx`: buscar `bag_items.purchase_id` (com `fetchAllByIds`, em blocos) das compras carregadas e usar o helper ao montar o rótulo.
- Invalidar junto ao cache existente ao alocar/remover itens.
