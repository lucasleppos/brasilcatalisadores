## Objetivo

No fluxo de **Peça** e **Peça em Sacola**: trocar o campo de topo (hoje peso em kg) por **quantidade de peças (unidades)** e tornar o catálogo opcional em toda a jornada.

## 1. Nova compra — campo de topo em unidades

Em `NewPurchaseDialog.tsx`, o bloco "Material a Classificar (opcional)" hoje pede "Peso total recebido (kg)".

- Para tipos **Peça** e **Peça em Sacola**: rótulo passa a "Total de Peças Recebidas (un)", entrada em número inteiro (sem casas decimais), placeholder "0".
- A barra de progresso passa a comparar **soma das quantidades dos itens adicionados** (em vez de soma dos pesos) com o total declarado: "Classificado: X un / Restante: Y un", alerta quando exceder.
- Para **Cerâmico** nada muda (segue peso bruto total em kg, obrigatório).
- O valor continua sendo gravado no mesmo campo da compra (`bulk_weight`), agora interpretado como unidades quando o fluxo é de peças — sem migração de banco.

Em `PurchaseDetail.tsx`, exibir esse valor como "Total de peças: N un" nos fluxos de peça e como "kg" no cerâmico.

## 2. Catálogo opcional

**Na criação da compra:** já é opcional; garantir que o item manual (categoria + quantidade + valor) permaneça válido e que a busca no catálogo continue apenas como atalho de preenchimento.

**Na etapa "Precificar Peças" (`PiecePricingPanel.tsx`):** hoje só é possível adicionar item vindo do catálogo, e a lista exibida filtra apenas itens com `catalog_part_id`.

- Adicionar a opção de **item manual**: campos descrição/categoria, quantidade e valor unitário, com botão "Adicionar" — sem exigir peça do catálogo.
- A busca no catálogo continua disponível como atalho (preenche descrição/peso/PPM).
- A lista "Peças Adicionadas" passa a mostrar **todos** os itens de peça do pedido (catálogo e manuais), com rótulo da descrição quando não houver código de catálogo.
- Total do pedido e remoção de itens seguem funcionando para ambos os casos.

## Detalhes técnicos

- Arquivos: `src/components/purchases/NewPurchaseDialog.tsx`, `src/components/purchases/PurchaseDetail.tsx`, `src/components/processes/PiecePricingPanel.tsx`.
- Itens manuais são gravados em `purchase_items` com `catalog_part_id = null`, `item_type = 'peca'`, usando `category` como descrição.
- Nenhuma alteração de banco de dados é necessária.
