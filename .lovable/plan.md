# Filial na etiqueta térmica

Incluir a Filial (cadastro do fornecedor) em todas as etiquetas 100x50 mm: entrada, conferência cerâmica e conferência de Peças/Sacola.

## Comportamento

- Nova linha na etiqueta, logo abaixo de "Fornecedor": `Filial: <nome da filial>`.
- Quando o fornecedor não tiver filial cadastrada, a linha não é impressa (nada de "—" ocupando espaço).
- Nenhuma outra informação da etiqueta muda; continuam 3 cópias por grupo/lote e 1 cópia na etiqueta de ENTRADA.

## Detalhes técnicos

- `CeramicoLabelPrint.tsx`: campo opcional `branch?: string` em `LabelData`, renderizado no grid de informações (fonte 10pt, igual às outras linhas). O layout já é `overflow: hidden` com altura fixa; as linhas seguem cabendo nos 49,8 mm — reduzir levemente o espaçamento entre linhas se necessário.
- Helper `getSupplierBranch(supplierId)` (em `src/lib/suppliers.ts`) buscando `branch` por id, com cache simples em memória para evitar consultas repetidas na impressão.
- `printEntryLabel` / `buildEntryLabel` passam a ser assíncronos na resolução da filial: `printEntryLabel(purchase)` busca a filial pelo `supplier_id` da compra e injeta em `branch`. Chamadores (`NewPurchaseDialog.tsx`, `StageActionCard.tsx`, `PurchaseDetail.tsx`) já usam `await`/promise, sem mudança de assinatura.
- `CeramicoConferenciaPanel.tsx` e `SacolaConferenciaPanel.tsx`: carregam a filial do fornecedor da compra e incluem `branch` no `LabelData` base.
- Sem alteração de banco de dados, de etapas ou de cálculo.
