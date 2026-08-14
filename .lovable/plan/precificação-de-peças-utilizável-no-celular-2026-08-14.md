# Precificação de Peças utilizável no celular

O painel de precificação usa hoje um layout de tabela de 12 colunas dentro de um diálogo de desktop. Em telas de ~390px as colunas ficam esmagadas, o cabeçalho ocupa metade da tela e a área de rolagem não deixa alcançar as linhas de peças e preços.

## O que muda para o usuário

- No celular, o painel abre em tela cheia (100% da altura), com o conteúdo rolando normalmente até o fim da lista.
- Cabeçalho compacto: título em uma linha, dados do pedido (número, fornecedor, margem) em texto pequeno de duas linhas, e o badge de conferidos + botão "Recalcular" em uma faixa própria logo abaixo, sem quebrar palavras.
- Cada peça passa a ser um cartão em vez de linha de tabela: código/referência no topo, e abaixo, em pares rótulo/valor, Qtd (un), Peso, Calculado unit. e o campo Valor unit. (R$) em largura confortável, com Subtotal destacado à direita.
- O cabeçalho de colunas da tabela é escondido no mobile (só aparece no desktop).
- O rodapé com totais e os botões "Salvar precificação" / "Fechar" ficam fixos na base, com os botões em largura total e empilhados.
- No desktop o layout atual permanece exatamente igual.

## Detalhes técnicos

- `src/components/processes/PiecePricingPanel.tsx`: usar `useIsMobile()` para alternar entre o grid de 12 colunas atual e a renderização em cartão; `DialogContent` com classes responsivas (`max-w-full h-[100dvh] rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-5xl`), padding reduzido no mobile (`px-3 sm:px-6`), cabeçalho de colunas com `hidden sm:grid`, footer com `flex-col sm:flex-row` e botões `w-full sm:w-auto`.
- Trocar o `ScrollArea` de altura fixa por container `flex-1 overflow-y-auto overscroll-contain` no mobile, para a rolagem nativa funcionar com teclado aberto.
- Aplicar o mesmo ajuste responsivo nos painéis irmãos que usam o mesmo grid de 12 colunas e sofrem do mesmo problema: `SacolaPricingPanel.tsx`, `SacolaConferenciaPanel.tsx`, `SacolaLabPanel.tsx` e `SacolaTrituracaoPanel.tsx` (nenhuma mudança de lógica de cálculo ou de salvamento).
- Sem alterações em regras de negócio, cálculos, permissões ou backend.

## Verificação

- Typecheck.
- Playwright em viewport 393x543: abrir Demonstrativo → Precificar Peças Conferidas, confirmar rolagem até a última peça, edição do valor unitário e botão Salvar acessível; conferir que o desktop segue idêntico.
