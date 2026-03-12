

# Peso Real por Item — Rastreamento de Perda após Manuseio

## Contexto

Hoje o sistema já rastreia peso declarado vs real no **nível do pedido** (campos `weight_declared`, `weight_real`, `weight_loss` na tabela `purchases`). Com a introdução do catálogo, cada item terá um peso de referência vindo do catálogo. O usuário quer confirmar esse peso após o manuseio físico (abertura das peças, trituração) e contabilizar a perda.

## Alterações

### 1. Banco de dados — `purchase_items`

Adicionar 3 colunas à tabela `purchase_items`:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `catalog_part_id` | uuid (nullable) | Referência à peça do catálogo |
| `weight_real` | numeric (nullable) | Peso real medido após manuseio |
| `weight_loss` | numeric (nullable) | Diferença: peso catálogo − peso real |

O `weight_loss` será calculado automaticamente: `weight (catálogo) - weight_real`.

### 2. `src/lib/purchases.ts` — Tipo e funções

- Adicionar `catalogPartId`, `weightReal`, `weightLoss` ao `PurchaseQuoteItem`
- Criar função `registerItemRealWeight(itemId, weightReal)` que:
  - Busca o peso original do item (do catálogo ou `weight`)
  - Calcula a perda (`weight - weightReal`)
  - Atualiza `weight_real` e `weight_loss` no `purchase_items`

### 3. Integração no Processo — Etapa de Conferência/Pesagem

No `StageActionCard.tsx`, nas etapas relevantes (Conferência, Pesagem, ou etapa dedicada), adicionar:

- Lista dos itens do pedido com peso do catálogo
- Campo para inserir **peso real** de cada item
- Exibição da **perda** em tempo real (com destaque visual se > tolerância)
- Badge de alerta quando há perda significativa

### 4. Visualização da perda — `PurchaseDetail.tsx`

Na tabela de itens do detalhe da compra:
- Nova coluna "Peso Real" (exibida quando preenchido)
- Nova coluna "Perda" com indicador visual (vermelho se perda, verde se ok)

### 5. Resumo do pedido — Totalizadores

No detalhe da compra, exibir totalizadores:
- **Peso total catálogo**: soma dos pesos dos itens
- **Peso total real**: soma dos pesos reais
- **Perda total**: diferença, com % de perda

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| Migração SQL | 3 colunas em `purchase_items` |
| `src/lib/purchases.ts` | Novos campos no tipo + função `registerItemRealWeight` |
| `StageActionCard.tsx` | UI para registrar peso real por item |
| `PurchaseDetail.tsx` | Exibir peso real e perda por item |
| `NewPurchaseDialog.tsx` | Passar `catalogPartId` ao criar item do catálogo |

## Observação

Esta alteração será implementada junto com o módulo Catálogo (plano anterior aprovado). Os campos `weight_real` e `weight_loss` por item só fazem sentido com peças vindas do catálogo, onde há um peso de referência para comparar.

