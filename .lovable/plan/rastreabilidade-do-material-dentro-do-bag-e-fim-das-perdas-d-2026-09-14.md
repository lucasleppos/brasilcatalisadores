# Rastreabilidade do material dentro do Bag e fim das perdas de informação

## O que foi verificado no app hoje

1. **Dentro do Bag falta rastreabilidade.** A lista "Itens Alocados" mostra apenas Fornecedor, Peso, Valor Pago e Pt/Pd/Rh. Não mostra a OP (número da compra), o tipo de material, a filial do fornecedor, se é Flex ou Carbono, nem a data da alocação — todos esses dados existem, apenas não são exibidos.
2. **Ao excluir um item alocado, ele desaparece de verdade.** A exclusão apaga o registro da alocação sem nenhum histórico e sem devolver a compra para a fase de alocação. Como a compra já foi marcada como encerrada quando terminou a alocação, o lote não volta para a aba "Alocar Material" — foi exatamente o que aconteceu com o BAG-009.
3. **Excluir um Bag apaga em cascata todos os itens dele**, sem aviso do que está dentro e sem histórico.
4. **A aba "Materiais Alocados" só lista material cerâmico.** Lotes de Peça e Peça em Sacola já alocados não aparecem em lugar nenhum dessa tela.
5. Se uma compra for excluída, as alocações dela nos bags também são apagadas em cascata.

## O que será feito

### Ver a origem do material dentro do Bag
Na tela do Bag, cada item alocado passa a mostrar: OP, Fornecedor, Filial, Tipo (cerâmico / peça / peça em sacola), Flex ou Carbono, Peso, Valor Pago, Pt/Pd/Rh e a data em que foi alocado. Clicar na linha abre o resumo da compra de origem (fornecedor, comprador, boleto Syge, datas das etapas), igual ao que se vê hoje na aba "Alocar Material". No celular, os mesmos dados em cartão.

### Nada mais se perde ao excluir
- Ao remover um item do Bag, o sistema devolve automaticamente aquele lote para a aba "Alocar Material", reabrindo a compra na fase de alocação quando ela já havia sido encerrada.
- Toda remoção fica registrada em um histórico (data, quem removeu, Bag de origem, OP, peso e valor), visível em uma seção "Histórico de movimentações" na tela do Bag e na aba "Alocar Material".
- Excluir um Bag que ainda tem itens passa a exigir confirmação que lista os itens, e cada item é devolvido para "Alocar Material" em vez de simplesmente sumir. Bag fechado ou exportado não pode ser excluído.

### Materiais alocados de todos os tipos
A aba "Materiais Alocados" passa a listar também os lotes de Peça e Peça em Sacola já alocados, com Bag de destino, para que nenhum material fique invisível depois de alocado.

### Fechando as outras lacunas encontradas
- Impedir a exclusão de compras que já tenham material alocado em algum Bag; se realmente precisar, o material deve ser retirado do Bag primeiro.
- Registrar no histórico da compra sempre que ela for reaberta por remoção de alocação, para que o retrocesso de etapa fique rastreável.

## Detalhes técnicos

- Nova tabela `public.bag_item_history` (bag_id, bag_number, purchase_id, purchase_number, purchase_item_id, weight, paid_value, supplier_name, action `removed` | `bag_deleted`, created_by, created_at) com GRANTs para `authenticated`/`service_role`, RLS ativo, leitura para autenticados, insert por autenticados, sem update/delete.
- `removeAllocation` em `src/lib/bags.ts`: grava o histórico, apaga o `bag_items`, recalcula totais e chama uma nova função `reopenForAllocation(purchaseId)` que devolve a compra para `Cerâmico: Aprovado` + `op_status = 'Alocando Bag'` (cerâmico) ou `Peças: Alocado ao Bag` (peça/sacola), acrescentando a entrada em `status_history`.
- `deleteBag`: bloqueia bags `Fechado`/`Exportado`, registra histórico de todos os itens e reabre cada compra antes de apagar.
- `BagDetail.tsx`: colunas extras vindas de um join com `purchases` (`purchase_number`, `supplier_id`, `material_flow`) + `useSupplierBranches`; fração Flex/Carbono lida do sufixo de `purchase_item_id` (`::flex`, `::kind_carbono`); Sheet de detalhe reaproveitando o resumo da compra.
- `AllocationPanel.loadAllocatedMaterials`: além de `Cerâmico: Aprovado`, incluir `Peças: Alocado ao Bag` e `Peças: Encerrado`.
- Exclusão de compras: checagem prévia em `bag_items` antes do delete em `src/lib/purchases.ts`.
- Nenhuma alteração nas regras de cálculo, precificação ou nos demonstrativos.
