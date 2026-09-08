# Ajuste no resumo do PDF de Peças Separadas

## O que muda

No PDF "Peças separadas do fluxo", o resumo por grupo no rodapé passa a mostrar **apenas a quantidade de peças de cada grupo**, removendo a soma dos valores.

- Antes: `Grupo 1: 5 un — R$ 1.250,00`
- Depois: `Grupo 1: 5 peça(s)`

A coluna individual "Valor da peça" e a coluna "Grupo" na tabela continuam como estão. Só o resumo por grupo no rodapé é simplificado.

## Detalhes técnicos

- `src/lib/separated-pieces-report.ts`: no bloco `groupSummary`, retirar o cálculo de `sum` e a chamada `fmtBrlLocal(sum)`. Manter a listagem dos grupos e a contagem de peças, ajustando o texto para "peça(s)".
- Validação: `bunx tsgo --noEmit` e geração do PDF de uma compra de Peça em Sacola com peças separadas para confirmar o novo rodapé.
