# Correção da impressão de etiquetas

## Problemas identificados

1. **Páginas em branco (Peças e Peças em Sacola)**: a etiqueta é renderizada dentro da própria página do app e a impressão usa `visibility: hidden` para esconder o restante. Elementos com `visibility: hidden` continuam ocupando espaço, então o conteúdo do app (diálogo, tabelas, layout) continua gerando páginas vazias na impressão.
2. **Conteúdo desenquadrado no Cerâmico**: a etiqueta tem altura fixa de 50 mm, mas o conteúdo (lote, comprador, fornecedor, grupo, peso bruto em 15pt) pode exceder essa altura. O excesso transborda e é empurrado para a página seguinte.

## Correção proposta

### 1. Imprimir em contexto isolado (resolve as páginas em branco)
Trocar a técnica de `visibility: hidden` por uma impressão isolada: montar o HTML das etiquetas em um `iframe` oculto (mesma origem, com o CSS `@page 100mm 50mm`) e chamar `print()` apenas nesse iframe. Assim nada do app entra no fluxo de impressão e não há páginas extras.

Implementação: transformar `CeramicoLabelPrint` em um helper de impressão que:
- gera os QR codes (mesma função `generateQRCodeDataUrl` atual);
- monta o markup das etiquetas + estilos em um documento de iframe;
- aguarda o carregamento das imagens e chama `iframe.contentWindow.print()`;
- remove o iframe após a impressão.

Os dois painéis (`CeramicoConferenciaPanel` e `SacolaConferenciaPanel`) passam a chamar esse helper em vez de renderizar um portal + `window.print()`. Sem mudança de comportamento visível: mesmos dados, mesmas 3 cópias por grupo/lote.

### 2. Ajustar o enquadramento da etiqueta (resolve o transbordo)
- `overflow: hidden` na etiqueta e no bloco de informações, para garantir que nada escape dos 50 mm.
- Reduzir levemente as escalas: lote 12pt, linhas 10pt, peso bruto 13pt, QR 27 mm, com espaçamentos menores.
- `page-break-inside: avoid` em cada etiqueta e altura exata `49.8mm` para evitar arredondamento que gera página extra em algumas impressoras.

## Arquivos afetados
- `src/components/processes/CeramicoLabelPrint.tsx` (vira helper de impressão em iframe + CSS ajustado)
- `src/components/processes/CeramicoConferenciaPanel.tsx` (chamada de impressão)
- `src/components/processes/SacolaConferenciaPanel.tsx` (chamada de impressão)
