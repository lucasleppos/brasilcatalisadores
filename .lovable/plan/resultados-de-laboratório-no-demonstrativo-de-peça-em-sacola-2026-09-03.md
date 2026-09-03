# Resultados de laboratório no demonstrativo de Peça em Sacola

## O que muda

No demonstrativo de valores das compras do fluxo **Peça em Sacola**, cada linha da tabela de peças passa a exibir o resultado da análise do laboratório daquela peça:

- Três novas colunas: **Pt (ppm)**, **Pd (ppm)** e **Rh (ppm)**.
- Valores sem casas decimais, como já é feito no fluxo cerâmico.
- Quando a peça ainda não tem análise registrada, mostra "—".
- A linha de Bônus (quando existir) permanece sem valores de análise.

Isso aparece tanto na visualização em tela quanto no PDF gerado, para manter os dois idênticos.

Fora de escopo: fluxo de Peças comum (sem laboratório) e fluxo Cerâmico continuam como estão; nenhum cálculo de valor, peso ou total é alterado.

## Detalhes técnicos

- `src/components/processes/DemonstrativoViewDialog.tsx`: a tabela `!isCeramico` (linhas ~218-263) ganha três colunas usando o `labMap` já calculado por `purchase_item_id` (média entre versões). As colunas só são renderizadas quando `purchase.materialFlow === "peca_sacola"` (ou quando existir alguma análise por item), evitando colunas vazias no fluxo de Peças.
- `supabase/functions/generate-demonstrativo-pdf/index.ts`: o bloco de itens regulares para fluxo não cerâmico recebe as mesmas colunas, reaproveitando `allLabRows` (agregação por item já existente na seção cerâmica, extraída para uso comum). Ajuste das posições de coluna para caber Pt/Pd/Rh em A4, seguida de redeploy da função.
- Formatação com `fmtNum(x, 0)` no diálogo e `fmt(x, 0)` no PDF.
- Validação: `bunx tsgo --noEmit` e conferência visual do demonstrativo/PDF de uma compra de Peça em Sacola com análises registradas.
