## Entendimento

Peça em sacola passa a ser tratada **uma a uma**: cada peça tem peso próprio, pesado pelo operador, e é comparada com o peso do catálogo. Duas validações definem o preço:

1. **Peso** — diferença até 3% (para menos) em relação ao catálogo: OK.
2. **Análise** — diferença até 5% (para menos) entre PPM do catálogo e PPM do laboratório: OK.

Regra de pagamento:
- Peso e análise **acima** do catálogo → paga-se pelo **catálogo** (não se paga a mais).
- Diferença para menos **dentro** das margens (<3% / <5%) → paga-se pelo **catálogo**, apenas sinalizando a diferença.
- Diferença para menos **fora** das margens → paga-se pelo **peso e PPM reais da análise**.

Nada bloqueia o avanço; o app sinaliza de forma destacada.

## Etapa 1 — Conferência (SacolaConferenciaPanel)

- Trocar o campo "Quantidade (un)" por **"Peso pesado (kg)"** (`type=text`, `inputMode=decimal`, formato brasileiro).
- Cada "Adicionar Peça" cria **uma linha própria** (quantidade sempre 1), mesmo com código repetido — remover a lógica de somar quantidade e os botões +/−.
- Em cada linha mostrar: Código, Referência, **Peso catálogo**, **Peso pesado** e **Δ%** destacado:
  - verde: dentro de 3% ou acima do catálogo;
  - laranja/vermelho: abaixo do catálogo em mais de 3%, com selo "Fora da margem de peso".
- Peso pesado editável direto na linha.
- Meta de encerramento continua exata: nº de peças pesadas = total declarado (10/10).
- Rodapé: total de peças, peso total conferido, peso total de catálogo e Δ% geral.

## Etapa 2 — Análise (SacolaLabPanel)

- Para cada peça, ao lado dos PPMs do laboratório, exibir os PPMs do catálogo e o **Δ%** por metal e o Δ% do valor de metal contido.
- Selo por peça: "Análise dentro da margem (5%)" ou "Fora da margem de análise".

## Etapa 3 — Precificação (SacolaPricingPanel)

- Calcular automaticamente para cada peça a **origem do preço sugerido**:
  - `catalogo` quando peso e análise estão OK (dentro das margens ou acima do catálogo);
  - `calculadora` (peso + PPM reais) quando qualquer uma das validações estiver fora da margem para menos.
- A seleção continua editável pelo operador; a sugestão automática vem pré-marcada com um resumo do motivo ("Peso −5,2% fora da margem → pagar por análise").
- Painel mostra as duas colunas de validação (peso / análise) com os selos.

## Detalhes técnicos

- Margens 3% e 5% ficam como constantes num helper novo (`src/lib/sacola-validation.ts`) com funções `weightCheck(catalogWeight, realWeight)` e `analysisCheck(catalogPpms, labPpms)` retornando `{ diffPct, withinMargin, useCatalog }`.
- Persistência: cada peça continua uma linha em `purchase_items` (`item_type = peca_sacola`, `category = conferencia`, `quantity = 1`), com `weight` = peso pesado e `catalog_part_id` apontando o catálogo (peso de catálogo é lido de lá, sem coluna nova).
- `pricing_source` em `purchase_items` já existe e recebe o resultado da decisão.
- Demonstrativo/PDF permanecem como estão nesta etapa (sem exibir margens/PPM).
