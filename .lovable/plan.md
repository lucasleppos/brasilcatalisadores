# Grupo "Diesel" no fluxo cerâmico

## Objetivo
Permitir criar, na Conferência de material cerâmico, um grupo chamado **Diesel** que pula Moagem e Laboratório, aguarda os demais grupos e é precificado por um valor escolhido (R$ 35,00 ou R$ 40,00 por kg) na tela "Ver Precificação dos Lotes".

## Regras definidas
- Valor Diesel é **por kg**: valor do lote = peso bruto x (35 ou 40).
- A escolha 35/40 é **por lote Diesel**, feita no painel de precificação.
- Lote Diesel **não tem tara**: o peso bruto da conferência é o peso final.
- A compra só avança para Aprovação quando os grupos não-Diesel concluírem Moagem e Laboratório; o Diesel fica em stand-by (não bloqueia nem é bloqueado).

## O que muda

### 1. Conferência (`CeramicoConferenciaPanel.tsx`)
- Adicionar "Diesel" à lista de categorias sugeridas.
- Exibir um selo visual "Diesel — direto para Aprovação" nos lotes dessa categoria.
- Fotos e peso bruto continuam obrigatórios como nos demais grupos.

### 2. Moagem (`CeramicoTrituracaoPanel.tsx`)
- Filtrar lotes Diesel da lista de registro de TARA/foto de embalagem.
- Não exigir tara/foto para Diesel na validação de conclusão da etapa.
- Se **todos** os lotes forem Diesel, a etapa pode ser concluída sem registros (mensagem explicativa em vez de lista vazia).

### 3. Laboratório (`CeramicoLabPanel.tsx`)
- Filtrar lotes Diesel da lista de análises e da validação "todos os lotes precisam de resultado".
- Mostrar aviso informando que os lotes Diesel estão em stand-by aguardando Aprovação.

### 4. Precificação dos Lotes (`CeramicoPricingPanel.tsx`)
- Para cada lote Diesel, em vez do cálculo por PPM, exibir um seletor com as opções **R$ 35,00/kg** e **R$ 40,00/kg**.
- Valor do lote = peso bruto x preço escolhido; entra normalmente no TOTAL da compra.
- Enquanto um lote Diesel não tiver preço escolhido, o botão "Confirmar Precificação" fica bloqueado.
- Ao salvar, gravar em `purchase_items`: `total_value`, `pricing_source = "diesel"` e o preço/kg escolhido dentro de `calc_input` para rastreabilidade (sem alteração de schema).

### 5. Demonstrativo (visualização e PDF)
- Lotes Diesel aparecem com o rótulo do grupo, peso, valor unitário (R$/kg) e valor total, sem colunas de análise laboratorial (Pt/Pd/Rh vazios), já que não passam pelo laboratório.

## Detalhes técnicos
- A categoria do lote é gravada em `stage_evidence` (`lote_cat_<itemId>`); o reconhecimento do Diesel será feito por comparação normalizada (sem acento/caixa) dessa string, com um helper compartilhado (`isDieselGroup`) em `src/lib/purchases.ts` para uso nos quatro painéis e no PDF.
- Nenhuma migração de banco é necessária.
