## Diagnóstico

Verificado no banco: a única compra existente (`16/07/2026 - 01`) está com `status = "Cerâmico: Aprovado"` e `op_status = "Alocando Bag"` — por isso não aparece em **Concluídos**, cujo filtro exige `Cerâmico: Encerrado`, `Concluído` ou `op_status = "Bag Alocado"`.

Porém, os 3 grupos de conferência dessa compra **já estão alocados** no BAG-001 (`bag_items` tem os 3 `purchase_item_id`, 6 + 5 + 11 kg = 22 kg, igual ao peso do bag).

Causa, pelo histórico de status: a compra chegou a "Bag Alocado" / "Cerâmico: Encerrado" em 16/07, foi **movida manualmente pelo admin** de volta para "Gerar Boleto de Aprovação" e reaprovada hoje. Ao reaprovar, `updatePurchaseStatus` sempre reseta `op_status = "Alocando Bag"`, mas a verificação de "todos os grupos alocados" só roda **no momento de uma nova alocação** (em `AllocationPanel`/`AllocateMaterialDialog`). Como não há mais nada a alocar, nada dispara e a compra fica presa fora do Bags e fora de Concluídos.

## Correção

**1. Centralizar a verificação (`src/lib/purchases.ts`)**
- Criar `syncCeramicoAllocation(purchaseId)`: se a compra é cerâmica, está em "Cerâmico: Aprovado" com `op_status = "Alocando Bag"`, e todos os itens `category = "conferencia"` já constam em `bag_items`, então avança para "Bag Alocado" / "Cerâmico: Encerrado" (reaproveitando `advanceOpStatus`).
- Chamar essa função ao final de `updatePurchaseStatus` quando o novo status for "Cerâmico: Aprovado" — assim, reaprovações de compras já alocadas se resolvem sozinhas.

**2. Reutilizar nos painéis de Bags**
- `AllocationPanel.tsx` e `AllocateMaterialDialog.tsx` passam a chamar `syncCeramicoAllocation` em vez de repetir a consulta inline (mesmo comportamento, uma fonte só de verdade).

**3. Destravar o registro atual**
- Rodar uma atualização única no banco marcando essa compra como `op_status = "Bag Alocado"` e `status = "Cerâmico: Encerrado"`, já que a alocação está completa. Ela então aparece em Concluídos com o BAG-001 vinculado.

**4. Rede de segurança no módulo Concluídos**
- Em `CompletedPage.tsx`, ao carregar, executar `syncCeramicoAllocation` para compras cerâmicas em "Alocando Bag" cujos grupos já estejam todos alocados, e recarregar a lista. Evita que qualquer movimentação manual futura deixe processos invisíveis.

## Observação

Nenhuma mudança de schema, permissões ou rotas. O módulo Bags continua listando os materiais até o fechamento do bag.
