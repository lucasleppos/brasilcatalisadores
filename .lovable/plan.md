# Plano: Precificação Cerâmica — Calcular Valor por Lote

## Problema Atual

Após o lab registrar os PPMs por lote, o fluxo cerâmico avança para "Em Precificação" mas **nenhum cálculo de valor é executado**. O `total_brl` da compra permanece 0, e o PDF do demonstrativo sai sem valores individuais por lote.

O motor de cálculo (`src/lib/calculator.ts`) existe e funciona para peças, mas nunca é chamado para os lotes cerâmicos.

## O que precisa acontecer

Na etapa "Cerâmico: Em Precificação", o sistema deve:

1. Para cada lote conferido (purchase_item com `category = "conferencia"`), usar os PPMs do lab_results e o peso do lote para rodar o cálculo via `calculate()` do `calculator.ts`
2. Salvar o `calc_input`, `calc_result` e `total_value` em cada purchase_item
3. Atualizar o `total_brl` da compra com a soma dos valores
4. O PDF já lê `purchase_items` e `lab_results` — passará a encontrar os valores preenchidos
5. o calculo precisa ser feito levando em consideração a porcentagem (%) de margem de cada fornecedor.

## Abordagem

### Opção proposta: Cálculo automático ao entrar na etapa + painel de revisão

Quando a compra entra em "Cerâmico: Em Precificação":

- Um novo componente `**CeramicoPricingPanel**` é exibido (similar ao SacolaPricingPanel)
- Ele lista todos os lotes com seus PPMs do lab e o valor calculado automaticamente
- O operador pode revisar, ajustar a margem do fornecedor, e confirmar
- Ao confirmar, os valores são salvos nos purchase_items e o total_brl é atualizado

### Componente: `src/components/processes/CeramicoPricingPanel.tsx` (NOVO)

```text
┌──────────────────────────────────────────┐
│  💰 Precificação — Cerâmico              │
│                                          │
│  ┌─ Resumo ────────────────────────────┐ │
│  │ Fornecedor: ABC Metais    PN-00042  │ │
│  │ Margem fornecedor: 15%             │ │
│  │ 2 lotes conferidos | 77,500 kg      │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ── Lotes e Valores ───────────────────  │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │ #1 — Colmeia  (45,500 kg)           │ │
│  │ Pt: 1200 | Pd: 800 | Rh: 50 ppm   │ │
│  │                                     │ │
│  │ Valor calculado:    R$ 12.345,67    │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │ #2 — Fundo  (32,000 kg)             │ │
│  │ Pt: 900 | Pd: 600 | Rh: 30 ppm    │ │
│  │                                     │ │
│  │ Valor calculado:    R$ 8.765,43     │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ─────────────────────────────────────── │
│  TOTAL:              R$ 21.111,10        │
│                                          │
│  [Recalcular]  [Confirmar Precificação]  │
└──────────────────────────────────────────┘
```

Lógica por lote:

- Lê o `weight` do purchase_item e a `tara` do stage_evidence
- Lê os PPMs do `lab_results` vinculado ao `purchase_item_id`
- Busca a margem do fornecedor via `suppliers` table
- Busca as cotações e configurações via `settings`
- Executa `calculate(input, settings)` do `calculator.ts`
- Salva `calc_input`, `calc_result`, `total_value` no purchase_item

### Alterações em `src/components/processes/StageActionCard.tsx`

- Detectar `isCeramicoPricing = purchase.status === "Cerâmico: Em Precificação"`
- Exibir o `CeramicoPricingPanel` nessa etapa (similar a como SacolaPricingPanel é exibido para peças em sacola)

### Alterações no PDF (`supabase/functions/generate-demonstrativo-pdf/index.ts`)

- Nenhuma alteração necessária: o PDF já lê `purchase_items` com `total_value` e `lab_results` com `purchase_item_id` — quando os valores forem preenchidos pelo novo painel, o PDF os exibirá corretamente

## Arquivos


| Arquivo                                             | Ação                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/components/processes/CeramicoPricingPanel.tsx` | Novo                                                                            |
| `src/components/processes/StageActionCard.tsx`      | Editar — integrar CeramicoPricingPanel                                          |
| `src/lib/purchases.ts`                              | Possível ajuste menor — garantir que `total_brl` é atualizado após precificação |
