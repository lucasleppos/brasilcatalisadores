# Cadastro manual de usuários (apenas Super Admin)

## Objetivo

Trocar o fluxo de "convite por e-mail" por **cadastro manual direto**, feito exclusivamente pelo Super Admin, e remover os usuários de teste.

## O que muda na tela de Usuários

- Botão passa a ser **"Novo Usuário"** (não "Convidar Usuário"), visível apenas para o Super Admin.
- Formulário: **E-mail**, **Senha** (mínimo 8 caracteres, com botão para gerar senha sugerida), **Nome completo**, **Perfil de acesso**, **Filial**, **Cargo**.
- O usuário é criado já **ativo e confirmado**, sem depender de e-mail. O admin repassa a senha ao colaborador.
- Após criar, a tela mostra a senha definida uma única vez, com botão de copiar.
- Nova coluna **E-mail** e coluna **Status** (Ativo / Nunca acessou) na listagem.
- No editar usuário: opção **"Redefinir senha"** (Super Admin define uma nova senha manualmente).
- Remoção do botão "Criar Usuários de Teste".

## Regra de acesso

- Criar, editar senha e excluir usuários: **somente Super Admin**, validado no servidor (não só na interface).
- Perfis que hoje têm `usuarios.create` deixam de poder criar contas; o menu continua visível para consulta conforme a permissão de acesso.

## Exclusão dos usuários de teste

Serão excluídos definitivamente (login, perfil e permissão):

- teste.admin@teste.com (Teste Admin)
- teste.comprador@teste.com (Teste Comprador)
- teste.laboratorio@teste.com (Laboratorio)
- teste.visualizador@teste.com (Operador)

Antes de excluir, verifico se algum deles é autor de registros de processo/histórico; se houver, o registro histórico é preservado (campos de autoria ficam sem vínculo) para não perder rastreabilidade.

## Detalhes técnicos

- Nova ação `create` na função `manage-user`: valida sessão, exige perfil `super_admin`, cria o usuário com `auth.admin.createUser({ email, password, email_confirm: true })`, grava `profiles` e `user_roles`, com rollback do usuário se qualquer etapa falhar. Erros claros para e-mail já existente e senha curta.
- Nova ação `reset_password` (`auth.admin.updateUserById`), também restrita a `super_admin`.
- `manage-user`: as ações `update`/`delete` passam a exigir `super_admin` além da permissão do módulo.
- Nova ação `list` (service role) devolvendo `email`, `last_sign_in_at` e perfil, para a listagem exibir e-mail e status — hoje `UsersPage` lê só `profiles`/`user_roles` e deixa o e-mail vazio.
- `src/pages/UsersPage.tsx`: novo diálogo de criação, colunas Email/Status, remoção do seed de teste; `src/components/users/UserActions.tsx`: redefinir senha.
- A função `invite-user` e a função `seed-test-users` deixam de ser usadas e serão removidas.
- Exclusão dos 4 usuários de teste feita via operação administrativa no back-end (não por SQL na tabela de autenticação).
