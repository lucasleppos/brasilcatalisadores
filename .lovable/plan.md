# Peças conferidas não aparecem na precificação (110926-21)

## O que está acontecendo

As 56 peças da compra 110926-21 **estão salvas** no sistema (24 linhas de conferência, com código de catálogo, quantidade e peso). O problema é na leitura: ao carregar a lista de compras, o app busca as peças de todas as compras numa única consulta, e essa consulta traz no máximo 1.000 linhas. Hoje já existem 1.229 linhas de peças/lotes no total, então as últimas compras ficam sem itens na tela — por isso a tela de precificar abre vazia e o valor aparece como zero.

Isso afeta qualquer compra recente, não só esta, e vai piorar conforme o volume cresce.

## Correção

- Passar a buscar as peças em blocos, repetindo a consulta até trazer todas as linhas — nenhuma compra fica sem seus itens, independentemente do volume.
- Aplicar o mesmo cuidado nas outras leituras em lote da lista de compras (peças de catálogo vinculadas), para não repetir o problema.
- Nada muda no visual, nas etapas, nos cálculos ou nos dados já gravados: só a leitura passa a ser completa.

## Verificação

- Abrir a compra 110926-21 em Demonstrativo e conferir que "Precificar Peças Conferidas" lista as 24 linhas somando 56 peças, com valor calculado pelo catálogo.
- Conferir que compras antigas continuam iguais.

## Detalhes técnicos

- `src/lib/purchases.ts` → `loadPurchases`: a consulta `purchase_items .in("purchase_id", ids)` (sem `range`) é limitada a 1000 linhas pelo PostgREST. Substituir por laço paginado com `.range(offset, offset + 999)` até o lote retornar menos de 1000 linhas; mesma paginação para o `catalog_parts .in("id", allCatalogPartIds)`.
- Nenhuma alteração de schema, RLS ou de componentes.
- Validação com `bunx tsgo --noEmit` e conferência no preview autenticado da compra 110926-21.
