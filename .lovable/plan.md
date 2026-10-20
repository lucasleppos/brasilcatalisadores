## Corrigir peso após trituração — Compra 131026-18

Alterar somente o registro "Peso Flex após trituração" (etapa Trituração e Amostragem) de **4,55 kg** para **37,10 kg**.

- Nada mais muda: valor da compra (R$ 37.447,49), Peso Real Flex extraído (37,05 kg), foto, status e demais registros ficam iguais.

### Detalhe técnico
`UPDATE stage_evidence SET value_numeric = 37.1 WHERE id = '50571c47-f9f5-4435-96ce-64ae074b572e';` (task_key `weight_flex_trituracao`).
