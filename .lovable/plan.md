# PDF das peças separadas do fluxo (Peça em Sacola)

Gerar um documento em PDF listando as peças que foram separadas do fluxo, para envio ao fornecedor decidir o destino.

## Como vai funcionar

- Botão **"Gerar PDF das peças separadas"** no bloco "Não seguem o fluxo de sacola" da conferência, habilitado quando existir ao menos uma peça separada.
- Ao clicar, as peças são salvas primeiro (para garantir numeração) e em seguida abre a caixa de impressão do navegador com o documento em A4 — o operador escolhe "Salvar como PDF" e envia ao fornecedor.
- O mesmo botão fica disponível **nas etapas seguintes do processo** (Trituração, Laboratório, Precificação, Aprovação e demais), no card da etapa da compra, sempre que a compra tiver peças separadas registradas — permitindo reimprimir a qualquer momento.

## Conteúdo do documento

Cabeçalho:
- Título "Peças separadas do fluxo — para avaliação do fornecedor"
- OP (número da compra), data, fornecedor, filial do fornecedor, comprador
- Boleto Syge quando já existir

Tabela (uma linha por peça separada):
- Nº da peça (seq fixo)
- Código
- Referência

Rodapé:
- Total de peças separadas
- Texto: peças registradas na compra apenas para histórico, aguardando decisão do fornecedor
- Linha para assinatura/ciência do fornecedor

## Detalhes técnicos

- Novo arquivo `src/lib/separated-pieces-report.ts` com `printSeparatedPiecesReport(data)`, reutilizando a técnica de impressão isolada por `iframe` já usada em `printLabelSheet` (`src/components/processes/CeramicoLabelPrint.tsx`) — sem nova dependência de PDF.
- CSS A4 (`@page { size: A4; margin: 12mm }`), tabela simples legível em preto e branco.
- `src/components/processes/SacolaConferenciaPanel.tsx`: handler que chama `persistAll` e monta os dados a partir de `excludedPieces` (seq, code, reference).
- `src/components/processes/StageActionCard.tsx`: botão secundário "Peças separadas (PDF)" exibido quando `getExcludedItems(purchase)` (`src/lib/purchases.ts`) retornar itens, em qualquer etapa; usa `seq`, `partCode`/`catalogPartCode` e `partReference`/`catalogPartRef` dos itens já gravados.
- Fornecedor via `purchase.supplierName`, filial via `getSupplierBranch` (`src/lib/suppliers.ts`), comprador via `purchase.buyer`, Boleto Syge via `purchase.erpNumber`.
- Nenhuma alteração de schema nem de regra de negócio: apenas apresentação/impressão.
