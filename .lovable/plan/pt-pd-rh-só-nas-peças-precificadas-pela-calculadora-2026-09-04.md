# Pt / Pd / Rh só nas peças precificadas pela calculadora

## O que muda

No demonstrativo de Peça em Sacola (prévia na tela e PDF):

- As colunas Pt (ppm), Pd (ppm) e Rh (ppm) só mostram valores nas peças cujo preço foi definido **pela calculadora**.
- Peças precificadas **pelo catálogo** ficam com esses três campos **em branco** (sem valor, sem traço).
- As colunas continuam aparecendo desde que exista pelo menos uma peça precificada pela calculadora; se todas forem por catálogo, as colunas não aparecem.
- Nenhum valor, peso, subtotal ou total é alterado.

## Detalhes técnicos

- `src/components/processes/DemonstrativoViewDialog.tsx`: na tabela `!isCeramico`, condicionar a exibição de `labMap[it.id]` a `it.pricing_source === "calculadora"`, imprimindo string vazia caso contrário; ajustar `showItemLab` para exigir pelo menos um item com `pricing_source === "calculadora"` e análise disponível.
- `supabase/functions/generate-demonstrativo-pdf/index.ts`: mesma regra no bloco de itens não cerâmicos (células Pt/Pd/Rh vazias quando `pricing_source !== 'calculadora'`), mantendo as larguras de coluna atuais; redeploy da função.
- Validação: `bunx tsgo --noEmit` e geração do PDF de uma compra de Peça em Sacola com peças de catálogo e de calculadora.
