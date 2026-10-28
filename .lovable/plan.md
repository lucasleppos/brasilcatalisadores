# Alterar capacidade de 4 bags para 1.100 kg

Alterar somente a capacidade (peso limite) de 1.000 kg para 1.100 kg nos bags:
- BAG-030 (Brasil Flex CR, Fechado)
- BAG-031 (TV FLEX 2, Aberto)
- BAG-033 (Brasil Flex CR 2, Aberto)
- BAG-034 (Brasil Flex CR 3, Aberto)

Nada mais muda: alocações, pesos alocados, valores, status e histórico ficam iguais.

## Detalhes técnicos
`UPDATE bags SET max_weight = 1100 WHERE bag_number IN ('BAG-030','BAG-031','BAG-033','BAG-034');` e conferir em seguida que total_weight/total_paid_brl e bag_items não mudaram.
