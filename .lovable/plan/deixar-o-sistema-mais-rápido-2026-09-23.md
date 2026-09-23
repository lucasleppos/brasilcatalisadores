# Deixar o sistema mais rápido

## O que medimos

O banco não está sobrecarregado (disco 4%, conexões 18/60, banco com 22 MB). A lentidão vem de **como o app pede os dados**:

- A busca de peças do catálogo foi executada **19.052 vezes**, gastando em média 62 ms cada — é a consulta mais custosa do sistema.
- A leitura das peças das compras aparece duas vezes na lista das mais lentas (9.189 + 12.548 execuções, até 1,1 segundo por chamada).
- A lista de compras é recarregada por inteiro (todas as compras + todas as peças de todas as compras) em cada tela: Compras, Processos, Concluídos, Filiais. Trocar de tela refaz tudo do zero.
- As regras de permissão de leitura são reavaliadas **linha por linha** em cada consulta, em vez de uma vez por consulta.

Aumentar o tamanho do servidor não resolveria isso agora — o gargalo é o volume de consultas repetidas.

## O que vamos fazer

1. **Permissões avaliadas uma vez por consulta** (compras, peças, evidências, catálogo e demais tabelas de leitura). Mesma segurança, mesmas regras, sem recalcular a permissão para cada linha lida.
2. **Busca do catálogo indexada**: criar um índice de texto para as buscas por código, referência, marca e veículo. A busca passa a ser praticamente instantânea, mesmo com 1.400 peças.
3. **Busca dispara só a partir de 2 caracteres** e com espera um pouco maior entre digitações, para não consultar o banco a cada letra.
4. **Dados compartilhados entre telas com cache**: a lista de compras, o catálogo e os fornecedores passam a ser carregados uma vez e reaproveitados ao navegar, com atualização automática após salvar/avançar etapas. Nada de dado velho: qualquer gravação recarrega o que mudou.
5. **Leituras mais leves**: na listagem de compras, buscar só as colunas usadas nas listas, deixando os blocos grandes de cálculo (detalhamento da calculadora) para quando a compra é aberta.

## Verificação

- Abrir Compras, Processos, Concluídos e voltar: a segunda visita deve abrir imediatamente.
- Buscar uma peça pelo código na precificação: resposta sem travar.
- Conferir que valores, pesos, grupos, etapas e permissões continuam exatamente iguais, e que salvar uma etapa atualiza a lista.
- Medir novamente as consultas mais lentas depois das mudanças.

## Detalhes técnicos

- Migração: reescrever as políticas SELECT (e as de escrita) de `purchases`, `purchase_items`, `stage_evidence`, `catalog_parts`, `lab_results`, `bag_items`, `suppliers` e afins trocando `has_role(auth.uid(), ...)` / `has_any_module_access(...)` / `user_can_do(...)` por `(select has_role((select auth.uid()), ...))`, para o planejador tratar como InitPlan único. Mesmas expressões lógicas.
- Migração: `create extension if not exists pg_trgm;` + `CREATE INDEX idx_catalog_parts_trgm ON public.catalog_parts USING gin (code gin_trgm_ops, reference gin_trgm_ops, brand gin_trgm_ops, vehicle gin_trgm_ops);` e índice em `bag_items(purchase_id)` / `bag_items(bag_id)` (hoje só há PK). Validar com `EXPLAIN (ANALYZE, BUFFERS)` antes/depois.
- `PartSearch.tsx` e a busca da calculadora: mínimo de 2 caracteres, debounce 450 ms, cancelar respostas obsoletas.
- Introduzir hooks com `@tanstack/react-query` (`usePurchasesQuery`, `useCatalogQuery`, `useSuppliersQuery`) com `staleTime` de ~60 s, usados por `PurchasesPage`, `ProcessBoard`, `MobileProcessBoard`, `CompletedPage`, `BranchesPage`, `CatalogPage`; invalidar por `queryClient.invalidateQueries` nos pontos de gravação em vez de chamar `loadPurchases()` de novo.
- `loadPurchases`: trocar `select("*")` de `purchase_items` por lista explícita de colunas sem `calc_input`/`calc_result`, carregando esses campos apenas no detalhe/precificação (`loadPurchaseItems(purchaseId)`).
- Sem mudança de schema de dados, de cálculo ou de UI. Validar com `bunx tsgo --noEmit`, `slow_queries` e conferência no preview autenticado.
