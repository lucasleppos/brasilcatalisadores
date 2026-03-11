

# Adicionar "Boleto Syge" na tabela de compras, cards de processos e resumo

## Alterações

### 1. `src/pages/PurchasesPage.tsx` — Tabela de compras
- Na coluna "Boleto Syge" que já existe, adicionar estilo condicional: quando `erpNumber` estiver vazio, exibir o texto "—" com fundo/texto avermelhado (ex: `text-red-500 bg-red-50`) para destacar visualmente a ausência.

### 2. `src/components/processes/StageActionCard.tsx` — Cards do processo
- Adicionar linha com "Boleto Syge" no header do card, abaixo do comprador.
- Se vazio, mostrar badge "Sem Boleto" em vermelho discreto.
- Se preenchido, mostrar o valor em fonte mono.

### 3. `src/components/processes/PurchaseSummary.tsx` — Resumo nos diálogos de confirmação
- Adicionar linha "Boleto Syge" na grade de informações (entre "Pedido" e "Fornecedor").
- Se vazio, exibir "—" em vermelho.

### 4. `src/components/purchases/PurchaseDetail.tsx` — Detalhe da compra (dialog)
- Verificar se já exibe `erpNumber`. Se não, adicionar no resumo superior.

## Arquivos afetados
| Arquivo | Mudança |
|---------|---------|
| `PurchasesPage.tsx` | Estilo vermelho na célula Boleto Syge vazio |
| `StageActionCard.tsx` | Exibir erpNumber no card |
| `PurchaseSummary.tsx` | Exibir erpNumber no resumo |
| `PurchaseDetail.tsx` | Exibir erpNumber se ausente |

Nenhuma alteração de banco — `erp_number` já existe na tabela `purchases`.

