## Objetivo

Na etapa **Conferência** do fluxo de **Peça / Peça em Sacola**, remover o checklist (foto do material recebido + confirmar itens do pedido) e deixar apenas um botão de ação que abre a tela de inclusão das peças conferidas (busca no catálogo + peso, com opção manual).

## Situação atual (verificada)

- `StageActionCard.tsx` só abre o painel de conferência quando a compra tem itens `peca_sacola` (`isSacolaConferencia`). Compras de **Peça** simples caem no checklist genérico — é o card da imagem.
- `stage-tasks.ts` define para `"Em Conferência"`: `photo_recebimento` (foto) e `confirm_itens` (nota), ambos obrigatórios.
- Já existe `SacolaConferenciaPanel.tsx` com busca no catálogo (`PartSearch`), código manual, peso, lista de peças conferidas, progresso `x/y` contra as unidades declaradas, "Salvar e Continuar" e "Encerrar".

## Alterações

1. **`src/lib/stage-tasks.ts`**: esvaziar os requisitos de `"Em Conferência"` (o cerâmico já usa painel próprio, e o fluxo de peças passará a usar painel próprio). Assim nenhum card exibe mais foto/confirmação nessa etapa.

2. **`src/components/processes/StageActionCard.tsx`**: passar a condição de conferência de peças a valer para todo o fluxo `pecas` (com ou sem itens `peca_sacola`), não só quando há sacola. Botão único: **"Incluir Peças Conferidas"**, abrindo o painel. Sem checklist e sem o botão genérico "Concluir Em Conferência" nesse caso — o encerramento continua pelo botão "Encerrar" dentro do painel.

3. **`src/components/processes/SacolaConferenciaPanel.tsx`**: generalizar para os dois fluxos:
   - título "Conferência — Peças" quando não for sacola;
   - gravar `item_type` conforme o fluxo (`peca_sacola` ou `peca`), mantendo `category: "conferencia"`;
   - meta de progresso baseada no total de unidades declaradas na compra (campo "Total de Peças Recebidas"), já que na criação não há mais itens detalhados;
   - remover o item placeholder criado na compra ao salvar as peças reais (mesmo comportamento já usado no cerâmico), evitando linha fantasma no demonstrativo.

## Notas técnicas

- Nenhuma mudança de banco: continua usando `purchase_items` com `category = 'conferencia'`.
- O avanço de etapa segue por `advanceStage` chamado no "Encerrar" do painel.
- Fluxo cerâmico permanece intocado (usa `CeramicoConferenciaPanel`).
