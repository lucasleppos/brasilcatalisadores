# Filtro de tipo de compra no Dashboard

Adicionar um seletor de fluxo no Dashboard — **Todos, Cerâmico, Peças, Peça em Sacola** — que filtra os KPIs, o gráfico mensal e as duas tabelas diárias.

## Comportamento

- Seletor no cabeçalho do Dashboard, ao lado do seletor de mês: botões segmentados (Todos | Cerâmico | Peças | Peça em Sacola). Padrão: **Todos** (comportamento atual).
- Com um fluxo escolhido:
  - KPIs mostram somente aquele fluxo (quantidades e valores), sem a linha de detalhe por fluxo.
  - Gráfico de valores diários + acumulado mostra somente aquele fluxo (barras incluídas/concluídas e linhas de acumulado recalculadas só com aquele fluxo).
  - Tabelas diárias mostram somente a coluna do fluxo escolhido (além de Dia e totais); o total da tabela reflete só aquele fluxo.
  - Exportação para Excel exporta somente o fluxo escolhido.
- O filtro é local à tela (não precisa persistir).

## Implementação

- `src/pages/DashboardPage.tsx` — único arquivo editado:
  - Novo estado `flowFilter: FlowKey | "all"` (default `"all"`).
  - `loadDailyPurchaseReport` (src/lib/reports.ts) continua retornando tudo por fluxo; a filtragem é feita na página, sem nova leitura do banco.
  - KPIs: quando `flowFilter !== "all"`, usar `totals.included.byFlow[flow]` / `totals.completed.byFlow[flow]`.
  - Gráfico: derivar `chartFiltrado` em `useMemo` somando apenas o fluxo escolhido por dia (`included_value`, `completed_value`, `included_cum`, `completed_cum` recalculados em sequência).
  - `DailyTable`: nova prop `flowFilter`; quando específico, renderiza apenas a coluna daquele fluxo; exportRows idem.
- `src/lib/reports.ts` — exportar tipo `FlowKey` (já exportado); nenhuma mudança de leitura necessária.

## Validação

- `bunx tsgo --noEmit` sem erros.
- Playwright no preview: alternar entre Todos / Cerâmico / Peças / Peça em Sacola e conferir KPIs, gráfico e tabelas refletindo o filtro; exportação gera planilha somente do fluxo escolhido.
