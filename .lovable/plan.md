# Voltar a imprimir e reduzir o texto do jeito certo (TSPL)

A última mudança trocou apenas os multiplicadores da fonte `"0"` (título 13→8, texto 9→5) mantendo `TEXT ...,"0",0,escala,escala`. Na fonte escalável `"0"` do TSPL esses dois campos não são "multiplicadores" e sim o tamanho em pontos; valores muito baixos são recusados pela impressora, e nesse caso ela pode descartar o desenho e não emitir a etiqueta. Como só isso mudou entre "imprimia grande" e "não imprime", esta é a causa provável — mas não é confirmada em hardware, então o plano começa por restaurar um estado que já imprimia e só depois reduz o texto por um caminho suportado.

## O que muda

1. **Voltar a imprimir agora**: os padrões voltam a um conjunto comprovado (título e texto no tamanho anterior) e o passo entre linhas volta ao espaçamento fixo que funcionava, para a etiqueta sair mesmo sem mexer em nada nas Configurações.
2. **Reduzir o texto pelo caminho suportado**: em vez de encolher a fonte `"0"`, o desenho passa a usar as fontes bitmap internas (`"2"` para as linhas de dados e `"3"` para o código do lote) com multiplicadores inteiros de 1 a 3. Multiplicador 1 na fonte `"2"` é bem menor que qualquer coisa que a etiqueta mostra hoje, e é uma combinação sempre aceita pela impressora.
3. **Configurações > Impressora de etiquetas**: os campos de tamanho passam a ser 1–3 (multiplicador), com presets Pequeno / Médio / Grande, e um seletor de "Fonte" com as opções Bitmap (recomendado) e Escalável (comportamento antigo). Assim, se a bitmap não agradar no papel, é possível voltar sem novo deploy.
4. **Limpeza de preferências antigas**: valores de escala salvos no aparelho (ex. 8 e 5) hoje continuam sendo aplicados mesmo após corrigir o código, então a leitura das preferências converte valores fora da nova faixa para os novos padrões.
5. A etiqueta de teste continua usando exatamente os mesmos parâmetros da impressão real, para calibrar sem gastar etiquetas.

## Detalhes técnicos

- `src/lib/label-tspl.ts`
  - `TsplOptions` ganha `fontMode: "bitmap" | "scalable"`; `titleScale`/`textScale` passam a significar multiplicador (1–3) no modo bitmap e pontos (8–24) no modo escalável, com clamps por modo.
  - `TEXT` do cabeçalho usa fonte `"3"` e as linhas fonte `"2"` no modo bitmap; no modo escalável mantém `"0"` com os pontos informados.
  - Passo vertical e posição do separador/QR derivados da altura real da fonte escolhida (fonte `"2"` ≈ 24 dots, `"3"` ≈ 32 dots, multiplicados pela escala), com mínimo seguro para não sobrepor.
  - `TSPL_DEFAULTS`: `fontMode: "bitmap"`, `titleScale: 2`, `textScale: 1`.
  - `buildEscPos` sem alterações.
- `src/lib/thermal-printer.ts`: `PrinterPrefs` ganha `fontMode`; `loadPrinterPrefs` normaliza escalas legadas fora da faixa para os novos padrões e continua persistindo no mesmo `localStorage`.
- `src/components/settings/LabelPrinterCard.tsx`: seletor de fonte, presets e campos numéricos na nova faixa; `handleTest` repassa `fontMode`.
- `src/components/processes/CeramicoLabelPrint.tsx`: `tryBluetoothPrint` repassa `fontMode` junto das escalas.
- Sem alterações de banco, de fluxo ou da impressão via navegador (fallback HTML).

## Validação

Após aplicar: abrir Configurações > Impressora de etiquetas, imprimir a etiqueta de teste em Pequeno; se sair em branco ou não sair, alternar a fonte para Escalável e reimprimir — isso isola de vez se o problema é a fonte ou a conexão.
