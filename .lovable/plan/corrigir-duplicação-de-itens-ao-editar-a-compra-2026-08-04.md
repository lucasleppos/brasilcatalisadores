# Corrigir duplicação de itens ao editar a compra

## O que aconteceu (confirmado no banco)

Na compra `04/08/2026 - 01` (fluxo sacola, status "Peças: Alocado ao Bag") existem 20 itens:
10 originais gravados às 14:30:55 (com `seq` 1..10 e `catalog_part_id`) e 10 cópias criadas
às 14:38:09 **sem `seq` e sem `catalog_part_id`** — exatamente o horário do clique em Editar → Salvar.

Causa: em `updatePurchase` (src/lib/purchases.ts:803) o salvamento apaga só os itens sem
`catalog_part_id` e depois **insere de novo todos os itens da tela**. O diálogo de edição
(`NewPurchaseDialog`, mapeamento em `setItems` no `useEffect`) não carrega `catalogPartId`
nem `seq`, então os itens da conferência são reinseridos como novas linhas "soltas",
duplicando peças, peso e valor.

## Correção

1. **Reconciliação por id em `updatePurchase`** (em vez de apagar/inserir tudo):
   - itens da tela que já têm `id` existente → `update` da linha (preservando `catalog_part_id`, `seq`, `weight_real`, `weight_loss`);
   - itens novos (id não existente no banco) → `insert`;
   - linhas do banco que não estão mais na tela → `delete`;
   - itens de conferência (`category` = `conferencia` / `conferencia_excluida`) nunca são recriados.
2. **Preservar campos no diálogo**: incluir `catalogPartId` e `seq` no mapeamento de
   `editPurchase.items` para `PendingItem`, e reenviá-los no salvamento.
3. **Proteger etapas avançadas**: quando a compra já passou da conferência
   (fluxo peças/sacola/cerâmico com itens de conferência gravados), a edição mostra os itens
   em modo leitura — o detalhamento é feito nos painéis de cada etapa, não nesse diálogo.
   Assim um "Salvar" sem alterações não muda nada.
4. **Limpeza dos dados da simulação**: remover as 10 linhas duplicadas criadas às 14:38 da
   compra `04/08/2026 - 01` (as que estão sem `seq`/`catalog_part_id`), restaurando o total.

## Arquivos afetados

- `src/lib/purchases.ts` — reescrita de `updatePurchase` com reconciliação por id.
- `src/components/purchases/NewPurchaseDialog.tsx` — manter `catalogPartId`/`seq` e modo leitura em etapas avançadas.
- Limpeza de dados via operação de escrita nos itens duplicados dessa compra.
