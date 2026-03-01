
# Gerenciamento de Usuarios e Controle de Acesso

## Resumo

Implementar sistema completo de autenticacao, perfis de usuario e controle de acesso baseado em papeis (RBAC), com login apenas por convite do Super Admin.

---

## Perfis de Acesso (6 roles)

| Role | Descricao | Acesso |
|------|-----------|--------|
| **super_admin** | Controle total | Tudo + Configuracoes + Gerenciar usuarios |
| **admin** | Visao completa operacional | Tudo exceto configuracoes e gestao de usuarios |
| **comprador** | Compras e fornecedores | Compras, fornecedores, processos (filial vinculada), bags (leitura) |
| **operacional** | Producao e bags | Processos, bags, alocacao (sem financeiro) |
| **laboratorio** | Analises | Inserir/editar resultados de analise, visualizar processos e bags |
| **visualizador** | Somente leitura | Ve tudo, nao edita nada |

### Visibilidade por filial
- Super Admin e Admin: veem dados de todas as filiais
- Comprador: ve dados da sua filial
- Demais: acesso conforme filial vinculada, mas configuravel

---

## Fluxo de Convite

1. Super Admin acessa pagina de "Usuarios" e clica "Convidar Usuario"
2. Preenche: email, nome, perfil (role), filial
3. Sistema envia email de convite com link para definir senha
4. Usuario clica no link, define senha e acessa o sistema
5. Perfil ja criado automaticamente com os dados preenchidos pelo admin

---

## Estrutura do Banco de Dados

### Tabela `profiles`
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK, referencia auth.users(id) |
| full_name | text | Nome completo |
| avatar_url | text | URL da foto |
| phone | text | Telefone |
| branch | text | Filial vinculada |
| job_title | text | Cargo/funcao |
| created_at | timestamptz | |

### Tabela `user_roles` (tabela separada por seguranca)
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK para auth.users(id) |
| role | app_role (enum) | super_admin, admin, comprador, operacional, laboratorio, visualizador |

### Enum `app_role`
```text
super_admin, admin, comprador, operacional, laboratorio, visualizador
```

### Funcao `has_role()`
Funcao SECURITY DEFINER para verificar role sem recursao em RLS.

### Trigger
Ao criar usuario via convite, trigger cria automaticamente o registro em `profiles`.

---

## Implementacao Frontend

### Paginas novas

| Pagina | Rota | Descricao |
|--------|------|-----------|
| Login | `/login` | Email + senha, sem opcao de auto-cadastro |
| Usuarios | `/usuarios` | Lista, convite e edicao (somente super_admin) |
| Perfil | `/perfil` | Usuario edita seu proprio nome, avatar, telefone |

### Componentes novos

| Componente | Descricao |
|------------|-----------|
| `AuthProvider` | Context de autenticacao com sessao e role |
| `ProtectedRoute` | Wrapper que redireciona para login se nao autenticado |
| `RoleGate` | Componente que mostra/esconde conteudo conforme role |
| `InviteUserDialog` | Dialog para super_admin convidar novo usuario |
| `UserList` | Tabela de usuarios com edicao de role e filial |
| `ProfilePage` | Pagina de perfil do usuario logado |
| `LoginPage` | Pagina de login simples |

### Alteracoes em arquivos existentes

| Arquivo | Alteracao |
|---------|-----------|
| `App.tsx` | Envolver rotas com AuthProvider, adicionar ProtectedRoute, novas rotas |
| `AppSidebar.tsx` | Mostrar/esconder itens conforme role do usuario logado |
| `AppLayout.tsx` | Adicionar avatar/nome do usuario no header, botao de logout |
| `SettingsPage.tsx` | Restringir acesso somente a super_admin |

### Controle de visibilidade no sidebar

```text
Dashboard        -> todos
Compras          -> super_admin, admin, comprador
Fornecedores     -> super_admin, admin, comprador
Processos        -> super_admin, admin, operacional, laboratorio
Bags             -> super_admin, admin, operacional, comprador (leitura)
Relatorios       -> super_admin, admin
Calculadora      -> todos
Configuracoes    -> super_admin
Usuarios         -> super_admin
```

---

## Secao Tecnica

### RLS Policies
- `profiles`: usuario le/edita somente o proprio perfil; super_admin le todos
- `user_roles`: somente leitura via funcao `has_role()`; super_admin pode inserir/atualizar
- Tabelas existentes (purchases, bags, etc): manter acesso aberto por enquanto, restringir em fase posterior se necessario

### Auth Flow
- Usar `supabase.auth.admin.inviteUserByEmail()` via Edge Function (pois requer service role key)
- Edge Function `/invite-user`: recebe email, nome, role, filial; cria convite e insere em profiles e user_roles
- `onAuthStateChange` no frontend para manter sessao
- Redirect para `/login` se nao autenticado

### Primeiro Super Admin
- Seed inicial: o primeiro usuario sera criado manualmente ou via Edge Function especial
- Flag de setup: se nenhum usuario existir, permitir criacao do primeiro super_admin

### Ordem de implementacao
1. Migracao de banco (enum, profiles, user_roles, funcao has_role, trigger)
2. Edge Function de convite
3. AuthProvider + LoginPage + ProtectedRoute
4. Pagina de Usuarios (convite + lista)
5. Pagina de Perfil
6. Controle de visibilidade no sidebar e rotas
