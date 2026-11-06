# Status "Alocado" para compras já colocadas em Bag

## O que acontece hoje
A compra 041126-16 (Cerâmico) tem 6 itens dentro de Bag. Ao alocar, o sistema marca a compra como "Cerâmico: Encerrado" / "Bag Alocado", e essa combinação é exibida como **Concluído**. A regra de "Alocado" só valia para compras que ainda estavam em "Alocação em Bag", por isso esse caso escapou. O mesmo acontece com Peças/Sacola que já foram encerradas ao entrar no Bag.

## O que muda (só o texto exibido)
- Compra com material em um Bag **aberto** → mostra **Alocado**.
- Compra com material em Bag **fechado/exportado** → continua **Concluído**.
- Compra aprovada sem material em Bag → continua **Alocação em Bag**.
- Status, fluxo, valores, Dashboard e tela de Concluídos não mudam.

## Detalhes técnicos
- Na carga da tela de Compras, buscar `bag_items` com o status do bag e montar o conjunto de compras em bags abertos (hoje o conjunto é só "tem bag_items").
- `displayStageOfPurchase` em `src/lib/status-stages.ts`: retornar `alocado` também quando a etapa for `concluido` e a compra estiver nesse conjunto.
- Filtro de status: incluir "Alocado" como opção própria.
