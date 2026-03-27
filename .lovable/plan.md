

# Fase 4 — Precificação Inteligente Peça em Sacola (Revisado)

## Resumo

Após o laboratório, o admin abre um painel de comparação onde cada peça conferida mostra PPMs do catálogo vs lab com diferenças em %. Os **valores são inseridos manualmente** (preço fixo catálogo e valor calculadora). O admin seleciona qual usar por peça. Ao confirmar, o sistema separa as peças em dois blocos (catálogo fixo vs calculadora) e salva um campo `pricing_source` em cada item para uso no PDF do demonstrativo.

## Telas

```text
CARD COMPACTO
┌─────────────────────────────────────────────────┐
│  Fornecedor ABC          5 pç / 3,2 kg          │
│  25/03/2026 - 01          ⏱ 2h                  │
│  [ ⚖️ Comparar e Precificar ]                   │
└─────────────────────────────────────────────────┘

DIALOG (fullscreen-like, max-w-6xl)
┌──────────────────────────────────────────────────────────┐
│  Comparação Catálogo vs Laboratório                      │
│  Fornecedor ABC  |  25/03/2026 - 01  |  5 peças         │
│                                                          │
│  ┌─ Barra de filtro/busca ─────────────────────────────┐│
│  │ [🔍 Buscar peça...]  Pendentes(3) Definidas(2) Todas││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  ┌─ TABELA com scroll ─────────────────────────────────┐│
│  │ #  Peça        Peso   Pt Cat  Pt Lab  Δ%   ...     ││
│  │                       Pd Cat  Pd Lab  Δ%           ││
│  │                       Rh Cat  Rh Lab  Δ%           ││
│  │    [R$ Catálogo: ___] [R$ Calc: ___]  Δ% valor     ││
│  │    ○ Catálogo  ● Calculadora                        ││
│  │─────────────────────────────────────────────────────││
│  │ (próxima peça...)                                   ││
│  │ ...scroll para 100+ peças...                        ││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  Progresso: ██████░░░░  3/5    Total: R$ 412,50          │
│  [Salvar e Continuar]  [Confirmar Precificação 🔒]       │
└──────────────────────────────────────────────────────────┘
```

### Design para volume (100+ peças)
- Dialog `max-w-6xl` com layout em tabela compacta (não cards individuais)
- Cada peça ocupa ~3-4 linhas na tabela (PPMs + valores + seleção)
- `ScrollArea` com altura fixa para a lista
- Filtros rápidos: "Pendentes" / "Definidas" / "Todas" + busca por código
- Linhas com zebra-striping e destaque visual para pendentes

### Campos manuais (não calculados)
- Dois inputs por peça: "Valor Catálogo (R$)" e "Valor Calculadora (R$)"
- Diferença em % entre os dois valores exibida ao lado
- PPMs do catálogo e lab são informativos (read-only), com Δ% colorido
- Peças sem `catalog_part_id`: campo catálogo desabilitado, só calculadora

### Separação em blocos após confirmação
- Salva `pricing_source = 'catalogo' | 'calculadora'` em cada `purchase_item`
- No PDF do demonstrativo: duas seções separadas
  - **Bloco 1 — Preço Fixo (Catálogo)**: lista peças com código, peso, valor — SEM PPMs
  - **Bloco 2 — Preço Calculado**: lista peças com código, peso, PPMs lab, valor

## Alterações técnicas

### 1. Migração SQL
Adicionar coluna `pricing_source text` na tabela `purchase_items` (valores: `'catalogo'`, `'calculadora'`, ou null).

### 2. Novo componente: `SacolaPricingPanel.tsx`
- Carrega itens de conferência + lab results + catalog parts
- Tabela compacta com scroll, filtros e busca
- Inputs manuais para valor catálogo e calculadora por peça
- Radio button de seleção por peça
- "Confirmar" atualiza `total_value`, `pricing_source` de cada item e recalcula `total_brl`
- Botão bloqueado até todas as peças terem seleção

### 3. `StageActionCard.tsx`
- Na etapa "Peças: Aguardando Demonstrativo", se `peca_sacola`: renderizar `SacolaPricingPanel` em vez de `PiecePricingPanel`

### 4. `src/lib/purchases.ts`
- Helper `batchUpdateItemPricing(purchaseId, updates: {itemId, totalValue, pricingSource}[])` para salvar valores e recalcular total

### 5. Edge function `generate-demonstrativo-pdf`
- Detectar itens com `pricing_source`
- Separar em dois blocos no PDF:
  - Catálogo: sem PPMs, mostra código + peso + valor fixo
  - Calculadora: com PPMs do lab + valor calculado

| Arquivo | Ação |
|---------|------|
| Migração SQL | Coluna `pricing_source` em `purchase_items` |
| `src/components/processes/SacolaPricingPanel.tsx` | **Novo** |
| `src/components/processes/StageActionCard.tsx` | Condicional sacola |
| `src/lib/purchases.ts` | Helper batch update |
| `supabase/functions/generate-demonstrativo-pdf/index.ts` | Dois blocos no PDF |

