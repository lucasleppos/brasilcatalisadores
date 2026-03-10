

# Converter todos os campos numéricos para `type="text" inputMode="decimal"` e usar 4 casas decimais em pesos/PPMs

## Problema

Campos `type="number"` no celular não permitem digitar vírgula. Apenas o campo **Tara** (que já usa `type="text" inputMode="decimal"`) funciona corretamente. Todos os campos numéricos do sistema precisam aceitar vírgula.

## Solução

### 1. Criar helper `parseNum` em `src/lib/utils.ts`

Função que converte string com vírgula para número:
```typescript
export const parseNum = (s: string) => parseFloat(s.replace(",", ".")) || 0;
```

### 2. Converter TODOS os `type="number"` para `type="text" inputMode="decimal"`

Cada campo numérico será alterado de:
```tsx
<Input type="number" value={val || ""} onChange={e => setVal(parseFloat(e.target.value) || 0)} />
```
Para:
```tsx
<Input type="text" inputMode="decimal" value={val} onChange={e => setVal(e.target.value.replace(/[^0-9.,]/g, ""))} />
```

Os estados passam de `number` para `string`. A conversão para número acontece apenas no momento de uso (cálculos, submit).

### 3. Exibição com 4 casas decimais para pesos e PPMs

Onde exibimos pesos e PPMs, usar `fmtNum(valor, 4)` em vez de `fmtNum(valor, 2)`.

## Todos os campos afetados (por arquivo)

| Arquivo | Campos |
|---------|--------|
| **NewPurchaseDialog.tsx** | Peso total recebido, Quantidade de peças, Peso (kg), Valor total (R$), Peso Bruto (kg), Pt/Pd/Rh (ppm) — **7 campos** |
| **CalculatorPage.tsx** | Preço Manual, Peso Bruto, Tara, Pt/Pd/Rh (ppm), Margem %, Pt/Pd/Rh ($/ozt) — **9 campos** |
| **SettingsPage.tsx** | Todos os campos do componente `Field` — **~15 campos** (alteração no componente `Field` interno) |
| **SupplierForm.tsx** | Margem (%) — **1 campo** |
| **BagAnalysisPanel.tsx** | Pt/Pd/Rh provisórios, Pt/Pd/Rh refinador, Valor Total Refinador — **7 campos** |
| **NewBagDialog.tsx** | Peso Máximo (kg) — **1 campo** |

**Total: ~40 campos em 6 arquivos.**

### 4. Reverter auto-`inputMode` no componente `Input`

Como todos os campos passarão a usar `type="text" inputMode="decimal"` explicitamente, a lógica automática `inputMode ?? (type === "number" ? "decimal" : undefined)` no `Input` base pode ser removida (ficará sem efeito).

