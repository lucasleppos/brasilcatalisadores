## Objetivo

Na tela **Precificação de Peças**, remover o fluxo de justificativa e aprovação de alteração de preço. O usuário continua vendo o valor calculado pelo catálogo (referência) e pode simplesmente digitar outro valor, que é gravado direto.

## O que muda (`src/components/processes/PiecePricingPanel.tsx`)

- Remover o campo de justificativa (Textarea) que aparece quando o valor digitado diverge do calculado.
- Remover o bloco amarelo "aguardando aprovação" com os botões de aprovar/rejeitar.
- Remover o rodapé "X alteração(ões) aguardando aprovação" e a linha "Valor a ser gravado (sem ajustes pendentes)".
- Remover o bloco "Histórico de alterações de valor".
- Remover a leitura e a escrita em `price_override_log`, os estados `overrides`/`justifications` e as funções `pendingFor`, `approvedFor`, `reviewOverride`, `isDiverged`, `effectiveUnit`, `loadOverrides`.
- Ao salvar: gravar exatamente o valor digitado (`valor unit. × quantidade`) em `purchase_items.total_value`, com `pricing_source` = `catalogo` quando igual ao calculado e `manual` quando o usuário alterou.
- Manter: coluna "Calculado unit." (referência do catálogo), botão "Recalcular" (repõe os valores calculados), Pt/Pd/Rh + margem por item, e o resumo Total de peças / Peso total / Valor total.
- O valor inicial de cada linha passa a ser: valor já salvo no item, ou o calculado pelo catálogo quando ainda não há valor.

## Observações

- Nenhuma alteração de banco: a tabela `price_override_log` permanece existente, apenas deixa de ser usada. Posso removê-la depois, se preferir.
- Nenhuma mudança no demonstrativo nem no PDF.
