# Etiqueta de Entrada na criação da compra

Hoje o material só recebe etiqueta na Conferência. A proposta é emitir uma **Etiqueta de Entrada** já no momento da inclusão da compra, para que o volume físico fique identificado desde a chegada.

## Comportamento

1. Ao confirmar a criação de uma nova compra (qualquer fluxo: Cerâmico, Peças ou Peças em Sacola), o sistema salva a compra e abre automaticamente a impressão de **1 etiqueta de entrada** (mesmo formato térmico 100x50 mm já usado na Conferência).
2. Se o operador cancelar a impressão, nada é perdido: a etiqueta pode ser reimpressa depois pelo botão **Imprimir Etiqueta de Entrada** no card da compra em Conferência e na tela de detalhe da compra.
3. A etiqueta de entrada não substitui as etiquetas por grupo/lote da Conferência — elas continuam sendo geradas em 3 cópias como hoje.

## Conteúdo da etiqueta de entrada

- Código do lote: `LOT-AAMMDD-NN` (mesmo padrão da compra) com marcação **ENTRADA**
- Comprador
- Fornecedor
- Tipo: Cerâmico / Peças / Peças em Sacola
- Cerâmico: Peso Bruto declarado (kg). Peças e Sacola: quantidade declarada (un)
- QR Code apontando para a compra, igual ao das etiquetas atuais

## Detalhes técnicos

- `CeramicoLabelPrint.tsx`: adicionar campos opcionais `stageLabel` (ex.: "ENTRADA") e `qtyDeclared` ao `LabelData`, renderizados no mesmo grid; nenhuma etiqueta existente muda de aparência.
- Novo helper `buildEntryLabel(purchase)` em `src/lib/labels.ts` que monta o `LabelData` de entrada a partir dos dados da compra (código via `buildLabelCode(..., 0)`, display via `buildLabelCodeDisplay`).
- `NewPurchaseDialog.tsx`: após o `createPurchase` bem-sucedido (e apenas quando não é edição, e quando não é uma criação duplicada detectada), chamar `printLabelSheet([buildEntryLabel(purchase)])`.
- `StageActionCard.tsx` (etapa Conferência) e `PurchaseDetail.tsx`: botão de reimpressão usando o mesmo helper.
- Sem alteração de banco de dados, de fluxo de etapas ou de cálculo.
