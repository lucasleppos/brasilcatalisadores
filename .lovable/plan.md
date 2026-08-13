# Replicar o layout mobile do projeto de origem (COPIA - Catalyst Flow)

Objetivo: trazer para este projeto exatamente o layout mobile já validado no projeto de origem, mantendo o desktop intacto, além das duas correções de robustez (carregamento de permissões e funções de backend de usuários).

## O que muda para o usuário

- Em telas pequenas (celular), o app passa a usar um layout próprio: barra inferior de abas, cabeçalho compacto, botão flutuante de ação, listas em cartões e painéis abertos em folhas deslizantes (sheets), em vez das tabelas e da sidebar de desktop.
- Telas com versão mobile: Processos, Compras, Concluídos e Bags. Em Bags há abas rápidas (Bags / Alocar / Filiais / Análise).
- No desktop nada muda visualmente.
- Correção: ao entrar no app, a tela deixa de redirecionar para a Home antes das permissões carregarem (o spinner aguarda o perfil/role).
- Correção: convite de usuário e criação do primeiro administrador passam a falhar com mensagem clara (e sem deixar usuário "órfão") quando o perfil ou o papel não puderem ser gravados.

## Arquivos copiados do projeto de origem (novos aqui)

- `src/components/mobile/MobileLayout.tsx`, `MobileTabBar.tsx`, `MobileListRow.tsx`, `MobileSearchBar.tsx`, `MobileSheet.tsx`, `MobileFab.tsx`
- `src/components/processes/MobileProcessBoard.tsx`
- `src/components/purchases/MobilePurchaseList.tsx`, `src/components/purchases/MobileCompletedList.tsx`
- `src/components/bags/MobileBagsList.tsx`
- `src/lib/process-group-ui.ts`

## Edições em arquivos existentes (idênticas à origem)

- `src/components/AppLayout.tsx`: usa `useIsMobile()`; renderiza `MobileLayout` no mobile e move o layout atual para `DesktopLayout`.
- `src/pages/ProcessesPage.tsx`: `MobileProcessBoard` no mobile.
- `src/components/processes/ProcessBoard.tsx`: exportar `ProcessGroup`, `PROCESS_GROUPS` e `canRoleSeeGroup` (reuso pelo board mobile).
- `src/pages/PurchasesPage.tsx`, `src/pages/CompletedPage.tsx`, `src/pages/BagsPage.tsx`: ramo mobile reaproveitando estados/filtros já existentes (busca, permissões, detalhe em sheet).
- `src/contexts/AuthContext.tsx`: adicionar `roleLoading` (true até perfil/role resolverem, com `finally` para não travar em erro).
- `src/components/ProtectedRoute.tsx`: aguardar `loading || (user && roleLoading) || permLoading`.

## Backend (funções)

- `supabase/functions/invite-user/index.ts`: `upsert` do perfil por `id`, e retorno de erro 500 explícito se perfil ou papel falharem.
- `supabase/functions/setup-first-admin/index.ts`: validar que o perfil de permissão `super_admin` existe antes de prosseguir; `upsert` do perfil; rollback (`deleteUser`) se perfil/papel falharem.
- Ambas as funções serão reimplantadas. Observação técnica: este projeto possui o trigger `on_auth_user_created` criando a linha em `profiles`; o `upsert` com `onConflict: id` é compatível com isso.

## Verificação

- Typecheck do projeto.
- Conferir a UI em viewport mobile (Processos, Compras, Concluídos, Bags) e confirmar que o desktop segue igual.
