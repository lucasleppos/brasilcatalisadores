# Calibração da etiqueta 100x50 mm (TSPL)

A impressão Bluetooth já funciona. Agora o cabeçalho TSPL passa a ser explícito e configurável, com margem de segurança e encerramento correto do buffer.

## O que muda na prática

- Toda etiqueta enviada começa com o mesmo bloco de calibração (tamanho, gap, direção, limpeza do buffer) e termina com o comando de impressão + `END`.
- O conteúdo passa a ser desenhado a partir de uma margem interna (padrão 10 dots em X e Y), evitando texto colado na borda.
- Em Configurações > Impressora de etiquetas ganham-se três ajustes: Direção (0 ou 1), Margem de segurança (dots) e Cópias por etiqueta — usados também na etiqueta de teste, para calibrar sem gastar etiquetas em produção.

## Cabeçalho gerado

```text
SIZE 100 mm,50 mm
GAP 3 mm,0 mm
DIRECTION 1        (ou 0, conforme configuração)
REFERENCE 0,0
DENSITY 10
SPEED 4
CLS
... TEXT / BAR / QRCODE (deslocados pela margem) ...
PRINT 1,1
END
```

## Detalhes técnicos

- `src/lib/label-tspl.ts`:
  - `buildTspl(label, opts?)` com `opts = { direction?: 0 | 1; marginX?: number; marginY?: number; gapMm?: number; density?: number; speed?: number; copies?: number }`, com defaults `direction 1`, `margin 10/10`, `gap 3`, `copies 1`.
  - Cabeçalho na ordem exata acima (incluindo `REFERENCE 0,0`); `CLS` sempre imediatamente antes do primeiro elemento desenhado.
  - Todas as coordenadas (`TEXT` do lote, `BAR` separador, linhas de dados, `QRCODE`, código sob o QR) passam a somar `marginX`/`marginY`; a largura da barra e a posição do QR são recalculadas a partir da largura útil (800 - 2*marginX) para não estourar a etiqueta.
  - Fecha com `PRINT 1,<copies>` seguido de `END` e `\r\n` final.
  - `buildEscPos` permanece inalterado (fallback de modelos ESC/POS).
- `src/lib/thermal-printer.ts`: `PrinterPrefs` ganha `direction` (0|1, padrão 1), `marginX`, `marginY` (padrão 10) e `copies` (padrão 1), persistidos no mesmo `localStorage`.
- `src/components/processes/CeramicoLabelPrint.tsx`: `tryBluetoothPrint` lê as prefs e repassa as opções ao `buildTspl`.
- `src/components/settings/LabelPrinterCard.tsx`: controles de Direção (toggle 0/1), margem X/Y e cópias; a etiqueta de teste usa os mesmos valores.
- Sem alterações de banco de dados, fluxo ou cálculo.
