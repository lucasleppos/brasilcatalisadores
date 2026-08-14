# Diagnóstico e correção do convite de usuários

## O que foi verificado agora

- A função de convite **está no ar e respondendo**: uma chamada de teste retornou a validação esperada (`Invalid role`), com o token da sessão atual. Ou seja, o front-end tem como falar com o back-end.
- **Nenhum usuário novo foi criado desde 17/06/2026** (`auth.users` mais recente: gabriel@brasilreciclagem.com.br). Os testes recentes não geraram usuário algum.
- **Não há registro de log recente da função de convite**, então as tentativas de teste provavelmente falharam antes de chegar ao servidor (erro de rede/permissão no navegador) ou foram feitas em outra sessão.
- **Nenhum domínio de e-mail está configurado no projeto.** Os e-mails de autenticação saem pelo remetente padrão, que tem limite baixo por hora e alta chance de cair em spam — convite "enviado" sem e-mail chegando.
- **O convite não define página de destino**: o link do convite não aponta para nenhuma tela do app que permita o convidado definir a senha. Existe `/reset-password`, mas ela não trata o token de convite.
- A tela de Usuários **não mostra o e-mail nem o status do convite** (pendente/ativo), então quem foi convidado fica indistinguível de quem já usa o sistema.

## Correções propostas

1. **Tela de Usuários mais informativa**
   - Listar e-mail e status de cada usuário: "Convite pendente" (sem primeiro acesso) x "Ativo".
   - Ação de **reenviar convite** e de **cancelar convite** para pendentes.
   - Mensagens de erro do servidor exibidas por completo (hoje algumas somem).

2. **Fluxo do link de convite**
   - O convite passa a apontar para uma página de aceite do app (`/definir-senha`), que valida o token, pede a senha e leva o usuário direto para dentro do sistema.
   - Tratamento de link expirado/já usado com opção de pedir novo convite.

3. **Robustez do back-end de convite**
   - Erros distintos e claros para: e-mail já cadastrado, limite de envio de e-mail atingido, perfil inválido, falha ao criar perfil/permissão (com desfazimento do usuário parcial).
   - Retorno do status de envio do e-mail para a interface, em vez de sempre "convite enviado".

4. **Entrega de e-mail**
   - Configurar o domínio de envio do projeto para que convites e recuperação de senha cheguem de forma confiável e com a identidade da empresa. Isso exige um domínio próprio (ex.: brasilreciclagem.com.br) e a inclusão dos registros de DNS.
   - Alternativa imediata, enquanto o domínio não estiver ativo: opção de **criar usuário com senha temporária** (sem depender de e-mail), entregue pelo administrador, com troca obrigatória no primeiro acesso.

## Detalhes técnicos

- `supabase/functions/invite-user/index.ts`: adicionar `redirectTo` (`${origin}/definir-senha`), diferenciar erros (429/limite de e-mail, `email_exists`), rollback de `auth.users` quando `profiles`/`user_roles` falhar, e nova ação de reenvio.
- Nova função (ou ação na existente) para listar usuários com `email`, `invited_at`, `last_sign_in_at` via service role — hoje `UsersPage` lê só `profiles`/`user_roles` e deixa `email` vazio.
- `src/pages/UsersPage.tsx`: colunas Email e Status, botões reenviar/cancelar, tratamento de erro unificado.
- Nova página `src/pages/AcceptInvitePage.tsx` + rota `/definir-senha`, tratando token de convite (hash/`code`) e `updateUser({ password })`.
- Envio de e-mail: `setup_email_infra` + templates de auth após verificação de DNS do domínio.

## Ordem de execução

1. Listagem com e-mail/status + erros claros (visibilidade imediata).
2. Página de aceite + `redirectTo` no convite.
3. Reenviar/cancelar convite e criação com senha temporária.
4. Configuração do domínio de e-mail (depende do domínio e do DNS).
