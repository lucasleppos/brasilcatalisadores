

# Adicionar "Material a Classificar" e "Categoria" na inclusão de compras

## Resumo

Duas alterações no fluxo de criação/edição de compra:

1. **Material a Classificar**: campo de peso bruto total do lote recebido. Conforme itens são adicionados (com peso bruto + tara), o saldo restante diminui em tempo real, até zerar (material totalmente triado).

2. **Categoria**: campo de texto livre em cada item adicionado (ex: "Fundo", "Colmeia", "Pó fino"), para nomear cada separação.

## Alterações no banco de dados

### Migração 1: Adicionar colunas

```sql
-- Peso total do material recebido antes da classificação
ALTER TABLE purchases ADD COLUMN bulk_weight numeric DEFAULT NULL;

-- Nome/categoria de cada separação dentro da compra
ALTER TABLE purchase_items ADD COLUMN category text DEFAULT NULL;
```

Sem alteração de RLS (políticas existentes já cobrem insert/update).

## Alterações no código

### `src/lib/purchases.ts`
- Adicionar `category?: string` ao `PurchaseQuoteItem`
- Adicionar `bulkWeight: number | null` ao `Purchase`
- Passar `bulk_weight` no `createPurchase` e `updatePurchase`
- Passar `category` no insert/mapping de `purchase_items`

### `src/components/purchases/NewPurchaseDialog.tsx`
- Adicionar estado `bulkWeight` (peso do material a classificar)
- Adicionar estado `addCategory` (campo categoria por item)
- Adicionar `category` ao `PendingItem`

**UI — novo bloco "Material a Classificar"** (acima do bloco "Adicionar Item"):
- Campo: "Peso do Material a Classificar (kg)" — input numérico
- Indicador visual: barra de progresso ou texto mostrando `Restante: X kg` (bulkWeight - soma dos pesos brutos dos itens já adicionados)
- Quando restante = 0: badge verde "Totalmente classificado"
- Quando restante < 0: alerta vermelho "Peso dos itens excede o material"

**UI — campo "Categoria"** (dentro do bloco "Adicionar Item"):
- Input de texto com placeholder "Ex: Colmeia, Fundo, Pó fino..."
- Aparece para todos os tipos de item (peça, peça_sacola, cerâmico)
- Exibido na tabela de itens como coluna extra

**Cálculo do saldo restante:**
```
somaUsada = items.reduce((s, item) => {
  if (item.calcInput) return s + item.calcInput.grossWeight;  // cerâmico/sacola calc
  if (item.weight) return s + item.weight;                     // sacola simples
  return s;  // peça sem peso — não consome do bulk
}, 0);
restante = bulkWeight - somaUsada;
```

### `src/components/purchases/PurchaseDetail.tsx`
- Exibir `bulkWeight` no resumo da compra
- Exibir `category` na listagem de itens

### Tabela de itens na dialog
Adicionar coluna "Categoria" entre "Tipo" e "Detalhe".

## Comportamento
- `bulkWeight` é **opcional** — se não preenchido, o fluxo funciona como antes
- Ao editar compra, `bulkWeight` é carregado e o saldo recalculado
- Peças (sem peso) não consomem do saldo de material a classificar

## Arquivos afetados

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | 2 colunas novas |
| `src/lib/purchases.ts` | Tipos + CRUD |
| `src/components/purchases/NewPurchaseDialog.tsx` | UI + lógica |
| `src/components/purchases/PurchaseDetail.tsx` | Exibição |

