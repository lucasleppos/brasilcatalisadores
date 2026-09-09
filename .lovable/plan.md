# Corrigir divergência de Pt, Pd e Rh entre a prévia e o PDF

## O que está acontecendo

Na compra 040926-09 o grupo tem três análises registradas (reanálises):

| Análise | Pt | Pd | Rh |
|---|---|---|---|
| 1 | 0 | 1.470 | 140 |
| 2 | 0 | 1.450 | 141 |
| 3 | 0 | 1.460 | 139 |

- A prévia na tela mostra a **média das três** (Pd 1.460 / Rh 140) — correto.
- O PDF mostra os valores de **apenas uma das análises** (Rh 139), porque monta a tabela pegando o último registro lido em vez de calcular a média.

Daí a diferença de 1 ppm no Rh.

## Correção

1. No PDF, a coluna Pt/Pd/Rh do bloco de material passa a usar a **média final de todas as análises** de cada grupo, exatamente como a prévia.
2. A prévia deixa de repetir a tabela "Análise Laboratorial" quando os valores já aparecem na linha de cada grupo, ficando idêntica ao PDF.

Nenhum cálculo de valor, peso ou total muda.

## Detalhes técnicos

- `supabase/functions/generate-demonstrativo-pdf/index.ts`: no bloco `calcItems`, substituir o `labMap` construído por atribuição direta (último registro vence) por uma agregação por `purchase_item_id` sobre `allLabRows` (soma / contagem), reaproveitando a mesma lógica de `labAgg` já usada na seção cerâmica; extrair essa agregação para uma variável comum antes dos dois blocos. Redeploy da função.
- `src/components/processes/DemonstrativoViewDialog.tsx`: condicionar o bloco `hasAnyLab` a `calcItems.length === 0`, alinhando com a regra já aplicada no PDF.
- Validação: `bunx tsgo --noEmit` e gerar novamente o PDF da 040926-09 conferindo Pd 1.460 e Rh 140 iguais à prévia.
