# Padronização brasileira de números, valores e porcentagens

## O que foi encontrado (verificado)

**1. Margens dos fornecedores importadas em escala errada (causa raiz confirmada)**
Consulta ao banco: todos os 446 fornecedores têm `margin`, `margin_pecas` e `margin_ceramico` entre 0,05 e 0,35 — ou seja, o Excel entregou células formatadas como porcentagem (3% = 0,03) e o importador gravou o valor bruto. É por isso que a tela mostra `0.03` em vez de `3%`.
Os grupos de catálogo estão corretos (0 a 25), então o problema é só dos fornecedores importados.

**2. Formatação fora do padrão brasileiro (ponto decimal em vez de vírgula)**
- `src/pages/SuppliersPage.tsx`: `{s.marginPecas}%` e `{s.marginCeramico}%` — número cru, sem vírgula.
- `src/components/suppliers/SupplierImport.tsx`: prévia das margens com número cru.
- `src/components/suppliers/SupplierForm.tsx`: campos iniciam com `String(margem)` (ex.: `0.03`).
- `src/components/purchases/NewPurchaseDialog.tsx`: `{selectedSupplier.margin}%`.
- `src/pages/CatalogPage.tsx` e `src/components/catalog/GroupManager.tsx`: `{g.margin}%`.
- `src/components/processes/SacolaPricingPanel.tsx` (linhas 57 e 68): `toFixed(1)` com ponto.
- `src/components/bags/AllocationPanel.tsx`: vários pesos com `.toFixed(1)/(0)/(2)` com ponto.
- `src/components/processes/CeramicoConferenciaPanel.tsx`: tolerância com `.toFixed(0)`.
- `src/components/bags/BranchStockList.tsx`: valores em R$ sem `maximumFractionDigits`, podendo exibir mais de 2 casas.

## O que será feito

### A. Correção dos dados de fornecedores
Migração única: para toda linha com margem `> 0` e `< 1`, multiplicar por 100 (`0,03 → 3`, `0,15 → 15`) nas três colunas. Valores já em escala de porcentagem ficam intactos.

### B. Importação à prova de erro
No `SupplierImport.tsx`, ao ler a margem:
- aceita `12,5`, `12.5`, `12,5%`;
- se a célula vier como fração (valor `> 0` e `< 1`, típico de célula formatada como % no Excel), converte para porcentagem multiplicando por 100;
- valores `>= 1` são tratados como porcentagem direta.
A prévia passa a mostrar a margem já convertida e formatada (`3,0%`).

### C. Helpers únicos de formatação
Em `src/lib/utils.ts`:
- `fmtPct(n, decimals = 1)` → `15,0%` (e `fmtPctSmart` para omitir decimal quando inteiro: `15%`, `15,5%`);
- `fmtBrl` já existe e continua sendo o padrão para `R$ 10.000,00`;
- `fmtKg(n, decimals)` para pesos.

### D. Substituição em todas as telas listadas acima
Trocar interpolações cruas e `toFixed` por `fmtPct`, `fmtBrl` e `fmtNum`/`fmtKg`, mantendo as casas decimais atuais de cada tela (pesos 1–4 casas conforme o contexto, PPM sem decimais, valores sempre 2 casas).

## Detalhes técnicos

- Migração SQL: `UPDATE public.suppliers SET margin = margin*100, margin_pecas = margin_pecas*100, margin_ceramico = margin_ceramico*100 WHERE greatest(margin, margin_pecas, margin_ceramico) > 0 AND greatest(margin, margin_pecas, margin_ceramico) < 1;`
- Nenhuma mudança de schema, RLS ou grants.
- Cálculos de precificação continuam usando margem em escala de porcentagem (`valor * margem/100`), como já fazem `PiecePricingPanel`, `SacolaPricingPanel` e `CeramicoPricingPanel` — com os dados corrigidos, os valores pagos passam a sair certos.
- Entradas numéricas continuam `type="text"` + `inputMode="decimal"` com `parseNum`, sem alteração de comportamento.
