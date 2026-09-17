# Compra "duplicada" após a conferência (170926-23)

## O que realmente aconteceu

A compra **não** foi duplicada no banco. Confirmado:

- existe uma única compra 170926-23 (ANDRE MANSANO);
- ela tem exatamente **3 peças**, somando **1,785 kg**.

A tela mostra **6 peças · 3,570 kg** — exatamente o dobro. Ou seja, o app está **lendo as mesmas peças duas vezes** ao montar a lista de compras, e por isso quantidade e peso aparecem dobrados (e, em outras telas, itens podem aparecer repetidos ou até faltar).

## Causa

A leitura das peças é feita em blocos de 1.000 linhas (hoje o app já tem 2.128 peças no total). Esses blocos são pedidos **sem uma ordenação fixa**, então o banco pode devolver a mesma linha em dois blocos diferentes — e omitir outras. Foi o que aconteceu com esta compra.

## Correção

- Passar a pedir todos os blocos com **ordenação fixa**, para que cada linha apareça uma única vez.
- Além disso, **descartar repetições** ao juntar os blocos, como proteção extra.
- Vale para todas as listas do app que leem em blocos (compras, peças, catálogo, bags, laboratório, relatórios), então a mesma classe de erro deixa de acontecer em qualquer tela.
- Nada é alterado nos dados: as 3 peças da 170926-23 continuam como estão e a tela passa a exibir 3 peças · 1,785 kg.

## Verificação

- Abrir a lista de Compras e confirmar 170926-23 com 3 peças e 1,785 kg.
- Conferir outras compras recentes (contagem de peças e peso) e a tela Alocar Material.

## Detalhes técnicos

`src/lib/db.ts`:

- `fetchAllRows` recebe uma chave estável de ordenação e a aplica antes do `range` (ou o chamador passa `.order("id")`); a paginação sem `ORDER BY` é a causa raiz das linhas repetidas/omitidas no PostgREST;
- deduplicação por `id` ao concatenar os blocos em `fetchAllRows`/`fetchAllByIds` (mantendo a primeira ocorrência), para casos em que o `select` não traga chave ordenável;
- `fetchAllIn` em `src/lib/purchases.ts` passa a incluir `.order("id")` na consulta de `purchase_items` (e demais usos de `fetchAllByIds`).

Sem migração e sem mudança de RLS. Validação: `bunx tsgo --noEmit` e checagem no preview de que a 170926-23 mostra 3 peças.
