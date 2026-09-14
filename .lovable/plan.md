# Ajuste de peso real Flex — OP 080926-20

## O que muda

Na compra 080926-20 (FILIAL PALHOÇA TV), o peso real Flex após trituração passa de 9,1 kg para 60,95 kg.

- O peso Carbono após trituração (1,7 kg) fica como está.
- Os pesos extraídos no Corte (Flex 52,3 kg e Carbono 1,6 kg) ficam como estão.
- Nada mais no processo muda: a compra segue disponível para alocação em Bag e ainda não tem material dentro de nenhum Bag.

## Efeito prático

Na tela Alocar Material, a linha Flex desta OP passa a mostrar 60,95 kg, e a divisão proporcional de valor entre Flex e Carbono é recalculada automaticamente a partir dos novos pesos.

## Detalhes técnicos

Atualização de um único registro em `stage_evidence`: `purchase_id = da096e66-00d3-4a40-8376-5a75cef744f6`, `task_key = 'weight_flex_trituracao'`, `value_numeric` de 9.1 para 60.95. Nenhuma mudança de código ou de esquema.
