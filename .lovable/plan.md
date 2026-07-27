## Objetivo

Dois ajustes no demonstrativo (PDF e visualização em tela) para o fluxo de material cerâmico.

## 1. Remover o bloco "Análise Laboratorial" do PDF

Hoje o PDF imprime a tabela de Pt/Pd/Rh por grupo duas vezes na prática: uma dentro do bloco "Preço Calculado (PPM Lab)" e outra na seção "Análise Laboratorial" no rodapé.

Ação: suprimir a seção "Análise Laboratorial" (tabela por grupo e a variante de resumo geral Pt/Pd/Rh) sempre que o bloco de preço calculado com PPM já tiver sido impresso. Nos casos em que esse bloco não existe, a seção continua sendo exibida para não perder a informação.

A visualização em tela (diálogo) permanece como está, salvo indicação contrária.

## 2. Trocar "Peça/Peças" por "Material" no fluxo cerâmico

No fluxo cerâmico, os rótulos passam a ser:

- Título do bloco: "Material — Preço Fixo (Catálogo)" e "Material — Preço Calculado (PPM Lab)"
- Cabeçalho de coluna: "Peça" → "Material"
- Rótulo de tipo de item: mantém "Cerâmico" (já usado)

No fluxo de peças, os textos atuais permanecem inalterados.

## Detalhes técnicos

- `supabase/functions/generate-demonstrativo-pdf/index.ts`: condicionar a seção de análise laboratorial à ausência do bloco de preço calculado; usar rótulos dinâmicos baseados na flag `isCeramico` já existente.
- `src/components/processes/DemonstrativoViewDialog.tsx`: aplicar os mesmos rótulos dinâmicos ("Material") quando `isCeramico`.
- Redeploy da edge function após a alteração.
