## Corrigir peso após trituração — Compra 131026-08

Alterar somente o registro "Peso Flex após trituração" (etapa Trituração e Amostragem) de **34,25 kg** para **42,5 kg**.

- Nada mais muda: valor da compra (R$ 26.732,84), Peso Real Flex extraído (42,8 kg), status, peças e demais registros ficam iguais.
- A compra ainda não tem material dentro de nenhum bag, então nenhum bag é afetado.

### Detalhe técnico
`UPDATE stage_evidence SET value_numeric = 42.5 WHERE id = '30353351-adb9-4350-96cd-5a02c80b0719';` (task_key `weight_flex_trituracao`).
