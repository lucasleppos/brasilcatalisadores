## Objetivo

Reordenar o fluxo de **Peças / Peça em Sacola** para:

```text
Conferência (incluir peças do catálogo)
   ↓
Precif. / Demonstrativo (puxa as peças conferidas, visualizar + PDF)
   ↓
Aprovação (bloqueada sem Boleto Syge)
   ↓
Corte (abertura das carcaças + peso real da cerâmica)
   ↓
Trit. / Homog. / Amostr. (confirmação simples)
   ↓
Concluído + Alocação de Bag
```

A etapa de Laboratório/Análise deixa de existir no fluxo de Peças.

## Alterações

**1. Máquina de estados (`src/lib/purchases.ts`)**
- Novo `PECAS_FLOW`: `Aguardando Inclusão → Aguardando Conferência → Em Conferência → Peças: Aguardando Demonstrativo → Peças: Gerar Boleto de Aprovação → Peças: Em Corte → Peças: Trituração e Amostragem → Peças: Alocado ao Bag → Concluído`.
- `getNextStatus`: após "Em Conferência" (fluxo peças) vai para "Peças: Aguardando Demonstrativo"; após "Gerar Boleto de Aprovação" vai para "Peças: Em Corte" (em vez de "Alocado ao Bag"); após "Em Corte" vai para "Peças: Trituração e Amostragem"; após esta, vai para "Peças: Alocado ao Bag".
- Estados removidos do fluxo linear (mantidos apenas como legado para compras antigas): "Peças: Laboratório", "Peças: Em Trituração", "Peças: Em Amostragem", "Peças: Aprovado - Aguardando Pagamento", "Peças: Pagamento Realizado".
- Contestação no fluxo peças volta para "Em Conferência" ou "Peças: Aguardando Demonstrativo" (não mais para Laboratório).
- Ao alocar todas as peças em bag, a compra encerra e entra no módulo Concluídos (mesma lógica já usada no cerâmico).

**2. Checklists (`src/lib/stage-tasks.ts`)**
- "Peças: Em Corte": apenas **peso real da cerâmica extraída (kg)** obrigatório; foto passa a opcional.
- "Peças: Trituração e Amostragem": mantém apenas a confirmação simples ("trituração e amostragem concluídas").

**3. Card de etapa (`src/components/processes/StageActionCard.tsx`)**
- Em "Peças: Aguardando Demonstrativo": painel de precificação já carrega os itens conferidos; botões **Visualizar demonstrativo** e **Gerar PDF** ativos.
- Em "Peças: Gerar Boleto de Aprovação": Visualizar/PDF/Contestar ativos; **Aprovar** bloqueado até o Boleto Syge ser informado (mesmo comportamento do cerâmico), e a aprovação passa a mandar para Corte.
- Remove o painel de Laboratório (`SacolaLabPanel`) do fluxo de peças.

**4. Quadro de processos (`src/components/processes/ProcessBoard.tsx`)**
- Coluna "Prep. Amostra / Análise" deixa de listar "Peças: Laboratório".
- "Corte" e "Trit. / Homog. / Amostr." passam a aparecer depois de "Aprovação" na ordem das colunas para refletir o novo fluxo.

## Detalhes técnicos

- Nenhuma migração de banco: os status são texto livre em `purchases.status`; compras existentes em status antigos continuam válidas via lista de legado.
- A precificação de peças continua usando `purchase_items` gravados na Conferência (código, referência, quantidade, peso do catálogo), sem recadastro.
- `STAGE_ROLES` atualizado: Corte e Trituração seguem com perfil operacional; Precificação/Aprovação com admin.
