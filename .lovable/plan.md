## Remover casas decimais dos resultados de análise

Exibir Pt/Pd/Rh como inteiros (sem casas decimais) na seção "Análise Laboratorial", tanto no dialog quanto no PDF.

### Alterações

- `src/components/processes/DemonstrativoViewDialog.tsx`
  - Trocar `fmtNum(r.pt, 2)` / `pd` / `rh` por `fmtNum(..., 0)` na tabela de grupo.
  - Trocar `fmtNum(generalAvg.pt, 2)` / `pd` / `rh` por `fmtNum(..., 0)` no fallback.

- `supabase/functions/generate-demonstrativo-pdf/index.ts`
  - Trocar `fmt(r.pt)` / `pd` / `rh` por `fmt(r.pt, 0)` (idem para pd/rh) na tabela de grupo.
  - Trocar `fmt(Number(latestLab.pt_ppm))` / `pd` / `rh` por `fmt(..., 0)` no fallback.

### Fora de escopo
- Tabela de "Peças — Preço Calculado (PPM Lab)" já usa `fmt(..., 0)` — sem mudança.
- Nenhuma alteração de cálculo.
