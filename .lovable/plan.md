

# Workflow de Aprovação por Etapas

## Conceito
Transformar o fluxo de status das compras em um **sistema de tarefas por perfil**, onde cada usuário vê apenas as compras na etapa que lhe compete, executa sua ação, e o sistema avança automaticamente para o próximo responsável.

## Mapeamento Etapa → Perfil Responsável

```text
Etapa                    │ Perfil         │ Ação do Usuário
─────────────────────────┼────────────────┼──────────────────────────────
Recebimento              │ operacional    │ Confirmar recebimento
Conferência              │ operacional    │ Confirmar conferência
Separação                │ operacional    │ Confirmar separação
Corte da Peça            │ operacional    │ Confirmar corte
Trituração               │ operacional    │ Confirmar trituração
Homogeneização           │ operacional    │ Confirmar homogeneização
Amostragem               │ operacional    │ Confirmar amostragem
Análise                  │ laboratorio    │ Inserir PPMs → gera valor
Aprovação do Fornecedor  │ admin          │ Enviar e confirmar aprovação
Pagamento                │ admin          │ Confirmar envio ao financeiro
Enviado ao Bag           │ admin          │ Alocar no bag (manual)
Exportação/Venda         │ admin          │ Fechamento mensal
```

## Arquivos e Mudanças

### 1. `src/lib/purchases.ts` — Configuração do workflow
- Exportar constante `STAGE_ROLES`: mapa de cada status para o(s) perfil(is) responsáveis
- Nova função `getNextStatus(current)`: retorna o próximo status na sequência
- Nova função `canUserActOnStage(role, status)`: verifica se o perfil do usuário pode agir naquela etapa
- Modificar `updatePurchaseStatus` para aceitar dados opcionais (PPMs do lab) e recalcular valor dos itens quando vindo da etapa Análise

### 2. `src/components/processes/ProcessBoard.tsx` — Visão por perfil (refatorar)
- Substituir o board atual por uma **lista de tarefas pendentes** filtrada pelo perfil do usuário logado
- Cada card mostra: fornecedor, nº pedido, itens, tempo na etapa
- Botão de ação contextual por etapa:
  - Etapas operacionais (Recebimento→Amostragem): botão "Concluir [nome da etapa]" → avança automaticamente
  - Análise (laboratório): formulário inline com campos Pt/Pd/Rh ppm + botão "Registrar Análise" → calcula valor e avança
  - Aprovação/Pagamento (admin): botão "Confirmar" → avança
- Super_admin e admin veem **todas** as etapas; outros perfis veem apenas as suas
- Manter visão resumida do pipeline completo (cards KPI no topo)

### 3. `src/components/processes/StageActionCard.tsx` — Novo componente
- Card de ação para cada compra pendente
- Renderiza o formulário correto conforme a etapa:
  - **Padrão**: botão "Concluir" com confirmação
  - **Análise**: campos PPM (Pt, Pd, Rh) + preview do cálculo + botão "Registrar Análise"
  - **Aprovação do Fornecedor**: campo de observação opcional + botão "Aprovar"

### 4. `src/lib/purchases.ts` — Lógica de análise no avanço
- Quando o laboratório registra PPMs na etapa "Análise":
  1. Atualiza os `purchase_items` do tipo cerâmico/sacola com os PPMs inseridos
  2. Recalcula o valor via `calculate()` usando as settings atuais
  3. Atualiza `total_brl` da compra
  4. Avança para "Aprovação do Fornecedor"

### 5. `src/App.tsx` e `src/components/AppSidebar.tsx` — Ajuste de rotas
- Rota `/processos`: permitir acesso também ao perfil `comprador` (para acompanhar status)
- O perfil `laboratorio` já tem acesso

### 6. `src/pages/PurchasesPage.tsx` — Restringir mudança manual de status
- Remover o `Select` de status para perfis não-admin
- Admin/super_admin mantêm a possibilidade de override manual (casos excepcionais)

## Fluxo do Usuário

1. **Operacional** acessa `/processos` → vê lista de compras nas etapas Recebimento a Amostragem → clica "Concluir" → compra avança automaticamente
2. **Laboratório** acessa `/processos` → vê apenas compras em "Análise" → insere PPMs → valor é calculado → compra avança para Aprovação
3. **Admin** acessa `/processos` → vê todas as etapas + compras pendentes de Aprovação/Pagamento → confirma cada uma → compra avança até "Enviado ao Bag"
4. **Admin** aloca material no bag via módulo Bags existente
5. No final do mês, admin muda para "Exportação/Venda"

## Sem alterações de banco
Toda a lógica usa as tabelas existentes (`purchases`, `purchase_items`, `status_history`). O campo de PPMs já existe nos items via `calc_input`/`calc_result`. Nenhuma migração necessária.

