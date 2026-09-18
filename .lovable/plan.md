# Card de pizza: compras na fila até a Aprovação

## O que aparece no Dashboard

Um novo card, logo abaixo dos três cartões de totais, com:

- **Gráfico de pizza** com a quantidade de compras que ainda **não passaram da Aprovação**, dividida em três fatias: Cerâmico, Peças e Peça em Sacola. Ao passar o mouse, mostra quantidade e percentual.
- **Ao lado, uma lista de previsão de valores**: para cada tipo, quantidade na fila × valor médio das compras já concluídas daquele tipo = valor previsto. Abaixo, o **total previsto**.
- O card mostra também o valor médio usado em cada tipo, para ficar claro de onde vem a previsão.

Regras:

- "Ainda não passou da Aprovação" considera toda compra em aberto até a etapa de Aprovação, inclusive (Conferência, Moagem, Laboratório, Demonstrativo, Precificação, Aprovação). Compras que já avançaram (Corte, Bag, Encerrado) não entram.
- O card considera **todas as compras em aberto**, independentemente do mês selecionado — é uma foto da fila atual.
- A média por tipo usa as compras concluídas dos **últimos 12 meses** com valor lançado maior que zero. Se um tipo não tiver histórico, a previsão dele aparece como "sem histórico".
- Compras da fila que já tenham valor lançado usam o próprio valor; só as sem valor entram pela média.
- O filtro Todos / Cerâmico / Peças / Peça em Sacola do topo também vale para este card.

## Detalhes técnicos

`src/lib/reports.ts`: nova função `loadPipelineForecast()` que busca `purchases` (id, date, total_brl, status, op_status, material_flow, status_history) dos últimos 24 meses, reaproveita `flowOf`/`stageOfStatus`/`passedApproval` (extraídos para escopo de módulo para reuso) e retorna, por `FlowKey`: `pendingCount`, `pendingWithValue` (soma dos valores já lançados), `avgValue` (média dos concluídos dos últimos 12 meses com `total_brl > 0`), `forecast` (`pendingWithValue + semValor × avgValue`). Compras sem `material_flow` classificadas pelos itens como já é feito hoje.

`src/pages/DashboardPage.tsx`: `useQuery(["pipeline-forecast"])` independente do mês; novo componente `PipelineCard` usando `PieChart`/`Pie`/`Cell` do recharts dentro de `ChartContainer`, com cores de tokens (`hsl(var(--primary))`, `hsl(var(--accent))`, `hsl(var(--muted-foreground))`); tabela lateral com quantidade, média e previsão formatadas em padrão brasileiro pelo helper `fmt` existente. Respeita `flowFilter`.

Validação: `bunx tsgo --noEmit` e conferência do card no preview.
