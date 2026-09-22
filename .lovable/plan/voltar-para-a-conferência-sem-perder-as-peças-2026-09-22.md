# Voltar para a Conferência sem perder as peças

Hoje, quando uma compra de Peças volta para a Conferência e é salva de novo, o app apaga todas as peças e grava tudo outra vez. Isso cria peças novas, com números internos novos, e faz o valor já lançado na precificação desaparecer (confirmado nas compras 180926-14 e 210926-24, onde todas as peças ficaram com data de criação do momento do novo salvamento).

## O que muda

1. **As peças são mantidas ao salvar a conferência.** Ao voltar e salvar, cada peça já existente é apenas atualizada — mantém peso, quantidade, valor lançado, marcação Flex/Carbono e a marcação de intercorrência. Só peças realmente adicionadas são criadas e só as removidas na tela são excluídas.
2. **Valor e quantidade continuam como estavam e podem ser editados.** Nada é zerado automaticamente; o usuário altera o que precisar.
3. **Peças sem código de catálogo passam a aparecer na conferência.** Hoje elas ficam invisíveis na tela e são apagadas no salvamento.
4. **Compra com peças já alocadas em Bag não volta de etapa.** Tanto pelo botão Contestar → "Voltar para Conferência" quanto pela movimentação manual do admin: a ação é bloqueada com aviso claro ("Esta compra já tem peças alocadas em Bag; retire a alocação no módulo Bags antes de voltar a etapa").

## Detalhes técnicos

`src/components/processes/SacolaConferenciaPanel.tsx`
- `loadExistingPieces`: remover o filtro `d.catalog_part_id` (montar código/referência a partir de `part_code`/`part_reference` quando não houver catálogo) e carregar também `total_value`, `pricing_source`, `calc_input`, `calc_result`; guardar esses campos na peça em memória.
- `persistPieces`: substituir o `delete` por `purchase_id` + `insert` em lote por uma reconciliação:
  - peças com `id`: `update` de `quantity`, `weight`, `category`, `seq`, `material_kind` (sem tocar em `total_value`/`pricing_source`/`calc_input`/`calc_result`);
  - peças sem `id`: `insert` (como hoje);
  - `delete` apenas dos ids que estavam carregados e não estão mais na lista, e apenas quando não houver `bag_items` com aquele `purchase_item_id`;
  - manter o `delete` do item marcador criado na compra (item de `peca`/`peca_sacola` sem `category`).

`src/components/processes/StageActionCard.tsx`
- `handleContestDestination("conferencia")` e `handleAdminMove` (quando o destino for uma etapa anterior à conferência/`Em Conferência`): antes de atualizar o status, consultar `bag_items` por `purchase_id`; havendo registros, exibir erro e abortar.

Validação: `bunx tsgo --noEmit` e um teste no preview voltando uma compra de Peças para a conferência, conferindo que as peças e os valores permanecem.
