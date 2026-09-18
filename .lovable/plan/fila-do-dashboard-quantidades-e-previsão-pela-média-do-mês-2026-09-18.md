# Fila do Dashboard: quantidades e previsão pela média do mês

## O que a tabela vai mostrar

Para cada tipo (Cerâmico, Peças, Peça em Sacola), com o total no rodapé:

| Coluna | Conteúdo |
| --- | --- |
| Compras | quantidade de compras na fila (ainda não passaram da Aprovação) |
| Peso (kg) | soma do peso das compras da fila |
| Unidades | soma das peças/itens das compras da fila |
| R$/kg (mês) | valor médio por kg das compras concluídas no mês corrente |
| R$/un (mês) | valor médio por unidade das compras concluídas no mês corrente |
| Previsão | custo estimado da fila daquele tipo |

Título do card passa a ser "Compras na fila — quantidades e previsão pela média do mês corrente".

## Regras

- **Fila**: compras que ainda não passaram da Aprovação, pela regra por fluxo já vigente (em Peças, Corte e Trituração/Moagem já contam como concluídas, então saem da fila).
- **Peso**: peso real; sem ele, peso a granel; sem ele, peso declarado; sem ele, a soma dos itens (peso × quantidade). Peças com intercorrência (fora do fluxo) não entram.
- **Unidades**: soma da quantidade dos itens da compra, também sem as peças fora do fluxo.
- **Médias**: somente compras concluídas dentro do **mês corrente**, com valor lançado maior que zero. R$/kg = soma dos valores ÷ soma dos kg; R$/un = soma dos valores ÷ soma das unidades.
- **Previsão** por tipo: peso da fila × R$/kg. Quando o tipo não tem peso registrado na fila, usa unidades × R$/un.
- Sem compras concluídas no mês para aquele tipo: médias e previsão aparecem como "sem histórico no mês" e o tipo não soma nada no total.
- O filtro Todos/Cerâmico/Peças/Peça em Sacola do topo continua valendo para o card; o gráfico de pizza segue mostrando a quantidade de compras na fila por tipo.

## Detalhe técnico

`src/lib/reports.ts` — `loadPipelineForecast()`:

- passa a receber o mês corrente (início/fim) para calcular as médias;
- busca `purchase_items` (`purchase_id, item_type, quantity, weight, category`) de todas as compras da janela, em chunks via `fetchAllByIds`, ignorando `category = 'conferencia_excluida'`;
- helpers `weightOf(p, items)` (real → granel → declarado → soma dos itens) e `unitsOf(items)`;
- `PipelineFlowStat` passa a expor `pendingCount`, `pendingWeight`, `pendingUnits`, `avgPerKg | null`, `avgPerUnit | null`, `forecast`;
- médias somam peso/unidades/valor das compras concluídas (via `isCompletedForFlow`) cuja data de conclusão cai no mês corrente.

`src/pages/DashboardPage.tsx` — `PipelineCard`: tabela com as novas colunas (kg com 3 decimais, unidades inteiras, moeda em pt-BR), célula "sem histórico no mês" quando a média é nula, rodapé somando compras, kg, unidades e previsão; query passa a incluir o mês na chave.

Validação: `bunx tsgo --noEmit` e conferência dos números no Dashboard via Playwright.
