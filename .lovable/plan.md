

# Implementação: Dialog Grande para Precificação de Peças

## Resumo
Refatorar o `PiecePricingPanel` de um painel inline pequeno para um Dialog grande (`max-w-4xl`) com layout em duas colunas, facilitando a inclusão de 50+ peças.

## Alterações

### `src/components/processes/PiecePricingPanel.tsx` — Refatoração completa

**No card do processo**: renderizar apenas um botão "Precificar Peças" com badge mostrando contagem de itens e total.

**No Dialog** (`max-w-4xl`, `max-h-[85vh]`):
- **Header**: título "Precificação de Peças" + badge de contagem + info do pedido (número + fornecedor + total)
- **Coluna esquerda**: `PartSearch` + card de staging (peça selecionada com campos de quantidade e valor unitário + botão Adicionar)
- **Coluna direita**: `ScrollArea` com lista numerada de peças já adicionadas (quantidade, valor unitário, total, botão remover) + rodapé fixo com total do pedido
- **Footer**: botão "Concluir" para fechar

Novos imports: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`, `DialogDescription`, `ScrollArea`, `X` icon.

O state `open` controla visibilidade do dialog. Toda a lógica de `handleAdd`, `handleRemove`, `handleSelectPart` permanece igual.

### `src/components/processes/StageActionCard.tsx` — Sem mudanças necessárias

O `PiecePricingPanel` já é renderizado como componente filho. Como o dialog é interno ao componente, não precisa de alteração no StageActionCard.

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/components/processes/PiecePricingPanel.tsx` | Refatorar para Dialog com 2 colunas, botão trigger no card |

