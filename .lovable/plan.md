
# Visualizacao, Edicao e Exclusao de Usuarios

## O que sera feito

Adicionar uma coluna "Acoes" na tabela de usuarios com botoes para visualizar, editar e excluir cada usuario. Incluir dialogos para cada acao.

## Alteracoes

### 1. Edge Function: `manage-user` (novo)
Criar uma nova Edge Function que aceita operacoes de **update** e **delete** de usuarios, pois essas acoes requerem o `service_role_key` (admin API) para:
- Atualizar perfil (`profiles`) e role (`user_roles`)
- Excluir usuario do `auth.users` (cascata remove profile e role)

A funcao verificara que o chamador e `super_admin` antes de executar qualquer operacao.

Acoes suportadas:
- `update`: atualiza `full_name`, `branch`, `job_title` no `profiles` e `role` no `user_roles`
- `delete`: remove o usuario via `adminClient.auth.admin.deleteUser(userId)`

### 2. `UsersPage.tsx` - Interface completa
- **Coluna "Acoes"** na tabela com 3 botoes (icones): Visualizar (Eye), Editar (Pencil), Excluir (Trash2)
- **Dialog de Visualizacao**: mostra todos os dados do usuario em modo leitura (nome, filial, cargo, perfil)
- **Dialog de Edicao**: formulario pre-preenchido para alterar nome, filial, cargo e perfil de acesso. Ao salvar, chama a Edge Function `manage-user` com acao `update`
- **Dialog de Exclusao**: confirmacao com AlertDialog antes de excluir. Ao confirmar, chama a Edge Function `manage-user` com acao `delete`
- Impedir que o usuario logado exclua a si mesmo
- Apos cada operacao bem-sucedida, recarregar a lista de usuarios

### Arquivos

| Arquivo | Acao |
|---|---|
| `supabase/functions/manage-user/index.ts` | Criar (Edge Function para update/delete) |
| `src/pages/UsersPage.tsx` | Editar (adicionar coluna acoes + 3 dialogos) |

### Detalhes tecnicos

- A Edge Function segue o mesmo padrao de seguranca do `invite-user`: verifica JWT, valida role `super_admin` via service role
- Para exclusao, usa `adminClient.auth.admin.deleteUser()` que cascateia a remocao do profile e role (FK com `on delete cascade`)
- Icones usados: `Eye`, `Pencil`, `Trash2` do lucide-react
- Dialog de exclusao usa `AlertDialog` para confirmacao explicita
