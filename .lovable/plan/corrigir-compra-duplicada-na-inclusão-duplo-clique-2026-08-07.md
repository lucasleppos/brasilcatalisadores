# Corrigir compra duplicada na inclusão (duplo clique)

## O que aconteceu (confirmado no banco)

Existem duas compras do JUNIO CESAR criadas com **1,7 segundo de diferença**:

- `070826-07` — criada 14:02:52, 4 un declaradas, apenas o item placeholder (1 pç) → aparece como "1 peça"
- `070826-08` — criada 14:02:54, 4 un declaradas, com as 4 peças da conferência (seq 1..4, pesos 3,585 / 4,295 / 3,795 / 3,58 kg)

Não é duplicação de itens: são **duas compras inteiras**, geradas por um duplo clique no botão de confirmar
do diálogo de nova compra. O botão não tem trava de envio (`handleConfirm` em
`src/components/purchases/NewPurchaseDialog.tsx`) — ele só valida fornecedor/peso/foto, e cada clique dispara
um `createPurchase` completo, incluindo um novo número de pedido pelo banco.

A "cópia com 1 peça" é a compra `070826-07`: ela ficou apenas com o item placeholder criado na inclusão,
porque a conferência das 4 peças foi feita na outra compra (`070826-08`).

## Correção

1. **Trava de envio no diálogo de compra** (`NewPurchaseDialog.tsx`):
   - estado `saving`; `handleConfirm` retorna imediatamente se já estiver salvando;
   - botão desabilitado e com texto/spinner "Salvando..." enquanto a requisição está em curso;
   - `saving` liberado no `finally`, inclusive em caso de erro, e resetado ao abrir/fechar o diálogo.
2. **Proteção contra compra repetida no banco** (`createPurchase` em `src/lib/purchases.ts`):
   antes de inserir, checar se já existe compra do mesmo fornecedor criada nos últimos 60 segundos
   ainda em "Em Conferência" com o mesmo total declarado; nesse caso reaproveitar/retornar a existente
   em vez de criar outra, e avisar o usuário ("Compra já registrada há instantes").
3. **Confirmação de quantidades no fluxo** — tornar visível e travado o confronto declarado × conferido:
   - Conferência (Peça / Peça em Sacola): mostrar contador `conferidas X / meta Y`
     (meta = declarado − devolvidas − separadas) e bloquear o encerramento da etapa
     quando X ≠ Y, com mensagem explicando a diferença;
   - Etapas seguintes (Trituração, Laboratório, Precificação, Aprovação): exibir o mesmo contador
     no cabeçalho do card e alertar se a contagem de itens em processo divergir da conferida;
   - Cerâmico: mesma checagem em peso (bruto declarado × soma dos grupos conferidos) com aviso de divergência.
4. **Limpeza dos dados**: remover a compra duplicada `070826-07` (a que ficou só com o placeholder),
   mantendo `070826-08` com as 4 peças conferidas.

## Arquivos afetados

- `src/components/purchases/NewPurchaseDialog.tsx` — trava anti-duplo-clique.
- `src/lib/purchases.ts` — guarda de compra duplicada em `createPurchase` e helper de contagem declarado × conferido.
- `src/components/processes/SacolaConferenciaPanel.tsx`, `SacolaTrituracaoPanel.tsx`, `SacolaLabPanel.tsx`,
  `SacolaPricingPanel.tsx`, `PiecePricingPanel.tsx`, `CeramicoConferenciaPanel.tsx` — contador e validação de quantidades.
- Operação de escrita no banco para excluir a compra duplicada `070826-07` e seu item placeholder.

