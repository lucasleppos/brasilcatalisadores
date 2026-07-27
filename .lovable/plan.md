## Objetivo

Na Nova Compra, os fluxos **Peça** e **Peça em Sacola** passam a exigir apenas:
fornecedor, foto do material, tipo de material e Total de Peças Recebidas (un).
O bloco "Adicionar Item" (catálogo, categoria, quantidade, peso, valor) sai da criação e a classificação dos itens passa para a etapa de **Conferência** (a ser alterada em seguida).

## Alterações (nesta etapa: apenas a tela de compra)

Arquivo: `src/components/purchases/NewPurchaseDialog.tsx`

1. Ocultar o bloco "Adicionar Item" e a tabela/resumo de itens quando o tipo for `peca` ou `peca_sacola` na criação (mesmo comportamento que já existe hoje para Cerâmico). Em modo de **edição** o bloco continua disponível, para não quebrar compras antigas.
2. Tornar "Total de Peças Recebidas (un)" **obrigatório** nesses fluxos (rótulo com `*`, bloqueio do botão Criar Compra e mensagem de validação quando vazio ou zero).
3. Remover a barra de progresso "Classificado / Restante" da criação (não há mais itens a classificar nesse momento); ela permanece apenas no modo edição.
4. Ajustar `handleConfirm`: para `peca` / `peca_sacola` sem itens, criar a compra com um item marcador único do tipo escolhido (`{ itemType: 'peca' | 'peca_sacola', quantity: 1 }`), exatamente como já é feito no fluxo Cerâmico, gravando `bulk_weight` com o total de peças e anexando as fotos como evidência de Recebimento.
5. Requisitos para habilitar "Criar Compra" nesses fluxos: fornecedor + ao menos 1 foto + total de peças > 0. Boleto Syge segue opcional.

## Detalhes técnicos

- O item marcador é necessário porque `determineMaterialFlow` deriva `material_flow` dos itens, e o `StageActionCard` decide entre painel de sacola e painel de peça via `hasSacolaItems` (`items.some(i => i.itemType === 'peca_sacola')`). Sem ele a compra ficaria sem fluxo.
- Assim como no cerâmico, esse marcador deverá ser **removido ao salvar os itens reais na conferência**, para não gerar linha "1 pç pendente" no demonstrativo. Essa remoção entra na próxima alteração (etapa de Conferência).
- `bulk_weight` (numeric) segue sendo o campo que guarda o total de peças recebidas no fluxo de peças; a exibição em `PurchaseDetail` já mostra "un" nesses fluxos.

## Fora do escopo desta etapa

A tela de Conferência (`SacolaConferenciaPanel` e o equivalente para Peça) — hoje o `SacolaConferenciaPanel` compara as peças conferidas com a quantidade declarada nos itens; ela passará a comparar com `bulkWeight` e a permitir cadastrar os itens (catálogo opcional, categoria, quantidade, peso). Isso será planejado logo após a aprovação desta alteração.
