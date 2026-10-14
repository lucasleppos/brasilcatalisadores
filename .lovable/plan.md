## Corrigir peso após trituração — Compra 091026-07

Alterar somente o registro "Peso Flex após trituração" (etapa Trituração e Amostragem) de **12,85 kg** para **57,75 kg**.

- Nada mais muda: valor da compra (R$ 40.882,01), Peso Real Flex extraído (58,45 kg), status, peças e demais registros ficam iguais.
- A compra ainda não tem material dentro de nenhum bag, então nenhum bag é afetado.

### Detalhe técnico
`UPDATE stage_evidence SET value_numeric = 57.75 WHERE id = '7d520fed-d9fc-457d-b39d-4136d224ac5c';` (task_key `weight_flex_trituracao`).
