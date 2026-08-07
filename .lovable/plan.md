# Corrigir lista de Compras vazia até dar refresh

## O que está acontecendo

A página de Compras busca os dados uma única vez, no momento em que é montada (`useEffect(..., [])`). A sessão do usuário e o perfil/papel são carregados de forma assíncrona pelo contexto de autenticação. Quando a busca acontece antes da sessão estar pronta, o banco (com RLS) não retorna nada, o erro é silenciosamente ignorado e a lista fica vazia com "Nenhuma compra encontrada" — só um refresh manual resolve.

Há dois agravantes no mesmo trecho:
- O filtro do papel "comprador" usa `profile`, que também pode ainda estar nulo na primeira busca.
- Erros da consulta são engolidos (`return []`), então nada indica falha na tela.

Os dados no banco estão corretos (as compras existem), o problema é apenas de carregamento no front-end.

## Correções

1. **Recarregar quando a autenticação estiver pronta**: a busca passa a rodar quando a sessão/perfil terminam de carregar, não apenas na montagem da página.
2. **Estados visíveis**: mostrar "Carregando compras..." enquanto busca e uma mensagem de erro com botão "Tentar novamente" se a consulta falhar, em vez de "Nenhuma compra encontrada".
3. **Recarregar ao voltar para a aba/página**: atualiza a lista quando o usuário retorna ao app, evitando dados velhos.
4. **Atualizar após criar/editar**: garantir que a recarga termine antes da impressão da etiqueta de entrada, para a nova compra sempre aparecer na lista.
5. Aplicar o mesmo tratamento nas outras telas que carregam listas de compras no mesmo padrão (quadro de processos e módulo de concluídos), para não repetir o problema.

## Detalhes técnicos

- `src/pages/PurchasesPage.tsx`: `reload()` passa a depender de `loading`/`session` do `useAuth`; adicionar `loadingList` e `loadError` no estado; ouvir `visibilitychange`/`focus` para revalidar; `await reload()` antes de `printEntryLabel`.
- `src/lib/purchases.ts` (`loadPurchases`): propagar/retornar o erro em vez de devolver `[]` silenciosamente, para a UI poder exibir "Tentar novamente".
- `src/components/purchases/NewPurchaseDialog.tsx`: `onCreated` passa a ser aguardado (`await`) nos pontos de criação/edição.
- Revisar `ProcessBoard.tsx` e `CompletedPage.tsx` para o mesmo padrão de recarga pós-autenticação.
