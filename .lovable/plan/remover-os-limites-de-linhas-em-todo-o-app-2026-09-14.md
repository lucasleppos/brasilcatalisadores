# Remover os limites de linhas em todo o app

## O que descobrimos

O catálogo tem **1.366 peças cadastradas**, mas a tela de Catálogo só consegue mostrar **1.000**: as consultas ao banco devolvem no máximo 1.000 linhas por vez, e hoje só a leitura das peças das compras já foi corrigida com essa paginação. Ou seja, as últimas 366 peças estão salvas, mas invisíveis (e não são encontradas em algumas telas).

Volumes atuais: catálogo 1.366, itens de compra 1.251, evidências de etapa 1.702, análises de laboratório 682, fornecedores 439, compras 243. Três tabelas já passaram do limite de 1.000.

## Onde existem limitações hoje

- **Catálogo de peças** (lista completa) — corta em 1.000. É o problema que você viu.
- **Fornecedores, Compras, Bags, itens do Bag, filiais, conta corrente** — mesmo corte de 1.000; ainda não estouraram, mas vão estourar com o uso.
- **Alocar Material, Concluídos, Relatórios, Demonstrativos** — leituras em bloco (por lista de compras) com o mesmo corte.
- **Buscas rápidas** (peça no catálogo, fornecedor na compra) — limitadas a 20 resultados; é intencional, mas fica baixo com 1.366 peças.
- **Importação de planilha** (catálogo e fornecedores) — envia todas as linhas numa única gravação; acima de alguns milhares de linhas a importação pode falhar por tamanho.

## Correção

1. Criar uma forma única de leitura que busca **todas** as linhas em blocos, repetindo até acabar — sem limite de quantidade.
2. Aplicar essa leitura em todas as listagens: catálogo, fornecedores, compras, bags e itens de bag, filiais e conta corrente, evidências de etapa, laboratório, demonstrativos, Alocar Material, Concluídos e Relatórios.
3. Gravações em lote (importações) passam a ser enviadas em blocos, para que planilhas grandes entrem por completo.
4. Buscas rápidas passam de 20 para 50 resultados, mantendo a filtragem por digitação.
5. Nada muda no visual, nos cálculos, nas etapas ou nos dados já gravados — apenas passa a aparecer tudo.

## Verificação

- Abrir Catálogo de Peças e conferir a contagem de 1.366 peças.
- Conferir uma peça que hoje não aparece (das últimas importadas) na busca da precificação.
- Conferir que Compras, Processos, Alocar Material, Concluídos e Relatórios continuam iguais.

## Detalhes técnicos

- Novo helper em `src/lib/db.ts`: `fetchAll(builderFactory)` usando `.range(offset, offset + 999)` em laço até o bloco retornar menos de 1.000 linhas (mesma lógica do `fetchAllIn`/`PAGE_SIZE` já existente em `src/lib/purchases.ts`, que passa a reusar o helper).
- Aplicar em: `catalog.ts` (`loadParts`), `suppliers.ts` (`loadSuppliers`, branches), `bags.ts` (`loadBags`, `loadBagItems`), `branches.ts` (listagens e `branch_ledger_entries`), `lab-results.ts`, `demonstrativos.ts`, `stage-tasks.ts`, `reports.ts` (purchases/bags/status), `AllocationPanel.tsx` (`purchases`, `bag_items`, `purchase_items`, `suppliers`), `AllocateMaterialDialog.tsx`, `CompletedPage.tsx`.
- Consultas com `.in(ids)` também precisam de paginação e, quando a lista de ids for grande, de divisão em blocos de ~300 ids para não estourar o tamanho da URL.
- `bulkImportParts` e `SupplierImport`: inserir em chunks de 500 com soma das contagens.
- `searchParts` e a busca da calculadora: `limit(50)`.
- Sem alteração de schema, RLS ou políticas. Validação com `bunx tsgo --noEmit` e conferência no preview autenticado (contagem do catálogo).
