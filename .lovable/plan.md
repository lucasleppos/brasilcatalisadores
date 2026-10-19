# PDF de peças separadas do fluxo também no módulo Compras

## O que muda
- Em Compras, ao clicar no olho (ou no card no celular) e abrir os detalhes da compra, aparece o botão **"PDF peças separadas"**.
- O botão aparece só em compras de **Peças** ou **Peça em Sacola** que têm peças com intercorrência ou fora do fluxo.
- O PDF é o mesmo já usado em Processos: mesmos dados, Grupo 1 até R$350, Grupo 2 até R$650, Grupo 3 acima de R$650, e resumo com as quantidades.
- Abre a janela de impressão. Nada muda nos dados da compra.

## Detalhes técnicos
- Tirar a montagem do PDF de `StageActionCard.tsx` e colocá-la numa função compartilhada (`printSeparatedPiecesForPurchase(purchase)` em `src/lib/separated-pieces-report.ts`), usando `getExcludedItems`, `getSupplierBranch` e `computeSeparatedPieceValues`.
- `StageActionCard.tsx` passa a chamar essa função (mesmo comportamento).
- `src/components/purchases/PurchaseDetail.tsx`: botão com ícone Printer, visível quando `getExcludedItems(purchase).length > 0`, com indicador de carregamento e aviso em caso de erro.
