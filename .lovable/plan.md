

# Formatar todos os números para padrão brasileiro (vírgula decimal)

## Problema
Vários locais usam `.toFixed()` que gera `126.550` (ponto). O padrão brasileiro usa vírgula: `126,550`.

## Solução
Criar uma função utilitária `fmt(n, decimals)` em `src/lib/utils.ts` e substituir todos os `.toFixed()` por ela. Alguns arquivos já têm `fmt` local — serão unificados.

## Todos os campos afetados (por arquivo)

| Arquivo | Campos com `.toFixed()` a corrigir |
|---------|-----|
| **BagCard.tsx** | Peso do bag, progresso |
| **BagDetail.tsx** | Peso total, custo médio/kg, PPMs médios (Pt/Pd/Rh), peso de cada item |
| **BagAnalysisPanel.tsx** | Variação %, custo médio/kg, peso total, PPMs estimados |
| **AllocateMaterialDialog.tsx** | Peso do material, valor pago, peso do bag, peso após alocação |
| **NewPurchaseDialog.tsx** | Peso líquido, valor bruto USD, deduções USD, peso dos itens |
| **PurchaseDetail.tsx** | Peso declarado, peso real, perda |
| **StageActionCard.tsx** | Peso declarado, peso real, perda |
| **PurchaseSummary.tsx** | Peso declarado, peso real |
| **ReportsPage.tsx** | Eixo Y dos gráficos, margem % |

**Total: ~35 ocorrências em 9 arquivos.**

## Alterações

### 1. `src/lib/utils.ts` — adicionar função `fmtNum`
```typescript
export const fmtNum = (n: number, decimals = 2) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
```

### 2. Cada arquivo acima
Importar `fmtNum` de `@/lib/utils` e substituir cada `x.toFixed(N)` por `fmtNum(x, N)`.

Exemplo: `{bag.totalWeight.toFixed(1)} kg` → `{fmtNum(bag.totalWeight, 1)} kg`

Os arquivos que já possuem `fmt` local (CalculatorPage, NewPurchaseDialog) terão essa função removida em favor da compartilhada.

