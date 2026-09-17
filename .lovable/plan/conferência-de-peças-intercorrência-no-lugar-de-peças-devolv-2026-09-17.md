# Conferência de Peças: intercorrência no lugar de "Peças devolvidas"

## O que sai

O bloco **Peças devolvidas** (quantidade + motivo) desaparece da tela **Conferência — Peças**. O total declarado passa a ser descontado apenas pelas peças marcadas com intercorrência.

## O que entra

No bloco **Adicionar Peça** (fluxo de Peças soltas), abaixo da quantidade, uma marcação:

- **Intercorrência** — ligada/desligada antes de adicionar a peça.
- Peça adicionada com a marcação vai direto para o bloco de peças que **não seguem o fluxo**, igual ao comportamento de Peça em Sacola.
- Nas peças já na lista: botão para **marcar intercorrência** (mandar para o bloco separado) e, no bloco separado, botão **Retornar** para trazer de volta ao fluxo.

Assim, ao lançar todas as peças recebidas, as marcadas saem do processo e as demais seguem; o encerramento passa a exigir `declaradas − separadas` peças conferidas.

## PDF

O mesmo botão **Gerar PDF das peças separadas** já existente em Peça em Sacola passa a valer para o fluxo de Peças: lista Nº, Código, Referência, Valor da peça e Grupo, com as mesmas faixas — Grupo 1 até R$ 350,00, Grupo 2 até R$ 650,00, Grupo 3 acima de R$ 650,00 — e resumo de quantidades por grupo no rodapé. O botão também continua disponível nas etapas seguintes da compra.

## Compras antigas

Compras que já tinham quantidade devolvida registrada continuam com esse registro no histórico da etapa, apenas não aparece mais para edição. O total declarado dessas compras deixa de descontar a quantidade devolvida.

## Detalhes técnicos

`src/components/processes/SacolaConferenciaPanel.tsx`:

- remover estados `returnedQtyStr`, `returnedReason`, `showReturns`, `returnedQty`, `returnsError`, o carregamento dessas evidências no `open`, a gravação em `stage_evidence` (`qtd_devolvida` / `motivo_devolucao`) e o bloco de UI correspondente;
- `declaredQty = max(0, baseDeclaredQty - excludedQty)`; cabeçalho mostra `declaradas · separadas · no fluxo`;
- novo estado `newIssue: boolean` com `Checkbox`/toggle no formulário de adicionar (apenas quando `!isSacola`), aplicado como `excluded: newIssue` na peça criada em `handleAdd` e resetado depois;
- nas linhas de peças conferidas do fluxo de Peças, botão "Intercorrência" chamando `setExcluded(i, true)` (o `Retornar` do bloco separado já existe);
- o bloco "não seguem o fluxo" e o botão de PDF passam a renderizar em ambos os fluxos, com título/texto genérico ("Peças com intercorrência — não seguem o fluxo") quando `!isSacola`.

Sem migração: peças com intercorrência continuam gravadas com `category = EXCLUDED_CATEGORY` em `purchase_items`; `getExcludedItems` e `StageActionCard` já cobrem o PDF nas etapas seguintes. `separated-pieces-report.ts` e `separated-pieces-value.ts` permanecem inalterados. Validação: `bunx tsgo --noEmit`.
