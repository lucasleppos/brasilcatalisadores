

# Correções no Fluxo de Peças + Filtro de Data nos Processos

## Observações do Usuário

1. **Manter "Peças: Peso Divergente"** — não remover esta etapa do fluxo
2. **Adicionar filtro de data** no módulo de Processos com opções: Semana, Mês, ou seleção livre

## Alterações

### 1. `src/lib/purchases.ts` — Correções no fluxo (do plano anterior aprovado)

Aplicar as correções já aprovadas **sem remover** "Peças: Peso Divergente":
- Criar função `contestDemonstrativo(id, motivo)` que muda status para "Contestado" corretamente
- Remover apenas "Peças: Pesagem Realizada" (redundante com Amostragem) — manter "Peso Divergente"
- Após "Peças: Em Amostragem", ir para "Peças: Alocado ao Bag" (ou "Peso Divergente" se divergir)
- Adicionar status "Concluído" como etapa final unificada
- Corrigir `getNextStatus` para "Contestado" reverter para "Aguardando Demonstrativo"

### 2. `src/components/processes/ProcessFilters.tsx` — Filtro de Data

Adicionar ao componente de filtros:
- **ToggleGroup** com 3 opções: "Semana" (últimos 7 dias), "Mês" (últimos 30 dias), "Todos"
- **Botão de data livre** usando Popover + Calendar (date range picker) para selecionar período personalizado
- Quando selecionado um período livre, desmarcar os toggles pré-definidos

Props novas: `dateRange`, `onDateRangeChange`

### 3. `src/components/processes/ProcessBoard.tsx` — Integrar filtro de data

- Adicionar state `dateFilter` (tipo: `"week" | "month" | "all" | "custom"`) e `customDateRange` (`{from: Date, to: Date}`)
- No `useMemo` de `filtered`, aplicar filtro por `purchase.date` conforme o período selecionado
- Passar props de data para `ProcessFilters`

### 4. Correções de Bags e Contestação (do plano anterior)

- `AllocationPanel.tsx` e `AllocateMaterialDialog.tsx`: incluir "Peças: Alocado ao Bag" no filtro de status
- `StageActionCard.tsx`: usar `contestDemonstrativo` no handler de contestação
- `ProcessBoard.tsx`: renomear "Encerrados" para "Concluídos", filtrar por "Concluído"

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/purchases.ts` | `contestDemonstrativo`, remover "Pesagem Realizada" (manter "Peso Divergente"), adicionar "Concluído" |
| `src/components/processes/ProcessFilters.tsx` | Adicionar ToggleGroup (Semana/Mês/Todos) + DateRange picker |
| `src/components/processes/ProcessBoard.tsx` | State de filtro de data, aplicar no `filtered`, passar props, aba "Concluídos" |
| `src/components/processes/StageActionCard.tsx` | Usar `contestDemonstrativo` |
| `src/components/bags/AllocationPanel.tsx` | Incluir "Peças: Alocado ao Bag" no filtro |
| `src/components/bags/AllocateMaterialDialog.tsx` | Incluir "Peças: Alocado ao Bag" no filtro |

