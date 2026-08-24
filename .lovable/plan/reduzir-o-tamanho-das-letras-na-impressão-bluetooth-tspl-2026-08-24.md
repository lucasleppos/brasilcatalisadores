# Reduzir o tamanho das letras na impressão Bluetooth (TSPL)

Na impressão via Bluetooth no Android o texto sai muito grande porque a etiqueta é desenhada pela própria impressora com multiplicadores de fonte altos: hoje o código do lote usa escala 13x13 e as linhas de dados 9x9 (`src/lib/label-tspl.ts`). Em 203 dpi isso equivale a letras de vários milímetros, ocupando quase toda a etiqueta de 100x50 mm.

## O que muda

- Novos valores padrão de tamanho: cabeçalho (código do lote) em escala 8, linhas de dados em escala 5, código sob o QR em escala 4 — texto visivelmente menor e alinhado ao layout do papel.
- O espaçamento entre linhas passa a ser calculado a partir da escala escolhida (em vez do fixo de 40 dots), então as linhas ficam compactas sem sobrepor.
- Em Configurações > Impressora de etiquetas ganham-se dois ajustes: **Tamanho do título** e **Tamanho do texto**, com botões rápidos (Pequeno / Médio / Grande) e ajuste fino numérico. A etiqueta de teste usa os mesmos valores, para calibrar sem gastar etiquetas.
- Se o texto ficar mais estreito, o bloco do QR e o separador continuam se adaptando à largura útil já existente (nada muda no cálculo de margens).

## Detalhes técnicos

- `src/lib/label-tspl.ts`:
  - `TsplOptions` recebe `titleScale` (padrão 8) e `textScale` (padrão 5); `TSPL_DEFAULTS` atualizado.
  - `TEXT` do cabeçalho usa `"0",0,titleScale,titleScale`; linhas de dados usam `textScale`; o código sob o QR usa `max(3, textScale - 1)`.
  - Passo vertical das linhas passa a ser `Math.round(textScale * 4.5)` com mínimo de 22 dots; posições do separador e do QR recalculadas a partir da altura do cabeçalho derivada de `titleScale`.
  - Nenhuma alteração em `buildEscPos`.
- `src/lib/thermal-printer.ts`: `PrinterPrefs` ganha `titleScale` e `textScale` (padrões 8 e 5), persistidos no mesmo `localStorage`, com clamp de 3 a 16.
- `src/components/settings/LabelPrinterCard.tsx`: novos controles de tamanho no bloco de calibração TSPL; `handleTest` repassa `titleScale`/`textScale`.
- `src/components/processes/CeramicoLabelPrint.tsx`: `tryBluetoothPrint` repassa as duas novas prefs ao `buildTspl`.
- Sem alterações de banco, fluxo ou cálculo; a impressão pelo navegador (fallback HTML) não é afetada.
