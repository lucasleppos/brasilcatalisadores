

# Implementar 11 Tabs Fixas Agrupadas no Módulo de Processos

## Resumo
Substituir as ~28 tabs individuais por 11 tabs fixas que agrupam status relacionados, conforme mapeamento aprovado. "Peças: Em Corte" fica apenas na tab **Corte**, "Cerâmico: Em Separação" fica apenas na tab **Separação**.

## Alterações

### 1. `src/components/processes/ProcessBoard.tsx`
Substituir `ORDERED_DISPLAY_STAGES` por uma constante `PROCESS_GROUPS`:

```typescript
const PROCESS_GROUPS = [
  { label: "Inclusão", statuses: ["Aguardando Inclusão"] },
  { label: "Conferência", statuses: ["Aguardando Conferência", "Em Conferência"] },
  { label: "Separação", statuses: ["Cerâmico: Em Separação"] },
  { label: "Corte", statuses: ["Peças: Em Corte"] },
  { label: "Trit. / Homog. / Amostr.", statuses: [
    "Peças: Em Trituração", "Cerâmico: Em Trituração/Homogeneização", "Peças: Em Amostragem"
  ]},
  { label: "Prep. Amostra / Análise", statuses: [
    "Cerâmico: Amostra Enviada ao Lab", "Cerâmico: Lab em Análise", "Cerâmico: Resultado Incluído"
  ]},
  { label: "Precif. / Demonstrativo", statuses: [
    "Peças: Aguardando Demonstrativo", "Cerâmico: Em Precificação",
    "Peças: Pesagem Realizada", "Peças: Peso Divergente"
  ]},
  { label: "Aprovação", statuses: [
    "Peças: Gerar Boleto de Aprovação", "Cerâmico: Gerar Boleto de Aprovação",
    "Peças: Demonstrativo Contestado", "Cerâmico: Demonstrativo Contestado"
  ]},
  { label: "Pagamento", statuses: [
    "Peças: Aprovado - Aguardando Pagamento", "Peças: Pagamento Realizado",
    "Cerâmico: Aprovado" // + paralelo financeiro
  ]},
  { label: "Bags / Exportação", statuses: ["Peças: Alocado ao Bag"] }, // + paralelo operacional
  { label: "Encerrados", statuses: ["Peças: Encerrado", "Cerâmico: Encerrado"] },
];
```

**Lógica de agrupamento:**
- `tasksByGroup` itera as compras filtradas e atribui cada uma ao grupo cujos `statuses` contém `purchase.status`
- Compras em fase paralela (`isInParallelPhase`) vão para "Pagamento" (se sub-fluxo financeiro ativo) e/ou "Bags / Exportação" (se sub-fluxo operacional ativo)
- Compras com status legacy são mapeadas ao grupo equivalente
- Tabs sempre visíveis, com badge de contagem (inclusive 0)
- Default tab = primeiro grupo com itens > 0
- Filtragem por role: admin vê todos os 11 grupos; outros perfis vêm apenas os grupos cujos `statuses` incluem pelo menos um status permitido pelo `STAGE_ROLES`
- Dentro de cada tab, os cards mostram badge do status específico + badge do fluxo (Peças/Cerâmico)

### 2. `src/components/processes/StageActionCard.tsx`
Sem alterações estruturais — já funciona com qualquer status. O `PurchaseSummary` e a lógica de ação continuam iguais.

### 3. `src/lib/purchases.ts`
Sem alterações — `PECAS_FLOW`, `CERAMICO_FLOW`, `CER_FIN_STATUSES`, `CER_OP_STATUSES` já estão exportados.

## Arquivos afetados
| Arquivo | Tipo |
|---------|------|
| `src/components/processes/ProcessBoard.tsx` | Reescrita da lógica de tabs |

