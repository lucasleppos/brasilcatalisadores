# Etiqueta Bluetooth: reduzir texto de verdade (renderização em imagem)

## O problema
Na foto, os textos continuam grandes e cortados ("Lucas Leppos", "JULIO SE...", "LOT-260815-0..."). Hoje a etiqueta é montada com comandos `TEXT` usando as fontes internas da impressora (`src/lib/label-tspl.ts`). No modo bitmap já estamos no menor multiplicador possível (1), então **não existe tamanho menor disponível** por esse caminho — e o modo escalável em tamanhos pequenos foi justamente o que fez a impressora recusar o comando antes.

## Solução proposta
Desenhar a etiqueta como imagem monocromática de 800 x 400 dots (100 x 50 mm @ 203 dpi) e enviá-la com o comando `BITMAP` do TSPL. Assim o tamanho da letra passa a ser controlado por nós (em pixels), não pela impressora.

O que muda na prática:
- Fonte pequena e nítida (títulos ~22 px, dados ~16 px), com controle fino no ajuste de Configurações.
- Nenhuma linha cortada: o texto quebra ou reduz automaticamente até caber na coluna esquerda, sem invadir o QR.
- QR continua nítido (desenhado na própria imagem, em alta resolução).
- Layout idêntico ao atual: código do lote no topo, linha separadora, dados à esquerda, QR + código à direita.

## Segurança da mudança
- O modo atual (`TEXT` com fontes internas) permanece disponível como alternativa em Configurações, chamado "Fontes da impressora", caso algum aparelho não aceite `BITMAP`.
- O novo modo entra como padrão: "Imagem (recomendado)".
- Botão "Imprimir etiqueta de teste" continua funcionando para validar antes de usar em produção.

## Detalhes técnicos
- Novo módulo `src/lib/label-raster.ts`: renderiza a etiqueta num `<canvas>` 800x400, converte para bitmap 1-bit (LSB por byte, largura em bytes = 100) e emite `BITMAP 0,0,100,400,0,<dados>` entre o cabeçalho (`SIZE`/`GAP`/`DIRECTION`/`REFERENCE`/`DENSITY`/`SPEED`/`CLS`) e o fecho (`PRINT 1,n` + `END`).
- QR gerado no canvas via a mesma URL de `buildLabelUrl` (biblioteca de QR já disponível no projeto; se não houver, incluo um gerador leve).
- `src/lib/label-tspl.ts`: mantém `buildTspl` (fontes internas) e passa a exportar `buildTsplRaster`; envio em chunks continua pelo `src/lib/thermal-printer.ts` sem alteração.
- `PrinterPrefs` ganha `renderMode: "raster" | "text"` e tamanhos em px (`titlePx`, `textPx`) com presets Pequeno/Médio/Grande; valores antigos são migrados automaticamente.
- `src/components/settings/LabelPrinterCard.tsx`: seletor de modo de renderização + controles de tamanho em px, com pré-visualização do canvas na tela antes de imprimir.
