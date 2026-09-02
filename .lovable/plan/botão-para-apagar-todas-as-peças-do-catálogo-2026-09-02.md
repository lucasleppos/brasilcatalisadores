# Botão para apagar todas as peças do catálogo

Objetivo: permitir refazer a importação do catálogo sem precisar excluir peça por peça.

## O que muda na tela Catálogo de Peças

- Novo botão "Apagar tudo" na barra de ações (ao lado de Grupos / Importar / Nova Peça), visível apenas para Super Admin.
- Ao clicar, abre uma confirmação mostrando quantas peças serão apagadas e exigindo digitar a palavra APAGAR para liberar o botão vermelho de confirmação.
- Os grupos do catálogo e suas margens são mantidos — apaga somente as peças.
- Após concluir, mensagem de sucesso com a quantidade removida e a lista recarrega vazia, pronta para a nova importação.
- Se alguma peça estiver vinculada a compras já lançadas, a exclusão dessas é bloqueada pelo banco; nesse caso a mensagem avisa que existem peças em uso e nada é apagado.

## Detalhes técnicos

- `src/lib/catalog.ts`: nova função `deleteAllParts()` que remove todos os registros de `catalog_parts` e retorna a contagem apagada (ou o erro de vínculo).
- `src/pages/CatalogPage.tsx`: botão + `AlertDialog` de confirmação com campo de texto, gate por `role === "super_admin"`, e `refresh()` ao final.
- Nenhuma mudança de estrutura de banco ou de políticas: a permissão de exclusão em `catalog_parts` já existe para usuários autenticados.
