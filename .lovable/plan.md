

# Sistema de Gerenciamento de Permissões Dinâmico

## Visão Geral
Criar um sistema completo onde o super_admin pode definir **perfis customizados** com permissões granulares (por módulo, ação e campo), tudo configurável via interface — sem necessidade de alterar código.

## Nova Tabela: `permissions`

```text
id          │ uuid (PK)
role_name   │ text (unique) — nome do perfil (ex: "comprador_jr")
label       │ text — nome amigável (ex: "Comprador Júnior")
permissions │ jsonb — objeto com todas as permissões
created_at  │ timestamptz
```

Estrutura do JSONB `permissions`:
```json
{
  "modules": {
    "compras": {
      "access": true,
      "actions": { "create": true, "edit": true, "delete": false },
      "hidden_fields": ["total_brl"]
    },
    "fornecedores": {
      "access": true,
      "actions": { "create": true, "edit": true, "delete": false, "import": false },
      "hidden_fields": ["margin"]
    },
    "processos": {
      "access": true,
      "actions": { "advance_stage": true },
      "hidden_fields": []
    },
    "bags": { "access": false },
    "relatorios": { "access": false },
    "calculadora": { "access": true, "actions": { "custom_quotes": false } },
    "configuracoes": { "access": false },
    "usuarios": { "access": false }
  }
}
```

## Migração para perfis dinâmicos

### Mudança na tabela `user_roles`
- Alterar a coluna `role` de `app_role` (enum) para `text`, referenciando `permissions.role_name`
- Inserir registros na tabela `permissions` para os 6 perfis atuais com as permissões equivalentes ao comportamento atual (compatibilidade retroativa)

### Seed dos perfis padrão
Os 6 perfis existentes serão pré-cadastrados na tabela `permissions` com as permissões que já funcionam hoje, garantindo que nada quebre.

## Arquivos e Mudanças

### 1. Migração SQL
- Criar tabela `permissions` com RLS (super_admin gerencia, autenticados leem)
- Inserir os 6 perfis padrão
- Alterar `user_roles.role` de enum para text
- Criar função `get_user_permissions(uuid)` (security definer) para uso em RLS e no frontend

### 2. `src/lib/permissions.ts` (novo)
- Tipo `PermissionConfig` com a estrutura do JSONB
- Hook `usePermissions()` que carrega as permissões do perfil do usuário logado
- Funções utilitárias: `canAccess(module)`, `canDo(module, action)`, `isFieldHidden(module, field)`
- Cache via React Query para evitar chamadas repetidas

### 3. `src/contexts/AuthContext.tsx` (editar)
- Remover o tipo `AppRole` como enum fixo, torná-lo `string`
- Carregar permissões junto com o perfil (ou sob demanda via hook)

### 4. `src/pages/PermissionsPage.tsx` (novo) — Tela de Configuração de Perfis
- Lista todos os perfis existentes em cards
- Ao clicar num perfil, abre editor com:
  - Nome e label do perfil
  - Grid de módulos com toggles para acesso, criar, editar, excluir
  - Lista de campos ocultáveis por módulo (checkboxes)
- Botão "Novo Perfil" para criar perfis customizados
- Botão "Excluir" (impede excluir os 6 padrão)
- Salva no banco via `supabase.from("permissions").update()`

### 5. `src/components/ProtectedRoute.tsx` (editar)
- Substituir checagem de `allowedRoles` por `canAccess(module)`
- Mapear rota → módulo automaticamente

### 6. `src/components/AppSidebar.tsx` (editar)
- Substituir `allowedRoles` dos menuItems por verificação dinâmica `canAccess(module)`

### 7. `src/components/RoleGate.tsx` (editar)
- Aceitar `module` + `action` ao invés de `allowedRoles`
- Exemplo: `<RoleGate module="compras" action="delete">` esconde o botão de excluir

### 8. Páginas existentes (editar gradualmente)
- **PurchasesPage**: usar `canDo("compras", "create/edit/delete")` para mostrar/esconder botões; `isFieldHidden("compras", "total_brl")` para esconder coluna de valor
- **SuppliersPage**: mesma lógica para ações e campo `margin`
- **BagsPage**: controlar acesso e ações
- **ProcessBoard**: já usa `canUserActOnStage`, adaptar para novo sistema
- **UsersPage**: restringir por `canAccess("usuarios")`

### 9. `src/App.tsx` (editar)
- Substituir `allowedRoles={[...]}` por `module="compras"` etc. no ProtectedRoute

### 10. Rota e sidebar
- Adicionar `/permissoes` como rota protegida (super_admin)
- Adicionar item "Permissões" no sidebar com ícone Shield

## Fluxo do Super Admin
1. Acessa `/permissoes`
2. Vê os 6 perfis padrão + qualquer perfil customizado
3. Pode criar "Comprador Júnior" com acesso a compras (só leitura) e fornecedores (sem excluir)
4. Pode editar o perfil "Operacional" para esconder campos financeiros
5. Ao criar um novo usuário, o dropdown de perfis mostra todos os perfis cadastrados

## Compatibilidade
- Os 6 perfis padrão mantêm exatamente o mesmo comportamento atual
- A migração é feita em uma transação para garantir consistência
- Edge functions (`manage-user`, `invite-user`, `seed-test-users`) precisam ser atualizadas para usar `text` ao invés do enum

