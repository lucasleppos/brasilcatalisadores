# Etiquetas em branco entre as impressões

O layout ficou certo, mas a impressora está pulando etiquetas. Isso acontece porque cada etiqueta é enviada como um **trabalho separado**: a cada envio a impressora repete a rotina de cabeçalho (`SIZE`/`GAP`/`DIRECTION`) e avança papel para reencontrar o sensor de gap — resultado: uma ou mais etiquetas em branco entre as impressas.

## O que muda

- Todas as etiquetas do lote passam a ser enviadas em **um único trabalho**: um cabeçalho de calibração no início e, em seguida, blocos `CLS ... BITMAP ... PRINT` para cada etiqueta (e para cada cópia). Sem cabeçalho repetido, sem avanço extra entre etiquetas.
- Cabeçalho ganha `SET TEAR OFF` e `OFFSET 0 mm` para a impressora não avançar até a barra de destaque a cada etiqueta.
- Em Configurações > Impressora de etiquetas:
  - Novo botão **Calibrar sensor de etiqueta**, que envia apenas o comando de autodetecção do gap (`GAPDETECT`) — a impressora aprende o tamanho real da etiqueta uma única vez e para de desperdiçar papel.
  - Campos ajustáveis para **Gap (mm)** e **Offset (mm)**, já que o gap real do rolo pode não ser 3 mm; e a etiqueta de teste passa a permitir imprimir 1, 2 ou 3 etiquetas seguidas para conferir se não há pulos.

## Como validar

1. Rode "Calibrar sensor de etiqueta" uma vez com o rolo carregado.
2. Imprima o teste com 3 etiquetas: devem sair três seguidas, sem nenhuma em branco.
3. Se ainda houver avanço extra, reduza/aumente o Gap em 1 mm e repita.

## Detalhes técnicos

- `src/lib/label-raster.ts`: separar a montagem em `buildRasterBlock(label, opts)` (apenas `CLS` + `BITMAP` + `PRINT 1,n`) e `buildTsplRasterJob(labels, opts)` que emite um único cabeçalho (`SIZE`, `GAP`, `DIRECTION`, `REFERENCE 0,0`, `OFFSET`, `SET TEAR OFF`, `DENSITY`, `SPEED`) seguido de todos os blocos e `END` final. `buildTsplRaster` (etiqueta única) continua exportado, delegando para o job com um item.
- `src/lib/label-tspl.ts`: mesma separação para o modo de fontes internas (`buildTsplJob`), mantendo `buildTspl` para compatibilidade; adicionar `offsetMm` a `TsplOptions` e `TSPL_DEFAULTS`. Novo helper `buildGapDetect()` retornando `SIZE`/`GAP`/`GAPDETECT`/`END`.
- `src/components/processes/CeramicoLabelPrint.tsx`: `tryBluetoothPrint` passa a montar **um** payload com todas as etiquetas (`sendToPrinter([job])`) em vez de um payload por etiqueta.
- `src/lib/thermal-printer.ts`: `PrinterPrefs` ganha `gapMm` (padrão 3) e `offsetMm` (padrão 0), com clamp 0–10; `recommendedPrinterLayout` inclui os dois. Sem mudança no envio em chunks.
- `src/components/settings/LabelPrinterCard.tsx`: controles de Gap/Offset, botão "Calibrar sensor de etiqueta" (envia `buildGapDetect()` via `sendRaw`) e seletor de quantidade na etiqueta de teste.
- Sem alterações de banco, fluxo ou cálculo; a impressão pelo navegador não é afetada.
