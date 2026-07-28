## Objetivo

No módulo **Concluídos**, permitir expandir cada compra para ver, item a item (grupo cerâmico ou peça), o peso, o valor e **em qual bag** cada um foi alocado.

## Prévia (como vai ficar)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ▸  28/07/2026-01  3333  Cleusa de Fatima  Marcos  15,000 kg  R$ 14.607,89 …  │
├──────────────────────────────────────────────────────────────────────────────┤
│ ▾  27/07/2026-02  4444  Cleusa de Fatima  Marcos  6 peças    R$ 6.449,28  …  │
│   ┌────────────────────────────────────────────────────────────────────────┐ │
│   │ Detalhamento dos materiais                                             │ │
│   │ Material              Qtd   Peso alocado   Valor        Bag   Alocado  │ │
│   │ Cód. 1234 · Ref. AB    3 un   3,450 kg (real) R$ 3.100,00 BAG-002 27/07│ │
│   │ Cód. 5678 · Ref. CD    3 un   3,450 kg (real) R$ 3.349,28 BAG-002 27/07│ │
│   │ ─────────────────────────────────────────────────────────────────────  │ │
│   │ Total: 6 un · 6,900 kg · R$ 6.449,28        Bags: BAG-002              │ │
│   └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

Para cerâmico as linhas mostram **Grupo 01 / Grupo 02 …** com peso bruto, tara, peso líquido e o bag correspondente. Itens ainda não alocados aparecem com badge âmbar **"Aguardando alocação"** na coluna Bag.

## Alterações

1. **`src/pages/CompletedPage.tsx`**
   - Nova coluna inicial com botão chevron (`ChevronRight`/`ChevronDown`) por linha; estado `expandedIds: Set<string>`.
   - Ao expandir pela primeira vez, carrega sob demanda os `purchase_items` da compra e os `bag_items` correspondentes (join com `bags` para número/rótulo), com cache em memória.
   - Renderiza uma `TableRow` extra com `colSpan` contendo a tabela de detalhamento.

2. **Novo componente `src/components/purchases/CompletedDetailRow.tsx`**
   - Recebe a compra e renderiza o detalhamento: rótulo do material (Código/Referência para peças, Grupo N para cerâmico), quantidade, peso alocado (com marcação "(real)" quando vier do peso pós-trituração), valor pago, badge do bag e data de alocação.
   - Linha de totais no rodapé e lista consolidada de bags.
   - Usa os helpers já existentes (`getItemLabel`, `fmtBrl`, formatação BR com 3–4 casas).

3. Sem mudanças de banco e sem alteração das regras de negócio — apenas leitura e apresentação.

## Detalhe técnico

Os dados vêm de `purchase_items` (peso, `weight_loss` = tara, `calc_result`, `catalog_part_id`) e de `bag_items` (peso alocado, `paid_value`, `allocated_at`) unidos a `bags` (`bag_number`, `bag_label`). A correspondência é por `bag_items.purchase_item_id`.
