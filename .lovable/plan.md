# Valor e Grupo no PDF "Peças separadas do fluxo"

## O que muda

A tabela do PDF passa a ter cinco colunas:

```text
Nº | Código | Referência | Valor da peça | Grupo
```

- **Valor da peça**: valor unitário calculado com os dados do catálogo (peso e Pt/Pd/Rh) aplicando a margem de peças do fornecedor — o mesmo cálculo já usado na tela de Precificação.
- **Grupo**: definido pelo valor da peça
  - Grupo 1 — até R$ 350,00
  - Grupo 2 — acima de R$ 350,00 até R$ 650,00
  - Grupo 3 — acima de R$ 650,00
- Peça sem dados de catálogo suficientes: valor em branco e grupo "—".
- No rodapé, além do total de peças, um resumo por grupo (quantidade e soma de valores por grupo).

O botão continua o mesmo, na conferência de Peça em Sacola e nas etapas seguintes.

## Detalhes técnicos

- `src/lib/separated-pieces-report.ts`: `SeparatedPieceRow` recebe `unitValue?: number | null` e `group?: 1 | 2 | 3 | null`; helper `groupForValue(v)` com limites `<=350 → 1`, `<=650 → 2`, `>650 → 3`; novas colunas na tabela (valor formatado com `fmtBrl`/formato pt-BR local) e bloco de totais por grupo.
- Novo helper `src/lib/separated-pieces-value.ts`: `computeSeparatedPieceValues(purchase, pieces)` que carrega `loadSettings()`, a margem `margin_pecas` do fornecedor e `catalog_parts` (weight, pt_ppm, pd_ppm, rh_ppm) por `catalog_part_id`, e roda `calculate()` com `entryType: "peca_fechada"`, `clientDiscount = margem`, `tare: 0`, retornando `finalValueBrl / qty` por peça.
- `src/components/processes/SacolaConferenciaPanel.tsx`: em `handleSeparatedReport`, usar o helper com `excludedPieces` (já tem `catalogPartId`) antes de chamar `printSeparatedPiecesReport`.
- `src/components/processes/StageActionCard.tsx`: mesma composição a partir de `getExcludedItems(purchase)` (usa `catalogPartId` do item).
- Nenhuma alteração de schema, de precificação ou de fluxo — apenas apresentação no PDF.
- Validação: `bunx tsgo --noEmit` e impressão do PDF de uma compra de Peça em Sacola com peças separadas.
