## Problema

O board de Processos mostra "Total Compras 1" e "Em Produção 1", mas nenhuma aba tem pedidos.

Verificado no banco: existe exatamente 1 compra, com `status = "Cerâmico: Aprovado"` e `op_status = "Alocando Bag"`. Ou seja, ela está na **fase paralela** (`isInParallelPhase`), que desde a última alteração deixou de aparecer nas colunas de Processos e passou a ser tratada nos módulos **Bags** e **Concluídos**.

O agrupamento em `tasksByGroup` já descarta essas compras (`if (isInParallelPhase(p)) return;`), mas os KPIs (`ProcessKPIs`) continuam calculados sobre `filtered`, que inclui tudo. Daí a divergência.

## Correção

Em `src/components/processes/ProcessBoard.tsx`:

- Criar um conjunto derivado `boardPurchases` = `filtered` sem as compras em fase paralela (`isInParallelPhase`) — mesma regra já usada no agrupamento.
- Alimentar os KPIs com esse conjunto:
  - `totalCount` = compras do board
  - `activeCount` (Em Produção) = não encerradas do board
  - `completedCount` (Finalizadas) = encerradas do board
  - `totalValue` = soma do board
- Usar `boardPurchases` também dentro de `tasksByGroup`, removendo a checagem duplicada.

Com isso, o cenário atual mostra 0 em todos os KPIs, coerente com as abas vazias, e a compra segue visível em Bags.

## Observação

Os filtros de fornecedor/comprador/período continuam iguais; a lista de opções de fornecedores/compradores permanece baseada em todas as compras, para não sumirem filtros úteis.

Nada muda no banco, nas rotas ou nos módulos Bags/Concluídos.
