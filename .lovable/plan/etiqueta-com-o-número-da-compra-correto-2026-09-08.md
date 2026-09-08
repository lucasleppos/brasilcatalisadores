# Etiqueta com o número da compra correto

Hoje a etiqueta monta a data ao contrário (ano-mês-dia), por isso a compra 020926-05 sai impressa como LOT-260902-05.

## Comportamento

- A etiqueta passa a usar exatamente o número da compra: a compra 020926-05 imprime LOT-020926-05.
- Vale para a etiqueta de ENTRADA e para as etiquetas por grupo da Conferência (Cerâmico, Peças e Peça em Sacola).
- O QR continua apontando para a mesma compra.

## Detalhes técnicos

- `src/lib/labels.ts`: `buildLabelCodeDisplay` e `buildLabelCode` passam a usar o próprio `purchaseNumber` (formato DDMMYY-NN) — `LOT-<purchaseNumber sanitizado>` e, no caso de `buildLabelCode`, com o sufixo de sequência `-NN`. Fallback pela data apenas se o número não seguir o padrão.
- Etiquetas já impressas com o formato antigo continuam legíveis pela busca por lote (o parâmetro `lote` é apenas usado como filtro), mas os códigos novos ficarão no formato da compra.
- Nenhuma alteração de banco, etapas ou cálculo.
