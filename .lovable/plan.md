## Problema confirmado

Nos dados da compra em teste (3 grupos: 13, 5 e 7 kg = 25 kg):

| Campo | Grupo A | Grupo B | Grupo C |
|---|---|---|---|
| `weight` (bruto real) | 13 | 5 | 7 |
| `weight_loss` (tara) | 0,333 | 0,133 | 0,222 |
| `calc_input.grossWeight` | 12,667 | 4,867 | 6,778 |
| `calc_input.tare` | 0 | 0 | 0 |

A precificação já grava `calc_input.grossWeight` como peso **líquido** (bruto − tara) e `tare: 0`. Mas o demonstrativo (diálogo e PDF) trata `calc_input.grossWeight` como bruto e ainda subtrai `weight_loss`:

- Bruto exibido: 24,3120 (na verdade é o líquido)
- Líquido exibido: 23,6240 (tara descontada duas vezes)
- Correto: bruto 25,0000 / tara 0,6880 / líquido 24,3120

## Correção

Usar a tabela `purchase_items` como fonte da verdade dos pesos no demonstrativo:

- bruto = `item.weight`
- tara = `item.weight_loss`
- líquido = bruto − tara (nunca negativo)
- Fallback apenas quando `weight` estiver vazio: usar `calc_input.grossWeight` como bruto e `calc_input.tare` como tara.

## Arquivos afetados

1. `src/components/processes/DemonstrativoViewDialog.tsx` — função `weights()` (linhas ~149-155): inverter a prioridade para `item.weight` / `item.weight_loss`.
2. `supabase/functions/generate-demonstrativo-pdf/index.ts` — mesma lógica nos três pontos (linhas ~84, ~88-89 e ~326-327), extraída numa função auxiliar única para evitar divergência. Redeploy da função.

Nenhuma alteração de cálculo de preço: os valores em R$ continuam baseados no peso líquido, que é o que a precificação já usou (12,667 / 4,867 / 6,778) — apenas a exibição de bruto/tara/líquido é corrigida.
