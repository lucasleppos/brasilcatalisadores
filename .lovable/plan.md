# Peso líquido nas linhas de resultados

## O que muda

Nas tabelas de material cerâmico do demonstrativo (Preço Fixo/Catálogo e Preço Calculado/PPM Lab), a coluna **Peso** passa a mostrar o **peso líquido** de cada grupo (bruto menos tara), em vez do peso bruto.

- Mesma mudança na prévia em tela e no PDF, para os dois ficarem idênticos.
- Nada muda nos valores, no Valor/kg (que já usava o líquido) nem nos totais do rodapé.

## Detalhes técnicos

- `src/components/processes/DemonstrativoViewDialog.tsx`: nas linhas da tabela de catálogo (linha ~343) e da tabela calculada (linha ~379), trocar `it.weight ? fmtNum(Number(it.weight), 4)` por `w > 0 ? fmtNum(w, 4)` usando o `weights(it).liquido` já calculado.
- `supabase/functions/generate-demonstrativo-pdf/index.ts`: nos blocos de preço fixo (~324) e preço calculado (~398), usar `itemWeights(item).liquido` no texto da coluna Peso; redeploy da função.
- Validação: `bunx tsgo --noEmit` e conferência da prévia + PDF de uma compra cerâmica.
