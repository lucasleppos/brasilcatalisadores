
# Manter Usuario Sempre Logado

## Problema
O sistema atual tem uma logica condicional de "Lembrar-me" que pode deslogar usuarios ao reabrir o navegador. Como o app sera usado continuamente com outros sistemas, a sessao deve sempre persistir.

## Solucao
Simplificar removendo a opcao "Lembrar-me" e garantindo que a sessao sempre persista via localStorage (comportamento padrao do cliente de autenticacao).

## Alteracoes

### 1. `src/contexts/AuthContext.tsx`
- Remover toda a funcao `checkRememberMe` que verifica o campo `remember_me` e faz signOut automatico
- Remover o uso de `sessionStorage` como marcador de sessao
- Manter apenas o fluxo padrao: listener de auth + getSession

### 2. `src/pages/LoginPage.tsx`
- Remover o estado `rememberMe` e o checkbox "Lembrar-me" da interface
- Remover a logica que salva `remember_me` no banco apos login
- Remover o uso de `sessionStorage`

### Resultado
O usuario fara login uma vez e permanecera logado ate fazer logout manualmente. A sessao sera renovada automaticamente pelo sistema de autenticacao (refresh token).

### Arquivos modificados
- `src/contexts/AuthContext.tsx`
- `src/pages/LoginPage.tsx`
