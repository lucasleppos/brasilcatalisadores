# Reabrir o BAG-001

O BAG-001 (Brasil Flex 01) está com status "Fechado", fechado hoje às 14:56 (horário de Brasília), com 65,4200 kg e R$ 9.822,60 alocados.

## O que será feito

- Voltar o BAG-001 para o status "Aberto".
- Limpar a data de fechamento, para que o bag volte a se comportar como um bag em uso.
- Os itens já alocados e os valores permanecem exatamente como estão.

Depois disso o BAG-001 volta a aparecer como aberto na tela de Bags e na tela de Alocar Material, permitindo continuar a alocação e também remover itens, se necessário.

## Observação

Este é um ajuste pontual apenas neste bag. Nenhuma tela ou regra do sistema será alterada; se um bag for fechado por engano novamente, o ajuste precisará ser pedido de novo.

## Detalhes técnicos

Atualização de dados na tabela `bags` para o registro `BAG-001` (`57038290-e46d-4c43-8862-78af8e923d90`): `status = 'Aberto'`, `closed_at = null`.
