

# Ajustes no PDF do Demonstrativo

## 1. Remover linha de Recuperação no PDF

No arquivo `supabase/functions/generate-demonstrativo-pdf/index.ts`, linha 228, remover a entrada de recuperação do array `pricingInfo`:

```typescript
// Remover esta linha:
`Recuperação Pt: ${fmt(Number(settings.recovery_pt))}% | Pd: ${fmt(Number(settings.recovery_pd))}% | Rh: ${fmt(Number(settings.recovery_rh))}%`,
```

O array `pricingInfo` ficará apenas com cotações de metais e câmbio.

## 2. Renomear arquivo para incluir Boleto Syge, Nº Pedido e Fornecedor

### Edge Function (servidor)
Linha 294-295: mudar o `filename` para usar `erp_number`, `purchase_number` e `supplier_name`:

```typescript
const safeName = (s: string) => (s || "").replace(/[^a-zA-Z0-9-]/g, "_").replace(/_+/g, "_");
const filename = `${safeName(purchase.erp_number)}_${safeName(purchase.purchase_number)}_${safeName(purchase.supplier_name)}.pdf`;
```

### Client-side (3 arquivos)
Atualizar o `a.download` em todos os locais que fazem download para usar o mesmo padrão com `purchase.erpNumber`, `purchase.purchaseNumber` e `purchase.supplierName`:

- `StageActionCard.tsx` — 4 ocorrências (linhas 257, 281, 368, 392)
- `PurchaseSummary.tsx` — 2 ocorrências (linhas 37, 56)
- `PurchaseDetail.tsx` — 1 ocorrência (linha 308)

O nome ficará no formato: `BoletoSyge_NºPedido_Fornecedor.pdf`

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/generate-demonstrativo-pdf/index.ts` | Remover linha de recuperação; alterar filename |
| `src/components/processes/StageActionCard.tsx` | Atualizar `a.download` em 4 pontos |
| `src/components/processes/PurchaseSummary.tsx` | Atualizar `a.download` em 2 pontos |
| `src/components/purchases/PurchaseDetail.tsx` | Atualizar `a.download` em 1 ponto |

