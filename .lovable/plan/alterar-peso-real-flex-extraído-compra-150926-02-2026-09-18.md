# Alterar Peso Real Flex extraído — compra 150926-02

## Pedido
Alterar o registro **Peso Real Flex extraído** da compra **150926-02** (FILIAL PORTÃO BRASIL) de **55,45 kg** para **329,95 kg**.

## Situação atual (verificado no banco)
- Compra: número **150926-02** (o card exibe 159026-02), id `041e0abb-a4bf-4d5b-a100-2bf1036e95fa`, fluxo "Peças", status "Peças: Trituração e Amostragem".
- Pesos registrados em stage_evidence:
  - `weight_flex_extraido` (Peso Real Flex extraído): **55,45 kg** — único peso registrado até agora (sem peso Carbono nem pesos pós-trituração).

## Alteração proposta
- `stage_evidence` da compra 150926-02, `task_key = 'weight_flex_extraido'` → `value_numeric = 329.95`.
- Observação: após a alteração, o peso Flex extraído (329,95 kg) fica **abaixo** do peso conferido (403 kg) — conferir se é isso mesmo que se deseja.

## Passos
1. Aplicar o UPDATE no banco.
2. Conferir o valor resultante no banco.
3. Você valida na tela (o card deve mostrar 329,9500 kg em "Peso Real Flex extraído" após recarregar).

## Fora de escopo
- Nenhuma alteração de código; apenas este dado desta compra.
