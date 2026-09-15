# Preencher a precificação da compra 110926-24 pela planilha

## Como vai funcionar

1. Você envia a planilha com duas colunas: **código da peça** e **valor unitário (R$)**.
2. Eu confiro a planilha contra as 112 linhas de peças conferidas da compra 110926-24 e mostro, antes de gravar:
   - códigos da planilha que não existem na compra;
   - códigos da compra que ficaram sem valor na planilha;
   - o valor total que a compra passará a ter.
3. Com sua confirmação, gravo o valor unitário em cada peça (o sistema multiplica pela quantidade de cada linha) e recalculo o total da compra.
4. Depois basta gerar novamente o demonstrativo/PDF, que sairá com o total correto.

## Observações

- Se um mesmo código aparecer em mais de uma linha da compra (quantidades diferentes), o mesmo valor unitário é aplicado a todas essas linhas.
- Bônus não vem da planilha; se houver bônus, informe a quantidade e eu lanço à parte.
- As peças hoje estão todas sem valor, então nada de preenchido será sobrescrito.

## Detalhes técnicos

- As 112 linhas são `purchase_items` com `category='conferencia'`, `item_type='peca'`; o código vem de `catalog_parts.code` via `catalog_part_id` (as colunas `part_code`/`part_reference` estão vazias nessa compra).
- Gravação: `total_value = valor_unitário × quantity`, `pricing_source='manual'`, via um único `UPDATE ... FROM` com a lista de pares (código, valor).
- Total da compra: recalcular `purchases.total_brl` como a soma de `total_value` dos itens da compra.
