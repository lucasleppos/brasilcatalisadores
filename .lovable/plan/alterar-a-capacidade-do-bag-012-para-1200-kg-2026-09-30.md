# Alterar a capacidade do BAG-012 para 1200 kg

## Situação atual
- BAG-012 — "BRASIL FLEX 2" (tipo Médio, comprador BRASIL), status Aberto.
- Peso atual: 925,3330 kg; capacidade hoje: 1.000 kg (93%).

## Alteração
- Mudar apenas a capacidade máxima do BAG-012 de 1.000 kg para 1.200 kg.
- Nada mais muda: peso, valor pago (R$ 500.819,63), itens, status e demais dados ficam como estão.
- Com 925,3330 kg, o bag passa a exibir 77% da capacidade.

## Detalhes técnicos
- `UPDATE public.bags SET max_weight = 1200 WHERE id = 'b4f93c69-1f45-4ca4-aa2c-3b2cd6caaee9';`
- Não há alteração de código: a tela já usa `max_weight` da compra para a barra e o percentual.
