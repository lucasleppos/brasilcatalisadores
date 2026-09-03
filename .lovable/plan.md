# Ordenação e busca nas telas de Processos

## O que muda

1. **Ordem dos cards (crescente por OP)**
   - Em todas as etapas do board de Processos (desktop e mobile), os pedidos passam a ser listados em ordem crescente pelo número da OP (`020926-02` antes de `020926-17`, e datas anteriores antes das mais recentes).
   - Hoje o mobile ordena pela data da última mudança de etapa e o desktop não ordena — ambos passam a usar a mesma regra de OP crescente.

2. **Busca restrita**
   - No campo de busca do mobile ("Buscar fornecedor, nº ou boleto…"), a busca passa a considerar somente o número da OP e o nome do fornecedor. O número do boleto (Syge/ERP) deixa de ser pesquisável.
   - Placeholder ajustado para "Buscar OP ou fornecedor…".

## Detalhes técnicos

- `src/components/processes/MobileProcessBoard.tsx`
  - Substituir o `sort` por `lastChangeDate` por uma comparação de `purchaseNumber` no formato `DDMMYY-NN`: converter para `YYMMDD` + sequência numérica e comparar (mesma abordagem já usada em `AllocationPanel.tsx`), com fallback para `localeCompare` numérico.
  - Remover `p.erpNumber` do filtro de busca e atualizar o placeholder.
- `src/components/processes/ProcessBoard.tsx`
  - Aplicar a mesma ordenação ao montar `tasksByGroup`.
- Nenhuma alteração de banco, regras de etapa ou cálculos.
