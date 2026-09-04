# Lista de compradores no cadastro do fornecedor

## Problema

No cadastro do fornecedor o campo **Comprador** é digitado livremente. Isso cria variações do mesmo comprador (por exemplo "MARCOS ROBERTO TEIXEIRA" e "MARCOS TEIXEIRA"), que quebram os filtros e a visão do comprador.

## O que vamos fazer

1. **Fonte única de compradores: o módulo de Usuários.**
   A lista oficial passa a ser formada pelos usuários com perfil de comprador, usando os nomes de comprador já vinculados a cada usuário (o campo que o Super Admin preenche na tela de Usuários) e, quando não houver nenhum vinculado, o nome completo do usuário.

2. **Cadastro do fornecedor com seleção, não digitação.**
   O campo Comprador vira um campo de busca com a lista de compradores cadastrados (mesmo estilo do campo de Fornecedor na Nova Compra). Só é possível escolher um nome da lista.
   - Se o fornecedor já tiver um comprador gravado que não esteja na lista (dados antigos), o valor atual continua visível e marcado como "fora da lista", para o Super Admin corrigir.
   - Se ainda não houver nenhum comprador cadastrado, o campo mostra um aviso indicando que os compradores são cadastrados no módulo de Usuários.

3. **Tela de Usuários separada em duas listas.**
   Duas abas: **Compradores** e **Usuários** (os demais perfis). Na aba Compradores aparece também a coluna com os nomes de comprador vinculados, para deixar claro qual nome será usado nas compras e fornecedores.

4. **Importação de fornecedores por Excel**: continua aceitando o nome escrito na planilha, mas passa a avisar quantas linhas trazem um comprador que não está na lista oficial, para revisão.

## Fora do escopo

- Não vamos renomear em massa os compradores já gravados nas compras e nos fornecedores. Se você quiser, faço isso depois como um ajuste separado (indicando quantos registros mudam antes de aplicar).

## Detalhes técnicos

- Novo helper `src/lib/buyers.ts`: `loadBuyerOptions()` — chama a Edge Function `manage-user` (action `list`, já retorna `buyer_names` e `role`), filtra usuários cujo perfil é de comprador e devolve nomes únicos ordenados (`buyer_names` ou fallback `full_name`), usando `normalizeName` de `src/lib/buyer-scope.ts` para deduplicar.
- `src/components/suppliers/SupplierForm.tsx`: trocar o `Input` de Comprador pelo `SearchableSelect` (`src/components/ui/searchable-select.tsx`), alimentado por `loadBuyerOptions()`; incluir a opção legada quando `initial.buyer` não estiver na lista.
- `src/pages/UsersPage.tsx`: `Tabs` (Compradores / Usuários) sobre a mesma lista `users`, particionada pelo `role` de comprador; coluna "Nomes de comprador" apenas na aba Compradores.
- `src/components/suppliers/SupplierImport.tsx`: comparar `buyer` de cada linha com as opções normalizadas e exibir contagem de divergências no resumo da pré-visualização.
- Sem mudanças de banco de dados.
