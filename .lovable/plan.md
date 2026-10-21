## Corrigir peso após trituração — Compra 131026-12

Alterar somente o registro "Peso Flex após trituração" (etapa Trituração e Amostragem) de **39,90 kg** para **58,60 kg**.

- Nada mais muda: valor da compra (R$ 38.834,28), Peso Real Flex extraído (59,20 kg), status e demais registros ficam iguais.

### Detalhe técnico
`UPDATE stage_evidence SET value_numeric = 58.6 WHERE id = '541de77a-c66e-4bc2-9eb2-399a228332f4';` (task_key `weight_flex_trituracao`).
