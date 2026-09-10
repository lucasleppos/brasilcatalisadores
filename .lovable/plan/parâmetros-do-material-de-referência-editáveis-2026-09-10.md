# Parâmetros do material de referência editáveis

Hoje o material de referência da alocação (1 kg, Pt 200, Pd 1.180, Rh 180, margem 15%) é fixo no sistema. Só o "Limite de Referência (%)" aparece nas Configurações.

## O que muda

No bloco **Alocação de Bags** das Configurações passam a existir, junto com o limite atual:

- **Peso de referência** (kg) — inicial 1
- **Pt de referência** (ppm) — inicial 200
- **Pd de referência** (ppm) — inicial 1.180
- **Rh de referência** (ppm) — inicial 180
- **Margem de referência** (%) — inicial 15
- **Limite de Referência** (%) — permanece, inicial 143

Ao salvar, os novos valores passam a valer imediatamente:

- o valor de referência mostrado na Calculadora é recalculado com esses parâmetros;
- a coluna **%** da tela Alocar Material usa a nova referência, e a margem informada também é aplicada ao valor do material comparado (mantendo a comparação em bases iguais).

Nada muda na precificação das compras, nos demonstrativos ou nos PDFs.

## Detalhes técnicos

- Migração em `public.settings`: `reference_weight_kg numeric not null default 1`, `reference_pt_ppm numeric not null default 200`, `reference_pd_ppm numeric not null default 1180`, `reference_rh_ppm numeric not null default 180`, `reference_margin_pct numeric not null default 15`.
- `src/lib/settings.ts`: novos campos em `Settings`, `defaultSettings`, `rowToSettings` e nos payloads de insert/update.
- `src/lib/allocation-index.ts`: substituir as constantes fixas por leitura de `settings` (peso, ppm, margem); manter as constantes exportadas apenas como valores padrão. `allocationPercent` continua devolvendo `null` sem análise.
- `src/pages/SettingsPage.tsx`: cinco campos `Field` adicionais no card "Alocação de Bags" (padrão brasileiro, `type="text"` + `parseNum`).
- `src/pages/CalculatorPage.tsx`: o bloco informativo passa a exibir os parâmetros vigentes no rótulo (peso, ppm e margem lidos de `settings`).
