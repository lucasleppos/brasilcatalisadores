

# Lembrar Usuario Logado (com persistencia no banco)

## Abordagem

Adicionar a preferencia "Lembrar-me" como campo na tabela `profiles` no banco de dados, garantindo que nenhum dado de usuario fique em armazenamento temporario. O controle de sessao usara essa preferencia para decidir se a sessao persiste apos fechar o navegador.

## Alteracoes

### 1. Migracao de banco de dados
- Adicionar coluna `remember_me` (boolean, default `true`) na tabela `profiles`

### 2. LoginPage.tsx
- Adicionar checkbox "Lembrar-me" (default marcado) entre senha e botao Entrar
- Apos login bem-sucedido, salvar a preferencia no campo `remember_me` do perfil do usuario
- Se desmarcado, mover a sessao do Supabase de `localStorage` para `sessionStorage` (sessao expira ao fechar navegador)

### 3. AuthContext.tsx
- Ao carregar sessao existente, consultar o campo `remember_me` do perfil
- Se `remember_me = false` e a sessao esta em `localStorage` mas nao ha marcador em `sessionStorage`, significa que o navegador foi reaberto -- fazer `signOut()` automatico
- Usar `sessionStorage` como marcador de "aba ativa" (apenas um flag tecnico de controle de sessao, nao dado de usuario)

## Detalhe tecnico

O campo `remember_me` fica permanentemente no banco. O unico uso de `sessionStorage` e um flag efemero (`session_active`) que indica se a aba/navegador esta aberta -- isso e inerente ao funcionamento do navegador e nao constitui dado de usuario. Fluxo:

1. Login com "Lembrar-me" desmarcado -> grava `remember_me = false` no perfil (banco)
2. Seta `sessionStorage.session_active = true` (flag de aba)
3. Navegador aberto -> tudo funciona normal
4. Fecha navegador -> `sessionStorage` limpa automaticamente
5. Reabre -> AuthProvider ve `remember_me = false` no banco + sem `session_active` -> faz signOut

### Arquivos modificados
- Nova migracao SQL (adicionar coluna `remember_me`)
- `src/pages/LoginPage.tsx`
- `src/contexts/AuthContext.tsx`

