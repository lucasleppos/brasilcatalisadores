# "Alocado" como status final da compra

## O que acontece hoje
A compra 041126-16 (Cerâmico) tem 6 itens dentro de Bag, mas aparece como **Concluído**: ao alocar, o sistema encerra a compra e esse encerramento é exibido como "Concluído". A regra de "Alocado" só valia para compras ainda em "Alocação em Bag".

## O que muda (só o texto exibido na tela de Compras)
- Compra com material em qualquer Bag (aberto, fechado ou exportado) → **Alocado**.
- "Alocado" passa a ser o último status; "Concluído" deixa de aparecer na lista e no filtro.
- Compra aprovada sem material em Bag → continua **Alocação em Bag**.
- Compras antigas encerradas sem nenhum item em Bag (casos raros) também aparecem como **Alocado**, para não sobrar "Concluído".
- Status gravados, fluxo, valores, Dashboard e relatórios não mudam.

## Detalhes técnicos
- `displayStageOfPurchase` em `src/lib/status-stages.ts`: etapas `bag` com bag_items e todas as `concluido` retornam `alocado`.
- Filtro de status da tela de Compras: substituir a opção "Concluído" por "Alocado" (agrupando as encerradas).
- Lógica interna (`isCompletedStage`, tela Concluídos, Dashboard) continua usando a etapa real.
