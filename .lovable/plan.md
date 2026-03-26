

# Fase 1 — Remover calculadora de "Peça em Sacola" na criação

## O que muda

Na tela de criação/edição de compra, ao selecionar "Peça em Sacola", o switch "Usar calculadora (PPMs)" será removido. O formulário exibirá apenas **Quantidade** + **Peso (kg)** (opcional). O cálculo por PPM só acontecerá em etapas futuras (após análise do laboratório).

## Alterações técnicas

### 1. `src/components/purchases/NewPurchaseDialog.tsx`

- **Remover o switch** de calculadora para `peca_sacola` (linhas 489-497)
- **Simplificar `showSimpleFields`/`showCalcFields`**: `peca_sacola` sempre usa campos simples (quantidade + peso), nunca calculadora
  - `showSimpleFields = addType === "peca" || addType === "peca_sacola"`
  - `showCalcFields = addType === "ceramico"`
- **Remover referências a `sacolaUseCalc`** nas condições de `runCalcPreview` (linha 173) e `addItem` (linha 181)
- **Remover o campo "Valor total (R$)"** quando `peca_sacola` — o valor virá depois da análise, não na criação
- O state `sacolaUseCalc` pode permanecer (usado internamente) mas ficará sempre `false` para sacola

### 2. `src/lib/purchases.ts` — `determineMaterialFlow`

- Atualizar para que `peca_sacola` **nunca** gere fluxo cerâmico na criação (a condição `i.itemType === "peca_sacola" && i.input && !i.totalValue` não será mais atingida, mas convém limpar para clareza)
- Manter retornando `"pecas"` para `peca_sacola` por enquanto (o fluxo sacola será implementado em fase futura)

| Arquivo | Mudança |
|---------|---------|
| `src/components/purchases/NewPurchaseDialog.tsx` | Remover switch calculadora e campo valor para `peca_sacola` |
| `src/lib/purchases.ts` | Limpar condição em `determineMaterialFlow` |

