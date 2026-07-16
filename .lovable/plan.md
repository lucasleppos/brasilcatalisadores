# Reformulação do pós-aprovação (Cerâmico)

## Fluxo atual (hoje)

```text
Cerâmico: Gerar Boleto de Aprovação
     │ (Syge + aprovação)
     ▼
Cerâmico: Aprovado  ──── inicia 2 sub-fluxos paralelos ────
     │
     ├── FIN: Aguardando Pagamento → Pagamento Realizado → Encerrado ERP
     └── OP:  Alocando Bag → Bag Alocado → Enviado Exportação
                     │
                     ▼
            Cerâmico: Encerrado → Concluído
```

Problemas:
1. Existe uma coluna "Pagamento" no ProcessBoard e um sub-fluxo financeiro (`CER_FIN_STATUSES`) que não faz mais sentido — o pagamento não é etapa do sistema.
2. Ao ser alocado a um bag, o material some do painel (a lógica esconde quando `opStatus === "Enviado Exportação"` ou quando o item já está em `bag_items`).
3. Não há módulo "Concluídos" com visualização em lista dos materiais cerâmicos finalizados.

## Fluxo desejado

```text
Cerâmico: Gerar Boleto de Aprovação
     │ (Syge + aprovação)
     ▼
Cerâmico: Aprovado
     │  (envio automático ao módulo Bags — grupos disponíveis para alocação)
     ▼
[Alocação em Bag]  ← material permanece visível no módulo Bags
     │  (após Bag ser fechado / enviado à exportação)
     ▼
Módulo "Concluídos"  ← lista tipo Compras com todas as infos da compra + grupos
```

Sem etapa de Pagamento. Sem sub-fluxo financeiro. Um único caminho operacional Aprovado → Bags → Concluído.

## Mudanças

### 1. `src/lib/purchases.ts` — remover sub-fluxo financeiro
- Remover `CER_FIN_STATUSES` (Aguardando Pagamento / Pagamento Realizado / Encerrado ERP) e a função `advanceFinStatus`.
- Manter `CER_OP_STATUSES` mas renomear/simplificar para 2 estados: `"Alocando Bag"` → `"Bag Alocado"` (concluído). Remover `"Enviado Exportação"`.
- `isInParallelPhase` passa a checar apenas `opStatus`.
- Em `StageActionCard.tsx`, ao mover para "Cerâmico: Aprovado" não setar mais `fin_status`; setar apenas `op_status = "Alocando Bag"`.
- `advanceOpStatus`: quando chegar a `"Bag Alocado"`, mover automaticamente `status` para `"Cerâmico: Encerrado"` (sem depender de fin_status).

### 2. `src/components/processes/ProcessBoard.tsx` — reorganizar colunas
- **Remover** o grupo "Pagamento".
- **Renomear** "Bags / Exportação" → "Bags".
- A coluna Bags mostra compras cerâmicas em `Cerâmico: Aprovado` cujo `opStatus !== "Bag Alocado"`.
- Compras com `opStatus === "Bag Alocado"` ou `status = "Cerâmico: Encerrado"` migram para a nova aba "Concluídos" (fora do ProcessBoard).

### 3. Módulo Bags — material não some após alocado
- `AllocationPanel.tsx` e `AllocateMaterialDialog.tsx`: hoje filtram `.eq("op_status", "Alocando Bag")` e removem itens já presentes em `bag_items`. Manter esse filtro somente para a seção **"Disponíveis para alocação"**.
- Adicionar seção **"Alocados"** listando os grupos já vinculados a um bag, com badge do bag correspondente (link para o BagDetail). Item continua visível até o bag ser encerrado.
- Quando **todos** os `purchase_items` cerâmicos de uma compra estiverem alocados, avançar `op_status` para `"Bag Alocado"` (o registro sai da fila mas permanece consultável via módulo Concluídos e via BagDetail).

### 4. Novo módulo "Concluídos"
- Nova rota `/concluidos` e item no menu lateral (visível conforme permissão `concluidos.access`).
- Página `src/pages/CompletedPage.tsx` + componentes em `src/components/completed/`:
  - Layout inspirado em `PurchasesPage`: filtros (fornecedor, comprador, período, nº Syge), tabela com colunas: Nº Compra, Data, Fornecedor, Comprador, Nº Syge, Peso total, Valor total, Bag(s) alocado(s), Status final.
  - Ação "Ver detalhes" abre dialog mostrando: dados da compra, grupos (com peso, teor, valor), demonstrativo (link para PDF), bags associados.
- Fonte de dados: `purchases` com `status IN ('Cerâmico: Encerrado','Concluído')` **ou** com `op_status = 'Bag Alocado'` (materialFlow = ceramico).
- Somente leitura — nenhuma ação de avanço de etapa.

### 5. Permissões
- Nova chave `concluidos` no JSONB de permissões (`permissions` table). Ações: `access` (mesma lógica dos outros módulos).
- Seed via `insert` tool após aprovação do plano: adicionar `concluidos.access = true` para `super_admin` e `admin`.

### 6. Dados existentes / migração
- Compras cerâmicas legadas com `fin_status` preenchido: ignoradas pelo novo fluxo (o campo permanece na tabela mas deixa de ser lido). Nada a migrar em SQL — sem alteração de schema.

## Escopo excluído
- Fluxo de Peças: nenhuma mudança.
- Cálculo, precificação, PDF, geração de boleto Syge: nenhuma mudança.
- Estrutura das tabelas `purchases`, `bags`, `bag_items`: nenhuma mudança (apenas leitura diferente).

## Detalhes técnicos
- `CER_FIN_STATUSES` e `advanceFinStatus` deixam de ser exportados; remover imports em `StageActionCard.tsx` e `ProcessBoard.tsx`.
- Nova permissão: um `UPDATE public.permissions SET permissions = jsonb_set(...)` via insert tool (não é migration — é dado).
- Menu lateral (provavelmente em `src/components/Layout` ou similar): adicionar link "Concluídos" com ícone (ex.: `CheckCircle2`).

## Ordem de execução (após aprovação)
1. Ajustar `src/lib/purchases.ts` (remover fin, simplificar op).
2. Ajustar `ProcessBoard.tsx` e `StageActionCard.tsx`.
3. Atualizar Bags (`AllocationPanel`, `AllocateMaterialDialog`) para manter visibilidade dos alocados.
4. Criar página + rota "Concluídos".
5. Rodar `insert` para adicionar permissão `concluidos.access`.
