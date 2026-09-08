# Divergência de valor entre o card e o PDF (compra 080926-02)

## O que está acontecendo

Verifiquei os dados da compra 080926-02:

- Soma das 8 linhas de peças conferidas (11 unidades): **R$ 5.915,79** — é o valor do card e o mesmo valor que aparece somando as linhas da tabela do PDF.
- Os três demonstrativos gerados dessa compra têm gravado um total antigo de **R$ 6.068,56** (diferença de R$ 152,77, de uma peça que deixou de fazer parte da conferência).

Na geração do PDF, o total impresso não é a soma das linhas: o sistema compara o valor somado das peças com o valor gravado no demonstrativo e imprime **o maior dos dois**. Por isso o rodapé mostra R$ 6.068,56 enquanto as linhas somam R$ 5.915,79.

## Correção proposta

1. O PDF passa a imprimir sempre a soma real das peças/grupos listados na tabela (mais bônus, quando existir). Nada de "o maior valor".
2. Ao gerar o PDF, se o total gravado no demonstrativo estiver diferente da soma real, o registro é atualizado com a soma real — assim tela, card e PDF ficam sempre iguais.
3. Ajuste pontual nos três demonstrativos já existentes da 080926-02 para R$ 5.915,79, para que uma reimpressão saia correta.

Nenhuma regra de precificação, peso ou fluxo muda — apenas a origem do total exibido.

## Detalhes técnicos

- `supabase/functions/generate-demonstrativo-pdf/index.ts`: substituir `effectiveTotal = Math.max(calculatedTotal, demo.valor_total)` por `effectiveTotal = calculatedTotal` (com fallback para `demo.valor_total` só quando `calculatedTotal === 0`); trocar a atualização condicional atual por uma sincronização sempre que `calculatedTotal > 0 && Math.abs(calculatedTotal - demo.valor_total) > 0.01`. Redeploy da função.
- Atualização de dados via SQL nos três registros de `demonstrativos` da compra `c90752a5-7ef6-48df-8ceb-c0a7ef0620ed`.
- Validação: gerar novamente o PDF da 080926-02 e conferir rodapé = R$ 5.915,79 e igualdade com o card e a prévia.
