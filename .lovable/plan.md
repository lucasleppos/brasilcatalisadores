
## Alterações no Demonstrativo (Dialog + PDF)

Aplicar os refinamentos já aprovados também no PDF, e remover a linha "Versão" da prévia.

### 1. `DemonstrativoViewDialog.tsx`
- Remover a exibição "Versão N" no `DialogDescription` (substituir por texto neutro tipo "Prévia dos valores do demonstrativo" ou vazio).
- Manter os outros refinamentos já em andamento:
  - Bruto / Tara / Líquido por grupo + Valor Unit. (R$/kg) no fluxo Cerâmico.
  - Análise laboratorial por grupo (usando `lab_results.purchase_item_id`, com fallback "Geral" quando não houver por item).
  - Remover cotações USD e câmbio.
  - Resumo: "Total de grupos" em vez de "Total de peças" no fluxo Cerâmico.

### 2. `supabase/functions/generate-demonstrativo-pdf/index.ts`
Espelhar as mesmas mudanças no PDF (fluxo Cerâmico apenas — Peças e Sacola permanecem iguais):

- **Demais Itens (Cerâmico):** substituir a coluna "Qtd/Peso" por três linhas na célula — `Bruto: X kg`, `Tara: Y kg`, `Líquido: Z kg`. Preencher "Valor Unit." com `total_value ÷ pesoLíquido` (R$/kg) quando houver valor.
  - Ajustar altura da linha (~14 mm) para caber as 3 linhas; manter alternância de fundo.
- **Análise Laboratorial:** substituir o bloco único (Pt/Pd/Rh geral + versão) por uma tabela por grupo:
  - Colunas: Grupo, Pt (ppm), Pd (ppm), Rh (ppm), Versão.
  - Fonte: média de `lab_results` por `purchase_item_id`, agrupando as versões.
  - Fallback: se nenhum item tiver análise, imprimir uma linha "Geral" com a análise mais recente do purchase (comportamento atual).
- **Remover cotações e câmbio:** apagar o bloco "Cotações utilizadas" (Pt/Pd/Rh USD + Câmbio). Remover também a query `settings` do `Promise.all` se não for mais usada.
- **Resumo:** no fluxo Cerâmico imprimir `Total de grupos: N` (= `itemsForTotal.length`) em vez de `Total de peças`. Fluxo Peças/Sacola permanece.

### Fora de escopo
- Sem mudanças em cálculo, backend/RLS, outras telas ou config.
- Nome do arquivo, botões de download/aprovar/contestar permanecem.

### Arquivos alterados
- `src/components/processes/DemonstrativoViewDialog.tsx`
- `supabase/functions/generate-demonstrativo-pdf/index.ts`
