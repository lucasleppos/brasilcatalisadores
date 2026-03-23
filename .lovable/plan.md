

# Fluxo Peças: Pular etapas iniciais + Seleção de peças na Precificação

## 1. Criar compra de Peças já em "Em Conferência"

### `src/lib/purchases.ts` — `createPurchase`
- Quando `materialFlow === "pecas"`, o `initialStatus` muda de `"Aguardando Inclusão"` para `"Em Conferência"`
- O `statusHistory` já inclui as 3 transições: Aguardando Inclusão → Aguardando Conferência → Em Conferência (registradas automaticamente)

### Impacto no `ProcessBoard`
- Pedidos de peças não aparecerão mais nas abas "Inclusão" e "Conferência aguardando" — irão direto para "Conferência"

## 2. Na etapa "Peças: Aguardando Demonstrativo" — tela de seleção de peças do catálogo

Atualmente, quando o pedido chega em "Aguardando Demonstrativo", o card mostra apenas botões de PDF/WhatsApp/Avançar. O usuário quer que **antes de gerar o demonstrativo**, apareça uma interface para selecionar peças do catálogo, definir quantidade e valor, e adicionar ao pedido.

### Novo componente: `src/components/processes/PiecePricingPanel.tsx`
- Integra o `PartSearch` (já existe) para buscar peças no catálogo
- Ao selecionar uma peça, ela aparece numa área de "staging" (não é adicionada automaticamente)
- Na área de staging: campos de **Quantidade** e **Valor (R$)** editáveis
- Botão **"Adicionar"** confirma e insere como `purchase_item` vinculado ao pedido
- Lista os itens já adicionados ao pedido (com opção de remover)
- O total do pedido é recalculado conforme itens são adicionados
- Botões de PDF/WhatsApp/Avançar ficam abaixo, habilitados somente quando há itens precificados

### `src/components/processes/StageActionCard.tsx`
- Quando `purchase.status === "Peças: Aguardando Demonstrativo"`, renderizar o `PiecePricingPanel` acima dos botões de PDF
- Passar `purchase` e callback `onCompleted` para reload

### `src/lib/purchases.ts`
- Nova função `addItemToPurchase(purchaseId, item)`: insere na tabela `purchase_items` e recalcula `total_brl` no pedido
- Nova função `removeItemFromPurchase(purchaseId, itemId)`: remove e recalcula

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/purchases.ts` | `createPurchase` com status inicial "Em Conferência" para peças; `addItemToPurchase`; `removeItemFromPurchase` |
| `src/components/processes/PiecePricingPanel.tsx` | **Novo** — busca catálogo, staging com qty/valor, adiciona ao pedido |
| `src/components/processes/StageActionCard.tsx` | Renderizar `PiecePricingPanel` na etapa "Aguardando Demonstrativo" |

