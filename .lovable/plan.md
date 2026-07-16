## Remover item placeholder de Cerâmico ao separar em lotes

### Causa raiz

Ao criar uma compra do tipo Cerâmico, `src/components/purchases/NewPurchaseDialog.tsx` (linha 267) insere um item placeholder:

```ts
items: [{ id: crypto.randomUUID(), itemType: "ceramico", quantity: 1 }]
```

Ele existe só para que `determineMaterialFlow` classifique a compra como fluxo cerâmico. Como não tem peso nem valor, aparece no demonstrativo como **"Cerâmico — 1 pç — Pendente"** e como linha extra na tabela de itens da compra.

Depois, na Conferência (`src/components/processes/CeramicoConferenciaPanel.tsx`, `persistAll`, linhas 140–162), o painel apaga apenas os itens `item_type='ceramico' AND category='conferencia'` antes de reinserir os lotes. O placeholder original (sem `category`) sobrevive — daí o item fantasma.

### Correção pontual

Arquivo único: `src/components/processes/CeramicoConferenciaPanel.tsx`, função `persistAll`.

- Alterar o `DELETE` inicial para remover **todos** os itens cerâmicos da compra (não só os de `category='conferencia'`), garantindo que o placeholder criado no momento da compra seja removido quando os lotes são efetivamente separados em grupos.

Antes:
```ts
await supabase
  .from("purchase_items")
  .delete()
  .eq("purchase_id", purchase.id)
  .eq("item_type", "ceramico")
  .eq("category", "conferencia");
```

Depois:
```ts
await supabase
  .from("purchase_items")
  .delete()
  .eq("purchase_id", purchase.id)
  .eq("item_type", "ceramico");
```

### Por que não mexer na criação da compra

`determineMaterialFlow` (`src/lib/purchases.ts` linha 232) decide o fluxo a partir dos itens. Se remover o placeholder na criação sem refatorar essa função, a compra vira fluxo "peças". A correção no momento da separação em grupos é exatamente o que o usuário pediu ("retirada no momento que temos a separação em grupos") e não afeta a decisão de fluxo, que já foi persistida em `purchases.material_flow` na criação.

### Resultado esperado

- Compra Cerâmica é criada normalmente (fluxo cerâmico preservado via `material_flow`).
- Ao salvar a Conferência com os lotes, o placeholder some.
- Tabela de itens da compra e demonstrativo mostram apenas os lotes reais (`conferencia`), sem linha "1 pç Pendente".

### Fora do escopo

- Nenhuma mudança em criação de compra, cálculo, PDF, fluxo de peças ou outras etapas.
