# Devolver os itens excluídos do BAG-009 para Alocar Material

## O que foi verificado

O BAG-009 está aberto e sem nenhum item (peso 0 e valor R$ 0), ou seja, a exclusão dos três itens já aconteceu.

Os três itens excluídos pertencem todos à compra **040926-13 — JHONISOM JOSUE CUNHA NACIMENTO** (cerâmico):

- 16,6500 kg — R$ 2.706,93
- 6,1250 kg — R$ 2.609,99
- 13,2750 kg — R$ 605,30

Eles não voltaram para a tela Alocar Material porque essa compra foi marcada como encerrada/bag alocado quando terminou a alocação. A tela só lista compras cerâmicas que estão em "Aprovado / Alocando Bag".

## O que será feito

- Voltar a compra 040926-13 para "Aprovado / Alocando Bag".
- Com isso, os três lotes acima reaparecem na aba Alocar Material, prontos para uma nova alocação.
- Os outros dois lotes dessa mesma compra, que continuam no BAG-001 e no BAG-003, seguem alocados e não voltam para a lista.

## Observação

É um ajuste pontual nesta compra. Nenhuma tela ou regra do sistema muda: se algo parecido acontecer em outra compra, o ajuste precisará ser pedido novamente.

## Detalhes técnicos

Atualização de dados em `public.purchases` para `id = f1341621-5802-4d7f-bd32-a1b7b6aa6213`: `status = 'Cerâmico: Aprovado'`, `op_status = 'Alocando Bag'`. Os itens livres reaparecem porque `AllocationPanel.loadAvailableMaterials` filtra apenas os `purchase_item_id` presentes em `bag_items`.
