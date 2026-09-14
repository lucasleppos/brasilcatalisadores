# Corrigir o layout da janela "Precificação de Peças"

## O problema

A janela abre estreita (640 px) mesmo em tela grande: o título quebra palavra por palavra, a descrição fica comprimida e as colunas da tabela se sobrepõem. Confirmei no app: a janela está configurada para "largura automática", e por isso encolhe até o conteúdo, em vez de usar a largura ampla prevista.

## Correção

- Dar largura definida à janela no computador: até 1.024 px, limitada a 95% da tela, centralizada.
- Manter tela cheia no celular, como já é hoje.
- Com a largura correta, título, descrição, botões e as colunas Peça / Qtd-Peso / Calculado unit. / Valor unit. / Subtotal voltam a ficar alinhados e legíveis.
- Aplicar o mesmo ajuste na janela equivalente de Peça em Sacola, que usa a mesma configuração.

Nada muda em cálculos, valores ou etapas — apenas o tamanho da janela.

## Verificação

Abrir "Precificar Peças Conferidas" numa compra de Peças e conferir, por captura de tela, a janela larga com as linhas das peças alinhadas; conferir também no tamanho de celular.

## Detalhes técnicos

- `src/components/processes/PiecePricingPanel.tsx`: no `DialogContent`, trocar `sm:w-auto sm:max-w-5xl` por largura definida (`sm:w-[min(64rem,95vw)] sm:max-w-none`), mantendo `w-screen h-[100dvh]` no mobile. `w-auto` em elemento `fixed` gera shrink-to-fit, causa do encolhimento.
- Mesmo ajuste em `src/components/processes/SacolaPricingPanel.tsx` se ele repetir o padrão `sm:w-auto`.
- Validação: `bunx tsgo --noEmit` e screenshot via Playwright autenticado.
