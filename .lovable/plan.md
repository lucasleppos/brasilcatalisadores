## Mostrar média final por grupo em vez de por versão

### Mudança
Substituir o fallback "agregado por versão" (v1/v2/v3) por uma tabela **agregada por grupo**, exibindo a média final de Pt/Pd/Rh que a etapa de análise já calcula (média das 3 versões por grupo).

### Lógica
1. Agrupar `lab_results` por `purchase_item_id` (ignorar linhas sem `purchase_item_id`).
2. Para cada grupo, calcular a média de `pt_ppm`, `pd_ppm`, `rh_ppm` entre todas as versões existentes.
3. Rótulo do grupo:
   - Se o `purchase_item_id` bate com um item atual em `itemsForTotal` → usar o rótulo do item (código do catálogo ou tipo), como já é feito hoje.
   - Se não bate (linhas órfãs de grupos recriados) → rotular como `Grupo 1`, `Grupo 2`, ... na ordem de aparição no `lab_results` (ordenado por `purchase_item_id` para estabilidade).
4. Ordem final: primeiro os grupos que batem com itens atuais (na ordem de `itemsForTotal`), depois os grupos órfãos.

### Colunas da tabela
`Grupo | Pt (ppm) | Pd (ppm) | Rh (ppm)` — sem coluna de versão.

### Aplicar em
- `src/components/processes/DemonstrativoViewDialog.tsx` — substituir o bloco `versionAggRows` pela nova tabela por grupo. Também simplificar o caminho "por grupo" atual para o mesmo formato (sem coluna Versão).
- `supabase/functions/generate-demonstrativo-pdf/index.ts` — mesma substituição, mantendo a formatação já existente (remover coluna Versão em ambos os caminhos, com ou sem match).

### Fora de escopo
- Sem alterações no cálculo de valores nem na etapa de análise em si.
- Sem limpeza de dados órfãos.
