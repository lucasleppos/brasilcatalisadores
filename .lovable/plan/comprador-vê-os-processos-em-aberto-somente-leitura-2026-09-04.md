# Comprador vê os processos em aberto (somente leitura)

## O que está acontecendo

O perfil "comprador" não tem a permissão de avançar etapas, e nenhuma etapa do processo é atribuída a ele. A tela de Processos monta as abas apenas com as etapas em que o perfil pode agir — como não há nenhuma, ela mostra "Nenhuma tarefa pendente para o seu perfil.", mesmo com os números de topo (31 compras, 29 em produção) corretos e já filtrados pelos nomes de comprador do Marcos.

Ou seja: não é falta de dados nem de vínculo de nome. É a regra de exibição das abas.

## Proposta

Deixar o comprador acompanhar, em modo somente leitura, as compras dele que estão em aberto:

- Quando o perfil não pode avançar etapas, a tela passa a mostrar todas as abas de etapa (Conferência, Moagem, Laboratório, Demonstrativo, Aprovação, Corte) com as compras dele em cada uma.
- Os cartões aparecem sem os botões de ação/avanço — apenas as informações da compra (OP, fornecedor, data, valor, etapa atual).
- Nenhuma alteração no que ele pode editar: continua sem poder mover etapa, registrar pesos, análises ou aprovar.
- O mesmo comportamento na versão mobile.
- Segue valendo o recorte por comprador: ele só vê as compras ligadas aos nomes de comprador vinculados ao usuário dele.

## Detalhes técnicos

- `src/components/processes/ProcessBoard.tsx`: `visibleGroups` hoje retorna `[]` quando `canDo("processos","advance_stage")` é falso. Passar a retornar todos os `PROCESS_GROUPS` nesse caso, marcando o modo leitura.
- `src/components/processes/StageActionCard.tsx`: aceitar prop `readOnly` e esconder os controles de ação (avançar etapa, painéis de registro, Boleto Syge, impressões que gravam dados), mantendo o resumo.
- `src/components/processes/MobileProcessBoard.tsx`: mesma lógica de grupos visíveis e modo leitura.
- Sem mudanças de banco: as permissões JSONB do perfil comprador ficam como estão (`advance_stage: false`), o RLS não muda.
