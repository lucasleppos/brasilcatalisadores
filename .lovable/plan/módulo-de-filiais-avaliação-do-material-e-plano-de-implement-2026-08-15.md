# Módulo de Filiais — avaliação do material e plano de implementação

Li a migration (`20260815_modulo_filiais.sql`) e o prompt. O material é sólido e coerente com o app: reaproveita `purchases`/`purchase_items` (sem compra paralela), usa `weight_declared`/`weight_real`/`erp_number`/`location` que já existem, e as políticas RLS seguem o padrão atual (`has_role`, `user_can_do`, `has_any_module_access`). Testei o PDF de pedido enviado ontem: o texto é extraível, a tabela é reconhecível, e o "0,920g" realmente precisa ser lido como kg.

## Ajustes necessários no material antes de rodar

1. **Faltam os `GRANT`s.** Neste projeto, tabela em `public` sem GRANT fica inacessível pela API mesmo com RLS correta. Vou incluir, para cada nova tabela e para a view: `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated` e `GRANT ALL ... TO service_role` (sem `anon`).
2. **Falta política de UPDATE em `branch_settlements`** (o fechamento de período atualiza os lançamentos, mas o settlement em si só tem insert/select/delete) — incluir UPDATE restrito a `settle`.
3. **`branches` duplica a lista hardcoded** em `src/lib/bags.ts` (`BRANCHES_WITH_OWN_BAG` / `WITHOUT`). Na fase 1 mantenho as duas em paralelo (seed idêntico) e só depois migro `bags.ts` para ler da tabela, para não quebrar alocação de Bags.
4. **Novo status "Aguardando Transferência"** exige varredura dos lugares que assumem "Em Conferência" como estado inicial (board de processos, KPIs, mobile, `getNextStatus`). Trato como estado pré-fluxo, fora das máquinas de estado existentes.

## Implementação em fases

**Fase 1 — Base (schema + dados)**
- Migration adaptada: tabelas `branches`, `branch_transfers`, `branch_ledger_entries`, `branch_settlements`, view `branch_ledger_balance`, colunas novas em `purchases`, índices, módulo de permissão `filiais`, mais os GRANTs e a política faltante.
- `src/lib/branches.ts`: CRUD de filiais, lotes de transferência, lançamentos do livro-razão, saldo e fechamento de período (padrão de `src/lib/bags.ts`).
- Página de cadastro de Filiais + item "Filiais" no menu com `RoleGate` do módulo `filiais`.

**Fase 2 — Importação do PDF de pedido**
- `src/lib/pedido-pdf-import.ts` com `pdfjs-dist`, suportando N pedidos por arquivo, junção de linhas quebradas ("R$" + valor) e peso sempre em kg.
- `ImportPedidoDialog.tsx`: revisão editável obrigatória — confirmar/remover item (motivo: faltou / quebrado / código errado), ajustar quantidade, adicionar peça extra via `PartSearch`, e lançar granel sem código (tipo de material + peso).
- Fornecedor casado por CPF em `suppliers.document`, criado automaticamente se não existir.
- Ao confirmar: `createPurchase()` estendido com `branchId`, `weightDeclared`, `declaredValueBrl`, `sourcePedidoNumber`, `location: 'filial'`, `transfer_status: 'pendente'` e status inicial "Aguardando Transferência".

**Fase 3 — Lotes de transferência**
- `BranchStockList.tsx` evolui para visão por lote (Aberto → Em Trânsito → Recebido → Conferido), com compras vinculadas, peso/valor declarado, e ações de adicionar compras / mudar status.
- Marcar "Recebido" move todas as compras do lote para "Em Conferência", entrando no pipeline normal já existente.
- Conferência de chegada na matriz reaproveitando o padrão de `QtyCheckBadge` e dos painéis de conferência.

**Fase 4 — Confronto e Conta Corrente**
- Página de Confronto por Filial: declarado x real (peso e valor), diferença em R$ e %, filtros de filial e período; botão "Lançar na conta corrente" com valores pré-preenchidos e confirmação manual obrigatória.
- Página de Conta Corrente: saldo em aberto, tabela de lançamentos, "Fechar Período" com badge "Liquidado".

## Notas técnicas

- Sem tabela paralela de compra: filial é apenas origem (`branch_id`) + estágios iniciais extras.
- `pdfjs-dist` roda no cliente; PDF escaneado (sem camada de texto) é rejeitado com aviso claro.
- Formatação via `fmtBrl`/`fmtNum`/`fmtKg` de `src/lib/utils.ts`; toda escrita com loading + toast.
- `src/integrations/supabase/types.ts` é regenerado automaticamente após a migration.

## Sugestão de escopo agora

Começar pelas **Fases 1 e 2** (base + importação do PDF, que é o ganho imediato na inclusão de pedidos) e seguir para 3 e 4 depois de validar em teste real. Se preferir tudo de uma vez, também é viável, só fica um bloco grande para validar.
