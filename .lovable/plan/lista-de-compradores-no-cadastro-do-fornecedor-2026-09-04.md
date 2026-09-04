# Lista de compradores no cadastro do fornecedor

## Problema

No cadastro do fornecedor o campo **Comprador** é digitado livremente. Isso cria variações do mesmo comprador (por exemplo "MARCOS ROBERTO TEIXEIRA" e "MARCOS TEIXEIRA"), que quebram os filtros e a visão do comprador.

## O que vamos fazer

1. **Fonte única de compradores: o módulo de Usuários.**
   A lista oficial passa a ser formada pelos usuários com perfil de comprador, usando os nomes de comprador já vinculados a cada usuário (o campo que o Super Admin preenche na tela de Usuários) e, quando não houver nenhum vinculado, o nome completo do usuário.

2. **No cadastro do fornecedor, escolher da lista fica disponível — sem obrigar.**
   O campo Comprador passa a oferecer a lista de compradores já cadastrados como usuários, e continua aceitando texto digitado. Nada é alterado automaticamente.
   - Fornecedores já cadastrados mantêm exatamente o comprador que está gravado hoje; o valor aparece normalmente, mesmo que ainda não exista um usuário correspondente.
   - Enquanto não houver compradores cadastrados como usuários, o campo funciona como hoje, com uma nota discreta indicando onde cadastrá-los.

3. **Tela de Usuários separada em duas listas.**
   Duas abas: **Compradores** e **Usuários** (os demais perfis). Na aba Compradores aparece também a coluna com os nomes de comprador vinculados, para deixar claro qual nome será usado nas compras e fornecedores.

## Fora do escopo (não será tocado)

- Nenhuma alteração nos fornecedores, compras ou qualquer registro já vinculado a um comprador.
- Nenhuma renomeação em massa e nenhum aviso/bloqueio na importação de fornecedores por Excel — ela segue igual.
- Nenhum campo passa a ser obrigatório. Você cadastra os compradores como usuários no seu ritmo e, quando quiser, faz o vínculo.

## Detalhes técnicos

- Novo helper `src/lib/buyers.ts`: `loadBuyerOptions()` — chama a Edge Function `manage-user` (action `list`, já retorna `buyer_names` e `role`), filtra usuários cujo perfil é de comprador e devolve nomes únicos ordenados (`buyer_names` ou fallback `full_name`), usando `normalizeName` de `src/lib/buyer-scope.ts` para deduplicar.
- `src/components/suppliers/SupplierForm.tsx`: campo Comprador com sugestões da lista (combobox permitindo valor livre), preservando `initial.buyer` como valor válido; nenhuma normalização ou reescrita do valor salvo.
- `src/pages/UsersPage.tsx`: `Tabs` (Compradores / Usuários) sobre a mesma lista `users`, particionada pelo `role` de comprador; coluna "Nomes de comprador" apenas na aba Compradores.
- `SupplierImport.tsx`, `NewPurchaseDialog.tsx`, `purchases` e `suppliers` permanecem intocados.
- Sem mudanças de banco de dados e sem scripts de atualização de dados.
