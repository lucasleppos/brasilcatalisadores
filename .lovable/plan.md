# Alterar peso real pós-moagem — compra 030926-13

## Pedido
Alterar o peso real após moagem (Flex) da compra **030926-13** (EDUARDO APARECIDO DA SILVA, comprador MARCOS, Flex, mostra 7,6 real na tela) para **45,5 kg**.

## Situação atual (verificado no banco)
- Compra id `58053d84-b5c4-42cd-8e72-4169a55c150c`, fluxo "Peças", status "Peças: Alocado ao Bag".
- Pesos registrados em stage_evidence:
  - `weight_flex_extraido` (entrada): **45,5 kg**
  - `weight_flex_trituracao` (pós-moagem, o "real" da tela): **7,6 kg**

## Alteração proposta
- `stage_evidence.task_key = 'weight_flex_trituracao'` → `value_numeric = 45.5` na compra 030926-13.
- Observação: o peso de entrada (extraído) já é 45,5 kg — após a alteração, entrada e pós-moagem ficarão iguais.

## Passos
1. Aplicar o UPDATE acima no banco.
2. Conferir no banco os dois valores resultantes.
3. Você valida na tela (o card da compra deve passar a mostrar 45,5 real após recarregar).

## Fora de escopo
- Nenhuma alteração de código; apenas este dado desta compra.
