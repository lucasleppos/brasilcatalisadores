# Dashboard com relatórios diários de compras

Hoje a tela inicial (Dashboard) só mostra o aviso "módulo estará disponível em breve". Ela passa a ser a tela de relatórios diários.

## O que a tela vai mostrar

Seletor de mês no topo (abre no mês atual, permite voltar meses anteriores).

1. **Cartões de resumo do mês** — total incluído (quantidade) e total concluído (quantidade e valor), com a divisão por tipo: Cerâmico, Peças e Peça em Sacola.

2. **Compras concluídas por dia** — tabela por dia com quantidade e valor, separando as três colunas de tipo (Cerâmico, Peças, Peça em Sacola) e o total do dia.

3. **Compras incluídas por dia** — tabela por dia com a quantidade por tipo e o total do dia.

4. **Gráfico mensal** — barras com o valor de cada dia (uma barra para incluídas e uma para concluídas) e duas linhas de acumulado do mês, uma para cada. Eixo de dias 1 a 31 do mês escolhido.

Valores em padrão brasileiro (R$ com vírgula). Cada tabela tem botão de exportar para Excel, como já existe em Relatórios.

## Como cada data é definida

- **Incluída**: a data da compra (a mesma que aparece nos cards de Compras).
- **Concluída**: a data em que a compra entrou na etapa Concluído, lida do histórico de etapas. Compras já concluídas sem essa marcação no histórico usam a data do último registro de etapa.
- **Tipo**: Cerâmico, Peça em Sacola ou Peças, pela mesma regra usada no resto do app (compras antigas sem marcação são classificadas pelos itens).
- **Valor**: o valor total da compra.

## Detalhes técnicos

- Novas funções em `src/lib/reports.ts`: `loadDailyPurchaseReport(monthStart, monthEnd)` usando `fetchAllRows` sobre `purchases` (campos `id, purchase_number, date, total_brl, status, op_status, material_flow, status_history`) e `fetchAllByIds` sobre `purchase_items` (`purchase_id, item_type`) apenas para classificar compras sem `material_flow`.
- Classificação de etapa/tipo reusando `stageOfStatus`/`STAGES.concluido` de `src/lib/status-stages.ts` e a regra de `isSacolaFlow` (item `peca_sacola`).
- Data de conclusão: última entrada de `status_history` cujo status mapeia para `STAGES.concluido`; fallback para a data da última entrada quando a compra está concluída sem match.
- Consulta de incluídas filtrada por `date` no mês; concluídas buscadas por um intervalo maior (mês + margem) e filtradas em memória pela data de conclusão calculada.
- Nova página `src/pages/DashboardPage.tsx` substituindo `PlaceholderPage` na rota `/` em `src/App.tsx` (`PlaceholderPage` permanece para outros usos). Recharts `ComposedChart` (Bar + Line) dentro de `ChartContainer`, mesmo padrão de `ReportsPage.tsx`; `exportToExcel` reusado.
- Seletor de mês com Popover + botões anterior/próximo, sem alterações de schema, RLS ou dados.

## Verificação

- Abrir a tela inicial, conferir que os dias do mês atual batem com as compras de Compras/Concluídos.
- Trocar para o mês anterior e conferir que as tabelas e o gráfico mudam.
- Conferir que o acumulado do gráfico fecha com o total dos cartões.
