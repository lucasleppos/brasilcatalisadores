# Acesso do comprador aos seus próprios dados

## O que está acontecendo hoje

O app já tenta limitar o comprador, mas compara **exatamente** o nome do perfil do usuário com o nome do comprador gravado nas compras e nos fornecedores. Na prática:

- O perfil do Marcos está salvo como `Marcos Teixeira`.
- As compras e fornecedores dele estão gravados como `MARCOS ROBERTO TEIXEIRA` (38 compras / 74 fornecedores) e `MARCOS TEIXEIRA` (1 compra / 1 fornecedor).

Como os textos não são idênticos, o filtro devolve lista vazia — foi isso que apareceu no teste.

Além disso, as telas **Processos**, **Concluídos** e **Bags/Alocação** não aplicam nenhum recorte por comprador: quem tiver acesso vê tudo.

## O que vamos fazer

1. **Vincular o usuário aos nomes de comprador** em vez de depender do nome do perfil. Na tela de Usuários, o Super Admin escolhe (podendo marcar mais de um) os nomes de comprador que pertencem àquele usuário, a partir da lista de nomes já existentes nas compras e fornecedores. Para o Marcos: `MARCOS ROBERTO TEIXEIRA` e `MARCOS TEIXEIRA`.
2. **Comparação tolerante**: ignorar maiúsculas/minúsculas, acentos e espaços duplicados, para que pequenas diferenças de digitação não escondam registros.
3. **Aplicar o recorte nas telas pertinentes**: Compras, Fornecedores, Processos, Concluídos e Bags. O comprador vê apenas os registros dos nomes vinculados a ele; nas telas onde já existe o seletor "Todos compradores", ele continua oculto para o comprador.
4. **Sem mudança para os outros perfis**: Super Admin, Admin, Laboratório e Operacional continuam vendo tudo como hoje.

## Detalhes técnicos

- Nova coluna `profiles.buyer_names text[]` (padrão `{}`), preenchida pelo Super Admin; migração + grants/RLS já existentes de `profiles` mantidos.
- Helper `normalizeName()` e `matchesBuyer(profile, buyer)` em `src/lib/purchases.ts` (ou `src/lib/utils.ts`), usados por todas as telas.
- `AuthContext.Profile` passa a expor `buyer_names`; `usePermissions` não muda.
- Ajustes: `src/pages/PurchasesPage.tsx`, `src/pages/SuppliersPage.tsx`, `src/pages/BagsPage.tsx`, `src/pages/CompletedPage.tsx`, `src/components/processes/ProcessBoard.tsx` + `MobileProcessBoard.tsx` (filtrar `purchases` carregadas), `src/components/users/UserActions.tsx` (seleção múltipla de nomes de comprador).
- O recorte é de apresentação (client-side), igual ao padrão atual; endurecer via RLS pode ser um passo futuro se você quiser bloqueio no banco.
