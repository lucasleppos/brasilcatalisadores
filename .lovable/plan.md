

# Duas alterações pontuais

## 1. Renomear status "Demonstrativo Enviado" → "Gerar Boleto de Aprovação"

Substituir todas as ocorrências em `src/lib/purchases.ts` e `src/components/processes/StageActionCard.tsx`:

- `"Peças: Demonstrativo Enviado"` → `"Peças: Gerar Boleto de Aprovação"`
- `"Cerâmico: Demonstrativo Enviado"` → `"Cerâmico: Gerar Boleto de Aprovação"`
- Atualizar a verificação `isDemonstrative` no StageActionCard para usar `"Gerar Boleto de Aprovação"` em vez de `"Demonstrativo Enviado"`
- Atualizar a cor no `getStatusColor` para o novo nome

## 2. Disponibilizar botão de PDF a partir da etapa de Precificação

No `StageActionCard.tsx`, expandir a condição de visibilidade dos botões PDF/WhatsApp para incluir os estados anteriores ao envio do demonstrativo:

- `"Peças: Aguardando Demonstrativo"` — já pode gerar PDF para revisão interna
- `"Cerâmico: Em Precificação"` — idem
- Além dos estados `"Gerar Boleto de Aprovação"` (demonstrativo enviado)

A lógica de PDF no detalhe da compra (`PurchaseDetail.tsx`) já mostra para todos os demonstrativos versionados — sem alteração necessária.

## Arquivos afetados

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/purchases.ts` | Renomear status em arrays, roles, e getStatusColor |
| `src/components/processes/StageActionCard.tsx` | Renomear check + expandir visibilidade PDF |

