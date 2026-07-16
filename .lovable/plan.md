## Fazer a Análise Laboratorial voltar a aparecer

### Diagnóstico
Neste pedido (`07/07/2026 - 01`) existem 9 registros em `lab_results` — mas todos apontam para `purchase_item_id`s antigos (grupos que foram excluídos e recriados na conferência). Os itens atuais têm outros IDs, portanto o filtro `groupLabItems = itemsForTotal.filter(it => labAgg[it.id])` no PDF e no dialog resulta vazio, e a seção "Análise Laboratorial" simplesmente não é renderizada.

Também não há linhas "gerais" (`purchase_item_id IS NULL`), então o fallback existente (`generalAvg` / `latestLab`) também fica vazio.

### Correção (somente apresentação — não mexer nos dados)
Ampliar a lógica de exibição no dialog e no PDF para que a seção **Análise Laboratorial** sempre apareça quando houver qualquer registro em `lab_results` para o pedido, aplicando esta ordem de prioridade:

1. **Por grupo (preferido):** se algum item atual bater com um `purchase_item_id` em `lab_results`, montar a tabela por grupo como já é feito hoje.
2. **Agregado por versão (fallback quando não há match por grupo):** agrupar TODAS as linhas `lab_results` do pedido por `versao` e mostrar uma tabela:
   - Colunas: `Versão`, `Pt (ppm)`, `Pd (ppm)`, `Rh (ppm)`, com médias de Pt/Pd/Rh dentro da versão.
   - Ordenar por versão crescente.
   Assim os 9 registros existentes aparecem como v1/v2/v3 com as médias dos três grupos.
3. **Manter** o fallback antigo de `generalAvg` (linhas sem `purchase_item_id`) para pedidos legados que usavam esse formato.

### Arquivos alterados
- `src/components/processes/DemonstrativoViewDialog.tsx` — adicionar bloco "agregado por versão" quando `hasPerGroupLab` for false e existir qualquer linha em `labRows`.
- `supabase/functions/generate-demonstrativo-pdf/index.ts` — mesma tabela agregada por versão como fallback quando `groupLabItems.length === 0` e `allLabRows.length > 0`.

### Fora de escopo
- Não vou apagar/migrar as linhas órfãs de `lab_results`. Se quiser, avalio depois uma limpeza/relacionamento com cascade — mas isso é mudança de dados e fica para outra rodada.
- Nenhuma alteração em cálculos de valores.
