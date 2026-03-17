

# Fix: Demonstrativo não é criado ao chegar na etapa de gerar boleto

## Problema

A função `createDemonstrativo` existe em `src/lib/demonstrativos.ts` mas **nunca é chamada** em nenhum lugar do código. Quando o pedido chega na etapa "Gerar Boleto de Aprovação" (ou etapas equivalentes como "Peças: Aguardando Demonstrativo" / "Cerâmico: Em Precificação"), o botão PDF tenta carregar demonstrativos via `loadDemonstrativos`, encontra a tabela vazia e exibe "Nenhum demonstrativo encontrado".

## Solução

### `src/lib/purchases.ts` — `advanceStage`

Ao avançar para uma etapa que exige demonstrativo, criar automaticamente o registro:

- Quando o `next` status for `"Gerar Boleto de Aprovação"`, `"Peças: Aguardando Demonstrativo"`, ou `"Cerâmico: Em Precificação"`:
  1. Buscar o `total_brl` do pedido
  2. Chamar `createDemonstrativo(id, totalBrl)` antes de retornar

### `src/components/processes/StageActionCard.tsx` — fallback

Adicionar lógica de fallback nos handlers de PDF: se `loadDemonstrativos` retorna vazio, criar o demonstrativo na hora com `createDemonstrativo(purchase.id, purchase.totalBrl)` e então gerar o PDF. Isso cobre pedidos que já estão na etapa sem demonstrativo criado.

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/purchases.ts` | Importar `createDemonstrativo`, chamá-lo em `advanceStage` quando status alvo requer demonstrativo |
| `src/components/processes/StageActionCard.tsx` | Fallback: criar demonstrativo se não existir ao clicar PDF |

