# Ajustar a regra de "compra concluída" por tipo

## Situação

Hoje o Dashboard usa uma ordem única de etapas para decidir se uma compra já passou da Aprovação. No fluxo de **Peças**, porém, as etapas **Corte** e **Trituração/Moagem** acontecem *depois* da Aprovação (`Peças: Em Corte` → `Peças: Trituração e Amostragem` → `Peças: Alocado ao Bag`). Como a ordem genérica coloca Moagem antes da Aprovação, compras de Peças que estão em Corte ou em Trituração/Moagem ficam de fora das concluídas.

## O que muda

- **Peças:** compras em **Corte**, **Trituração/Moagem**, **Alocado ao Bag** e **Encerrado** passam a contar como concluídas, com a data em que entraram na primeira dessas etapas.
- **Cerâmico** e **Peça em Sacola:** continuam como hoje — concluídas quando passaram pela Aprovação.
- Vale para os cartões de totais, a tabela de concluídas, o gráfico diário/acumulado e a exportação para Excel.
- O card "Compras na fila" usa a mesma regra: compras de Peças em Corte ou Moagem saem da fila e passam a alimentar a média de valores por tipo.

## Detalhe técnico

Em `src/lib/reports.ts`, trocar a checagem baseada em `STAGE_ORDER` por uma checagem baseada na sequência do próprio fluxo:

- usar `PECAS_FLOW` / `SACOLA_FLOW` / `CERAMICO_FLOW` de `src/lib/purchases.ts` (via `getFlowStatuses`) e considerar concluída a compra cujo status esteja em posição posterior ao status de aprovação daquele fluxo (`Peças: Gerar Boleto de Aprovação` / `Cerâmico: Gerar Boleto de Aprovação`);
- `op_status` continua respeitado (`Bag Alocado` / `Alocando Bag` = concluída);
- `completionDate(p, flow)` passa a receber o fluxo e varre `status_history` procurando a primeira entrada já posterior à aprovação naquele fluxo;
- `passedApproval` vira `isCompletedForFlow(status, opStatus, flow)`, usada tanto em `loadDailyPurchaseReport` quanto em `loadPipelineForecast`;
- statuses fora da sequência linear (`Demonstrativo Contestado`, `Peso Divergente`) tratados pela etapa padronizada: Contestado = não concluído; `Peças: Peso Divergente` = concluído em Peças (ocorre após o Corte).

Validação: `bunx tsgo --noEmit` e conferência dos números no Dashboard no preview.
