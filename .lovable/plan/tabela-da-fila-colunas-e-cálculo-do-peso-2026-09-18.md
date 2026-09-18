# Tabela da fila: colunas e cálculo do peso

## O que muda na tabela

A tabela do card "Compras na fila" passa a ter exatamente 5 colunas:

| Tipo | Compras | Peso (kg) | R$/kg Médio | Previsão Pgto |
|---|---|---|---|---|

- **Tipo** — Cerâmico, Peças, Peça em Sacola
- **Compras** — quantidade de compras na fila (ainda não passaram da Aprovação)
- **Peso (kg)** — soma do peso das compras na fila
- **R$/kg Médio** — valor total das compras concluídas no mês corrente dividido pelo peso total dessas compras, por tipo
- **Previsão Pgto** — Peso (kg) × R$/kg Médio

As colunas **Unidades** e **R$/un** saem da tabela. O rodapé soma Compras, Peso e Previsão Pgto.

## Como o peso passa a ser calculado

- **Cerâmico**: segue como hoje — peso real, senão granel, senão declarado.
- **Peças e Peça em Sacola**: soma peça por peça.
  - Peça já cadastrada no catálogo: usa o peso do catálogo × quantidade.
  - Peça sem catálogo (ou sem peso cadastrado): considera **0,7 kg por unidade**.
  - Peças com intercorrência (fora do fluxo) entram na soma com 0,7 kg por unidade.

A mesma regra vale para o peso das compras concluídas usado no cálculo do R$/kg Médio, para que a média e a previsão fiquem na mesma base.

Quando o tipo não tem compras concluídas no mês, R$/kg Médio e Previsão Pgto aparecem como "sem histórico no mês" e o tipo não soma no total.

O gráfico de pizza ao lado continua mostrando a quantidade de compras na fila por tipo, e o filtro Todos/Cerâmico/Peças/Peça em Sacola do topo continua valendo.

## Detalhes técnicos

`src/lib/reports.ts` — `loadPipelineForecast`:
- a busca de `purchase_items` passa a trazer `catalog_part_id` (além de `quantity`, `weight`, `category`, `item_type`); carregar os pesos de `catalog_parts` pelos ids referenciados (via `fetchAllByIds`).
- nova agregação por compra: `pieceWeight = Σ (peso do catálogo ?? peso do item ?? 0,7) × quantidade`, incluindo os itens com `category = 'conferencia_excluida'` (peso 0,7 por unidade).
- `weightOf(p, flow)`: para `pecas`/`sacola` retorna `pieceWeight`; para `ceramico` mantém real → granel → declarado.
- `PipelineFlowStat` reduz para `{ pendingCount, pendingWeight, avgPerKg, forecast }`; `pendingUnits`/`avgPerUnit` e o fallback por unidade são removidos. `forecast = pendingWeight × avgPerKg` (0 quando `avgPerKg` é nulo).

`src/pages/DashboardPage.tsx` — `PipelineCard`: remover colunas Unidades e R$/un, renomear cabeçalhos para "R$/kg Médio" e "Previsão Pgto", redistribuir larguras das 5 colunas e ajustar o rodapé.

Validação: `bunx tsgo --noEmit` e conferência da tabela no preview.
