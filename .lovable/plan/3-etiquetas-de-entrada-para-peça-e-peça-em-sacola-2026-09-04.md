# 3 etiquetas de entrada para Peça e Peça em Sacola

## Comportamento

- Compras dos tipos **Peças** e **Peças em Sacola**: a impressão da etiqueta de ENTRADA passa a gerar **3 etiquetas idênticas** (3 páginas 100x50 mm), em vez de 1.
- Compras **Cerâmico**: continuam com **1 etiqueta** de entrada, sem alteração.
- Vale tanto para a impressão automática ao criar a compra quanto para a reimpressão pelo botão "Imprimir Etiqueta de Entrada" (card da etapa Conferência e detalhe da compra).
- Conteúdo da etiqueta permanece igual (lote, ENTRADA, comprador, fornecedor, filial, tipo, quantidade declarada, QR).

## Detalhes técnicos

- `src/components/processes/CeramicoLabelPrint.tsx`: em `printEntryLabel`, definir o número de cópias pelo fluxo (`materialFlow === "ceramico" ? 1 : 3`) e passar o array com as cópias para `printLabelSheet`.
- As cópias usam o mesmo `code` (QR idêntico); `printLabelSheet` já deduplica a geração de QR por código e imprime uma página por item, então não há mudança extra.
- Nenhuma alteração de banco, etapas ou cálculo.
