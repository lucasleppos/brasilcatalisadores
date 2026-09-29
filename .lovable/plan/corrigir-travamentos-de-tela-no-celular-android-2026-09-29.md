# Corrigir travamentos de tela no celular Android

## Diagnóstico
As imagens não mostram um erro do sistema: é uma **falha de desenho da tela** no Chrome do Android. Blocos aparecem duplicados ("Buscar peça no catálogo" repetido, "Adicionar Peça" em camadas), com faixas de ruído e áreas pretas. Os dados estão certos (totais e peças corretos); o que falha é a atualização da imagem enquanto a pessoa rola a tela.

Causa provável, confirmada pela estrutura das telas:
- A conferência abre dentro de uma **janela deslizante de tela cheia**, que continua "deslocada" pela animação de abertura depois de aberta. No Chrome Android, uma área longa com rolagem dentro de um elemento deslocado costuma gerar exatamente esses fantasmas e faixas pretas, principalmente em celulares com pouca memória de vídeo.
- Essa área tem sombras, fundos semitransparentes e a lista de sugestões da busca de peças por cima, o que aumenta o trabalho do celular.
- Listas longas (ex.: 34 peças) com tudo desenhado de uma vez pesam mais.

## O que será feito
1. **Janelas deslizantes no celular**: depois de abertas, remover o deslocamento da animação e deixar a rolagem num único nível. A abertura continua com a mesma aparência.
2. **Rolagem mais leve**: aplicar ajustes de rolagem para Android nas áreas com rolagem das janelas e do layout mobile.
3. **Menos efeitos pesados no celular**: remover o desfoque da barra de busca fixa e as sombras grandes dentro das janelas de etapa. O visual continua igual na prática.
4. **Busca de peças**: a lista de sugestões passa a abrir no fluxo da própria tela, em vez de flutuar por cima. Isso evita camadas sobrepostas durante a rolagem.
5. **Lista de peças da conferência**: desenhar só o que está visível e sem refazer tudo a cada tecla digitada, deixando a tela mais leve com muitas peças.

Nada muda nas regras, nos cálculos ou nos dados. O computador não é afetado.

## Detalhes técnicos
- `src/components/ui/sheet.tsx` / `src/components/mobile/MobileSheet.tsx`: `data-[state=open]:transform-none` após animação, `overscroll-contain`, `[-webkit-overflow-scrolling:touch]`, `contain: paint` no container de rolagem; evitar rolagem dupla (SheetContent + div interna).
- `MobileSearchBar.tsx`: trocar `bg-background/95 backdrop-blur` por `bg-background`.
- `PartSearch.tsx`: a lista de resultados deixa de ser `absolute z-50` no mobile e passa a ficar no fluxo normal da página; `max-h` controlado.
- `SacolaConferenciaPanel.tsx`: `memo` nas linhas de peça e `content-visibility:auto` nos cards das peças.
- Validação: Playwright em 393×852 com emulação mobile, rolando a conferência de uma compra com mais de 30 peças; depois o usuário confirma no aparelho Android real, que é onde o problema aparece.

## Recomendação para o aparelho
Atualizar o Chrome e o sistema do celular. Se continuar, desligar a economia de bateria extrema, que limita a parte gráfica.
