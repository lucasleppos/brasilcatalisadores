# Padronizar os status entre Compras e Processos

## Situação atual (verificada)

- Em Compras, a lista de status é montada com os textos internos do banco, exatamente como estão gravados: "Peças: Trituração e Amostragem", "Cerâmico: Em Trituração/Homogeneização", "Cerâmico: Gerar Boleto de Aprovação", "Peças: Em Corte", etc. Por isso a lista sai fora de ordem, misturando cerâmico e peças e sem relação com as etapas de Processos.
- Em Processos as mesmas situações aparecem agrupadas em seis etapas: Conferência, Moagem, Laboratorio, Demonstrativo, Aprovação, Corte (com "Laboratorio" sem acento).
- Hoje existem 14 combinações de status em uso, incluindo compras já encerradas ("Cerâmico: Encerrado", "Peças: Alocado ao Bag"), que aparecem na lista de Compras sem um filtro próprio.

## O que será feito

1. Criar uma tabela única de nomes de etapa, usada por todos os módulos, com esta ordem e nomenclatura:
   Conferência → Moagem → Laboratório → Demonstrativo → Aprovação → Corte → Alocação em Bag → Concluído.
2. Em Compras:
   - o seletor passa a listar as etapas nessa ordem (não mais os textos internos), com as opções "Todos os status", as etapas do fluxo e "Concluídos";
   - a coluna Status mostra o nome da etapa, com o tipo de material (Cerâmico / Peças / Peça em Sacola) como complemento discreto, mantendo as cores atuais;
   - ao passar o mouse, o texto original do status continua visível, para não perder detalhe operacional.
3. Corrigir "Laboratorio" para "Laboratório" em Processos (barra de etapas, versão celular e ícones), sem mexer nas regras de avanço.
4. Aplicar o mesmo nome de etapa nas telas de Concluídos e na lista de Compras no celular, para o mesmo material mostrar sempre o mesmo nome.

Nada muda no banco de dados, nas regras de avanço de etapa, nas permissões nem nos cálculos: é apenas nomenclatura e filtro de visualização.

## Detalhes técnicos

- Novo módulo `src/lib/status-stages.ts`:
  - `STAGE_ORDER` (Conferência, Moagem, Laboratório, Demonstrativo, Aprovação, Corte, Alocação em Bag, Concluído);
  - `stageOfStatus(status, opStatus?)` — mapa derivado de `PROCESS_GROUPS` mais os estados finais (`Peças: Alocado ao Bag`, `Peças: Encerrado`, `Cerâmico: Aprovado`+`Alocando Bag` → Alocação em Bag; `Cerâmico: Encerrado`, `Concluído`, `Bag Alocado` → Concluído);
  - `flowLabel(materialFlow)` para o complemento (Cerâmico / Peças / Peça em Sacola);
  - `isCompletedStage(purchase)` reutilizando o critério já usado em `CompletedPage.tsx`.
- `PROCESS_GROUPS` em `ProcessBoard.tsx` passa a importar os rótulos de `status-stages.ts` (fonte única); `process-group-ui.ts` atualizado para a chave "Laboratório".
- `PurchasesPage.tsx`: `activeStatuses` substituído por etapas derivadas de `stageOfStatus`, ordenadas por `STAGE_ORDER`; filtro compara etapa; badge usa `stageOfStatus` + `getStatusColor(p.status)` e `title={p.status}`.
- `MobilePurchaseList.tsx` e `CompletedPage.tsx` / `MobileCompletedList.tsx` passam a exibir o mesmo rótulo de etapa.
- Verificação: `bunx tsgo --noEmit` e conferência de `/compras` e `/processos` no Preview.
