

# Criar Usuários de Teste para cada Perfil

## Problema
O sistema atual usa convites por email, o que exige confirmação de email e torna o teste lento. Para testar o fluxo de aprovação por etapas, precisamos de contas temporárias com login direto para cada perfil.

## Solução
Criar uma Edge Function `seed-test-users` que cria automaticamente um usuário de teste para cada perfil com senha conhecida, e um botão na página de Usuários (visível apenas para super_admin) para acionar essa função.

## Usuários que serão criados

```text
Perfil         │ Email                          │ Senha
───────────────┼────────────────────────────────┼──────────
operacional    │ teste.operacional@teste.com    │ Teste123!
laboratorio    │ teste.laboratorio@teste.com    │ Teste123!
admin          │ teste.admin@teste.com          │ Teste123!
comprador      │ teste.comprador@teste.com      │ Teste123!
visualizador   │ teste.visualizador@teste.com   │ Teste123!
```

## Arquivos

### 1. `supabase/functions/seed-test-users/index.ts` (criar)
- Verifica que o chamador é `super_admin`
- Usa `adminClient.auth.admin.createUser()` com `email_confirm: true` para pular verificação de email
- Cria profile e user_role para cada um
- Se o email já existir, ignora (idempotente)
- Retorna a lista de usuários criados

### 2. `supabase/config.toml` (editar)
- Adicionar entrada `[functions.seed-test-users]` com `verify_jwt = false`

### 3. `src/pages/UsersPage.tsx` (editar)
- Adicionar botão "Criar Usuários de Teste" ao lado do botão de convite
- Ao clicar, chama a edge function e exibe toast com resultado
- Após sucesso, recarrega a lista de usuários

## Segurança
- A função valida o JWT do chamador e verifica que é `super_admin` antes de executar
- Os usuários de teste são criados com a flag `email_confirm: true` para pular verificação
- É idempotente — chamar várias vezes não duplica usuários

