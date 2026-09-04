# Nome do grupo no demonstrativo cerâmico

## Problema

No demonstrativo de material cerâmico, cada lote aparece como "Manual" na coluna
Material, e na seção Análise Laboratorial todas as linhas aparecem como
"Cerâmico". O nome do grupo (Grupo 01, Grupo 02, Especial, Extra, Diesel) que é
definido na conferência e já aparece corretamente na tela de Precificação não é
lido pelo demonstrativo.

Causa confirmada: o nome do grupo é gravado na conferência como evidência da
etapa (uma linha por lote, vinculada ao item), e a tela de Precificação lê essa
evidência. Já o demonstrativo (prévia e PDF) tenta usar o código do catálogo do
item, que não existe nos lotes cerâmicos, e por isso cai no texto "Manual".

## O que muda

- O demonstrativo passa a ler o nome do grupo de cada lote da conferência,
  exatamente como a tela de Precificação faz.
- Coluna Material das tabelas cerâmicas (preço calculado, preço fixo e tabela
  geral) mostra o nome do grupo em vez de "Manual".
- Seção Análise Laboratorial mostra o nome do grupo de cada lote em vez de
  repetir "Cerâmico".
- Lotes sem nome salvo continuam com um rótulo de fallback ("Grupo N" pela
  ordem), nunca "Manual".
- Mesma regra aplicada na prévia em tela e no PDF, para ficarem idênticos.
- Nada muda em pesos, valores, PPM ou no fluxo das etapas.

## Detalhes técnicos

- `src/components/processes/DemonstrativoViewDialog.tsx`
  - Buscar em `stage_evidence` as linhas com `task_key like 'lote_cat_%'` do
    `purchase_id` e montar `groupMap[itemId] = value_text`.
  - Criar `materialLabel(item, index)`: grupo salvo → `part_code`/catálogo →
    `Grupo N` (para cerâmico) / `typeLabels[item_type]`.
  - Usar em `partLabel`/`typeLabel` nas tabelas cerâmicas e em
    `matchedGroupRows.label` (Análise Laboratorial).
- `supabase/functions/generate-demonstrativo-pdf/index.ts`
  - Mesma consulta de `stage_evidence` e mesmo helper de rótulo nas seções
    cerâmicas (linhas ~222, ~291, ~362) e na tabela de análise.
  - Redeploy da função após a alteração.
