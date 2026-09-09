# Ajuste de peso real — OP 020926-20

## O que muda

Na compra 020926-20 (MARCOS VINICIUS LOPES DIAS VICENTE), o peso Flex após trituração (etapa de Moagem) passa de 43,8 kg para 58,2 kg.

- O peso de Carbono extraído (2,95 kg) fica como está.
- O peso Flex extraído no Corte (58,5 kg) fica como está.
- A compra continua finalizada e disponível para alocação em Bag; nada mais no processo é alterado.

## Efeito prático

Na tela de Alocar Material, a linha Flex desta OP passa a mostrar 58,2 kg, e a divisão proporcional de valor entre Flex e Carbono é recalculada automaticamente a partir dos novos pesos.

## Detalhes técnicos

Atualização de um único registro em `stage_evidence`: `purchase_id = 5dbfe643-d33c-445f-89e6-418e9613c052`, `task_key = 'weight_flex_trituracao'`, `value_numeric` de 43.8 para 58.2. Nenhuma mudança de código ou de esquema.
