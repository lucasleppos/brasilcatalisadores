## Objetivo

Cada peça em sacola recebe um número na conferência (#1, #2, #3...) e mantém esse mesmo número em todas as etapas seguintes (trituração, análise, precificação, demonstrativo/PDF e concluídos), mesmo quando peças são separadas do fluxo ou removidas.

## Situação atual

Hoje o número é apenas o índice da lista renderizada em cada tela (`#{i + 1}`). Como a conferência apaga e reinsere os itens a cada salvamento, e as etapas seguintes filtram as peças separadas, a mesma peça pode aparecer como #3 na conferência e #2 na trituração. Não existe campo de sequência em `purchase_items` (colunas atuais: quantity, weight, weight_loss, weight_real, category, catalog_part_id, calc_input/result, pricing_source).

## Alterações

**1. Banco de dados**
- Migração: adicionar coluna `seq integer` em `public.purchase_items` (nullable, sem impacto nos itens existentes). Sem mudança de RLS/grants.

**2. Conferência (`SacolaConferenciaPanel.tsx`)**
- Cada peça adicionada recebe o próximo número livre (maior `seq` existente + 1); o número nunca é reaproveitado ao excluir uma peça.
- O número é carregado do banco ao reabrir o painel e regravado no re-insert do salvamento (a peça #3 continua #3).
- Peças separadas do fluxo mantêm seu número original no bloco "Não seguem o fluxo de sacola".
- Itens antigos sem `seq` recebem numeração automática pela ordem de criação na primeira abertura.

**3. Etapas seguintes**
- `SacolaTrituracaoPanel.tsx`, `SacolaLabPanel.tsx`, `SacolaPricingPanel.tsx`: exibir `#seq` vindo do item em vez do índice da lista (mensagens de erro da precificação também passam a citar o número real).
- `DemonstrativoViewDialog.tsx` e a função de PDF (`generate-demonstrativo-pdf`): coluna "#" das peças usa o `seq` gravado.
- `CompletedDetailRow.tsx`: mostrar o número da peça no detalhamento.

**4. Fallback**
- Quando o item não tiver `seq` (compras antigas), usa-se o índice atual como hoje, evitando quebra visual.

## Detalhes técnicos

- `seq` é único apenas dentro da compra (controlado no app, sem constraint), calculado como `max(seq) + 1` sobre todas as peças da compra, incluindo as separadas.
- O fluxo de peça fechada (`peca`, agrupado por quantidade) não usa numeração individual; a mudança fica restrita a `peca_sacola`.
