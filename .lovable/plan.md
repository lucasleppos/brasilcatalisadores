# Impressão direta em impressora térmica via Web Bluetooth (TSPL)

Hoje todas as etiquetas passam por `printLabelSheet`, que monta um HTML 100x50 mm em iframe e chama o diálogo de impressão do navegador. A proposta é enviar os comandos direto para a impressora Coibeu por Bluetooth, mantendo o diálogo do navegador como alternativa.

## Como vai funcionar

1. Ao clicar em qualquer botão de imprimir etiqueta (Entrada, Conferência de Cerâmico, Peças e Sacola), o app verifica se já existe uma impressora Bluetooth pareada na sessão.
2. Se não houver, abre o seletor de dispositivos Bluetooth do navegador; o operador escolhe a impressora Coibeu e ela fica guardada como impressora padrão do aparelho.
3. O app gera os comandos TSPL da etiqueta (100x50 mm, com QR Code nativo da impressora) e envia direto — sem diálogo de impressão, sem páginas em branco.
4. Se o navegador não suportar Web Bluetooth (iPhone/Safari), a conexão falhar ou o operador cancelar, o app volta automaticamente para a impressão HTML atual, sem perder a etiqueta.
5. Em Configurações: um bloco "Impressora de etiquetas" com status da conexão, botão para pareaer/trocar impressora, botão de etiqueta de teste e opção de desativar o Bluetooth (usar sempre o navegador).

## Conteúdo da etiqueta

Mesmos dados de hoje (código do lote, ENTRADA quando aplicável, comprador, fornecedor, tipo/grupo, aprovadas/reprovadas, quantidade, peso bruto, QR Code). O QR passa a ser desenhado pela própria impressora, o que deixa a leitura mais nítida do que a imagem PNG atual.

## Observações sobre a Coibeu

Impressoras Coibeu de etiquetas trabalham com TSPL; alguns modelos aceitam também ESC/POS. O plano implementa TSPL como padrão e deixa em Configurações uma chave "Linguagem da impressora: TSPL / ESC-POS", para o caso do modelo específico responder melhor no outro modo. A etiqueta de teste serve para confirmar qual funciona antes do uso em produção.

## Detalhes técnicos

- Novo `src/lib/thermal-printer.ts`:
  - `connectPrinter()`: `navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [...] })` com os UUIDs de serial-over-BLE comuns (`000018f0-...`, `0000ff00-...`, `49535343-...` Nordic/Zebra-like); descobre a característica gravável (`write` ou `writeWithoutResponse`).
  - `sendRaw(bytes)`: envio em blocos de 20–180 bytes com espera entre chunks (limite MTU do BLE).
  - `isSupported()`, `getDevice()`, `disconnect()`, reconexão automática em `gattserverdisconnected`.
  - Preferências (`deviceName`, `language`, `enabled`) em `localStorage`.
- Novo `src/lib/label-tspl.ts`: `buildTspl(label: LabelData): Uint8Array` com `SIZE 100 mm,50 mm`, `GAP`, `DENSITY`, `DIRECTION 1`, `CLS`, `TEXT` posicionados no mesmo arranjo visual atual (código em destaque, linhas de dados, peso em negrito), `QRCODE` com a URL de `buildLabelUrl(code)`, `PRINT 1`. Texto codificado em CP850/latin-1 para acentos. Um `buildEscPos` equivalente para o modo alternativo.
- `CeramicoLabelPrint.tsx`: `printLabelSheet` passa a tentar primeiro o caminho Bluetooth (uma etiqueta por cópia, na mesma ordem) e cai no iframe HTML atual em caso de falha; a assinatura pública e todos os pontos de chamada (`NewPurchaseDialog`, `StageActionCard`, `PurchaseDetail`, `CeramicoConferenciaPanel`, `SacolaConferenciaPanel`) permanecem inalterados.
- `src/pages/SettingsPage.tsx`: bloco de gerenciamento da impressora (parear, testar, linguagem, ativar/desativar).
- Sem alterações de banco de dados, de fluxo de etapas ou de cálculo.
- Requisito do navegador: Chrome/Edge no Android ou desktop, em HTTPS. Safari/iOS não expõe Web Bluetooth e usará o fallback HTML.
