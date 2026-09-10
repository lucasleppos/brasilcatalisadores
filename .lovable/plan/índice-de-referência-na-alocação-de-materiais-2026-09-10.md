# Índice de referência (%) na alocação de materiais

## Objetivo
Mostrar, para cada material da tela "Alocar Material", uma porcentagem que ajude o usuário a decidir para qual bag o material vai. A decisão continua 100% manual — o sistema apenas informa.

## Como a porcentagem é calculada
1. **Referência**: valor de 1 kg com Pt 200 ppm, Pd 1.180 ppm, Rh 180 ppm e desconto de 15%, calculado pela mesma calculadora do sistema (portanto acompanha automaticamente as cotações e custos vigentes).
2. **Valor do material**: valor de 1 kg do material, usando os resultados de análise (Pt/Pd/Rh) daquele lote, com o mesmo desconto de 15%.
3. **Porcentagem** = valor do material ÷ valor de referência × 100.

Materiais sem análise (Pt/Pd/Rh zerados) ficam com "—".

## Onde aparece

### Módulo Calculadora
Um bloco informativo, somente leitura, mostrando o **Valor de referência (1 kg — Pt 200 / Pd 1.180 / Rh 180 — 15%)** em R$/kg, que se atualiza sozinho quando as cotações mudam. Serve de referência permanente para a equipe.

### Tela Alocar Material (Bags)
- Nova coluna **%** na tabela do desktop e no card do mobile, nas listas de Disponíveis, Em Processo e Alocados.
- Apenas o número (ex.: `147%`), sem sugerir bag nem bloquear nada.
- A ordenação e os filtros atuais continuam iguais.

### Configurações
Novo campo **Limite de referência (%)**, com valor inicial 143, editável pelo administrador. Ele não muda comportamento automático — serve para o sistema exibir a porcentagem em relação ao limite definido pela empresa (e ficar pronto caso queira destaque visual no futuro).

## Detalhes técnicos
- Migração: adicionar `allocation_threshold_pct numeric not null default 143` em `public.settings`; mapear em `src/lib/settings.ts`.
- Novo helper `src/lib/allocation-index.ts`:
  - `referenceValuePerKg(settings)` → `calculate({ grossWeight: 1, tare: 0, ptPpm: 200, pdPpm: 1180, rhPpm: 180, clientDiscount: 15, ... }, settings).finalValueBrl`.
  - `allocationPercent(ptPpm, pdPpm, rhPpm, settings)` → valor por kg do material ÷ referência × 100, retornando `null` quando os PPMs são todos zero.
- `AllocationPanel.tsx`: carregar `Settings` uma vez, calcular a referência com `useMemo`, adicionar `TableHead`/`TableCell` "%" e a linha correspondente nos cards mobile, usando `fmtNum(pct, 0)`.
- `CalculatorPage.tsx`: bloco informativo com o valor de referência (mesmo helper), sem inputs.
- `SettingsPage.tsx`: campo numérico brasileiro (`type="text"` + `parseNum`) para o limite.
- Nenhuma alteração na lógica de precificação, nos demonstrativos ou nos PDFs.
