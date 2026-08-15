# Fases 3 e 4 — Lotes de transferência e Conta Corrente

As fases 1 e 2 já entregaram, além da base, um esqueleto das fases 3 e 4 na página Filiais: abas Pedidos, Lotes, Confronto, Conta Corrente e Cadastro, com criação de lote, avanço de status (Aberto → Em Trânsito → Recebido → Conferido), liberação automática das compras para "Em Conferência" ao receber, tabela de confronto declarado x real, lançamento manual na conta corrente e fechamento de período com badge "Liquidado".

O que falta é o refinamento operacional. Abaixo o que será feito.

## Fase 3 — Lotes de transferência

- **Identificação legível do lote:** hoje aparece "Lote 8f3a1c2b" (pedaço do id). Passar a exibir código no formato `FILIAL-DDMMYY-NN` (código da filial + data de criação + sequência do dia), calculado na leitura, sem nova coluna no banco.
- **Gestão de compras no lote:** botão para remover compra de um lote ainda aberto (a função já existe em `branches.ts`, sem uso na tela) e ação de vincular várias compras de uma vez por seleção (checkbox) na aba Pedidos.
- **Reverter status:** ação "Voltar etapa" para lote enviado por engano (Em Trânsito → Aberto). Não permitir reverter depois de "Recebido", porque as compras já entraram no fluxo da matriz.
- **Conferência de chegada:** ao marcar "Recebido", o lote passa a exibir a lista de compras com o progresso da conferência na matriz (peso real e quantidade conferida). O status "Conferido" só é liberado quando todas as compras do lote já tiverem peso real registrado — hoje o botão avança sem checagem.
- **Filtros e dados do lote:** filtro por filial e por status, datas de envio/recebimento e campo de observações visíveis no cartão.
- **Mobile:** cartões e ações no lugar de tabela larga nas abas Lotes e Pedidos.
- **Limpeza:** a tela antiga `BranchStockList` (dentro de Bags) usa o controle de transferência por compra, anterior a este módulo. Passa a apenas listar, sem botões de transferência, para não existirem dois caminhos que mudam o mesmo estado.

## Fase 4 — Confronto e Conta Corrente

- **Confronto mais preciso:** listar somente compras que já têm conferência concluída (peso real registrado), com filtro por filial e por período, além de linha de totais (declarado, real, diferença em R$ e %).
- **Evitar lançamento duplicado:** marcar a compra que já gerou lançamento na conta corrente com badge "Lançado" e exigir confirmação extra para lançar de novo.
- **Diferença de peso também sugerida em R$:** o diálogo de lançamento já pré-preenche pela diferença de valor; passa a mostrar as duas bases (peso e valor) e permitir escolher qual usar, mantendo o valor final sempre editável e o motivo obrigatório.
- **Conta corrente:** filtro "em aberto / liquidados / todos", lançamento manual avulso (sem compra vinculada, ex. acerto de frete), e no fechamento de período um resumo prévio (quantos lançamentos, total de crédito, total de débito, saldo) antes de confirmar.
- **Extrato:** botão para exportar o extrato do período em CSV, seguindo o padrão de exportações já usado em Relatórios.

## Detalhes técnicos

- Alterações concentradas em `src/pages/BranchesPage.tsx`, `src/lib/branches.ts` e `src/components/bags/BranchStockList.tsx`; novos componentes para o cartão de lote e o diálogo de lançamento.
- Sem mudança de schema: `branch_transfers`, `branch_ledger_entries` e `branch_settlements` já têm os campos necessários (datas, observações, `settlement_id`, pesos e valores declarado/real).
- Regra de conferência do lote lida de `purchases.weight_real` / itens conferidos, sem duplicar dados.
- Permissões existentes do módulo `filiais` (`create`, `edit`, `ledger`, `settle`) continuam controlando cada ação.
- Formatação com `fmtBrl` / `fmtKg` / `fmtPctFixed`; toda escrita com estado de carregamento e toast.
