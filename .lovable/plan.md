# Correção da importação de pedido em PDF

Testei o PDF enviado (Pedido Nº 15744): ele tem 19 linhas de item que somam 24 peças (algumas linhas têm 2 ou 3 unidades do mesmo código), mas o parser atual só consegue ler 14 linhas, e não captura nome do fornecedor nem a data do pedido. As falhas têm causa confirmada no texto extraído.

Confirmei também que os totais do pedido são calculados por quantidade: peso 34,940 kg = soma de (peso unitário × qtd) e valor R$ 18.759,38 = soma de (valor unitário × qtd). Ou seja, valor e peso do PDF são unitários e devem ser multiplicados pela quantidade.


## O que está acontecendo

**1. Itens com valor acima de R$ 1.000 são perdidos (5 itens)**
Quando o valor unitário passa de mil, o PDF quebra a célula em duas linhas: `R$` fica numa linha e `1.014,90` na linha de baixo, deixando a linha do item sem valor. Hoje o código junta o `R$` com a linha seguinte (que é a linha do item), produzindo algo como `R$CC* SERIE CC HONDA...`, que não casa com o padrão de item. Itens afetados: CC*, AET, PL, 2H6131690A, 2H0131765A.

**2. Nome do fornecedor vem vazio**
No PDF, `Cliente` e `CPF` são rótulos numa linha e os valores vêm na linha seguinte (`JULIO SERGIO GONÇALVES - JULIO SERGIO   006.133.971-77`). O código espera o nome na mesma linha do rótulo, então acaba com texto vazio e cai no nome genérico "Fornecedor <doc>".

**3. Data do pedido vem vazia**
Mesmo caso: `Data do Pedido` / `Status` são rótulos, e `14/08/2026` / `pendente` estão na linha de baixo. A regex exige a data na mesma linha do rótulo.

## Correções

Tudo em `src/lib/pedido-pdf-import.ts` (o diálogo de revisão já exibe esses campos, sem mudança de UI):

- **Valores em duas linhas:** montar a linha do item juntando também o valor "órfão". Passar a reconhecer o padrão em que o item traz quantidade e peso mas o valor está separado, buscando o `R$` imediatamente acima e o número imediatamente abaixo, na mesma coluna. Aplicar antes do casamento do padrão de item, para que os 19 itens sejam lidos.
- **Fornecedor:** quando a linha de `Cliente` for só rótulo, ler os valores na linha seguinte, removendo o CPF/CNPJ do fim. Manter o nome completo como está no pedido.
- **Data:** procurar a data `dd/mm/aaaa` na linha do rótulo ou na linha seguinte, ignorando o texto de status.
- **Validação de leitura:** comparar os totais somados com "Peso Total do Pedido" e "Valor Total do Pedido" do rodapé (já extraídos hoje) e, se houver divergência, mostrar aviso no diálogo de revisão para o operador conferir antes de criar a compra.

## Verificação

Rodar a extração sobre o PDF enviado e confirmar: 19 itens, peso total 34,940 kg, valor total R$ 18.759,38, fornecedor "JULIO SERGIO GONÇALVES - JULIO SERGIO", CPF 006.133.971-77, data 14/08/2026.
