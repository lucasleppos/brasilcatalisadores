# Impedir que duas compras recebam o mesmo número

## Por que aconteceu

O número da compra é montado contando quantas compras já existem no dia e somando 1. Duas coisas quebram isso:

- Se duas compras são criadas quase ao mesmo tempo (dois usuários, ou dois cliques), as duas contam o mesmo total e recebem o mesmo número.
- Se uma compra do dia é excluída, a contagem volta atrás e o próximo número repete um já usado.

Hoje existem 8 números repetidos (020926-39, -51, -52, -55, 040926-26, 100926-26, 100926-33, 110926-27). Conforme sua decisão, eles ficam como estão.

## Correção

- Passar a gerar o número pelo **maior sufixo já usado no dia + 1**, em vez de contar registros — exclusões não fazem mais o número voltar.
- Reservar o dia durante a geração, para que duas inclusões simultâneas nunca recebam o mesmo número (a segunda espera a primeira e pega o seguinte).
- Travar no banco a repetição de número para as compras criadas de agora em diante; se por qualquer motivo houver colisão, a inclusão tenta automaticamente o número seguinte em vez de gravar duplicado.
- Os 8 pares antigos continuam intactos e não são renumerados.

## Verificação

- Criar duas compras seguidas e conferir que os números avançam sem repetir.
- Simular duas inclusões ao mesmo tempo e confirmar números distintos.
- Conferir que as compras antigas não mudaram.

## Detalhes técnicos

- Migração: reescrever `public.generate_purchase_number()` para `pg_advisory_xact_lock(hashtext('purchase_number_' || to_char(now(),'DDMMYY')))` + `max(split_part(purchase_number,'-',2)::int)` filtrando por `purchase_number LIKE '<DDMMYY>-%'`, com `COALESCE(...,0)+1` e `LPAD(...,2,'0')`.
- Migração: índice único parcial `create unique index purchases_purchase_number_unique on public.purchases (purchase_number) where created_at > '2026-09-14 18:00:00+00'`, para não conflitar com os duplicados existentes.
- `src/lib/purchases.ts` → `createPurchase`: envolver o insert em laço de até 5 tentativas; em erro `23505` (unique violation) chamar novamente a RPC e reinserir.
- Validação com `bunx tsgo --noEmit` e criação de duas compras de teste no preview autenticado (removidas depois).
