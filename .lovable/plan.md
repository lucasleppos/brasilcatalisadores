# PDF das peças separadas do fluxo (Conferência — Peça em Sacola)

Gerar um documento em PDF listando as peças que foram separadas do fluxo na conferência, para envio ao fornecedor decidir o destino.

## Como vai funcionar

- No bloco "Não seguem o fluxo de sacola" da conferência aparece um novo botão **"Gerar PDF das peças separadas"**, habilitado somente quando existir ao menos uma peça separada.
- Ao clicar, as peças são salvas primeiro (para garantir numeração e pesos gravados) e em seguida abre a caixa de impressão do navegador com o documento em A4, onde o operador escolhe "Salvar como PDF" e envia ao fornecedor.
- Reimpressão disponível a qualquer momento enquanto o card estiver aberto.

## Conteúdo do documento

Cabeçalho:
- Título "Peças separadas do fluxo — para avaliação do fornecedor"
- OP (número da compra), data, fornecedor, filial do fornecedor, comprador
- Boleto Syge quando já existir

Tabela (uma linha por peça separada):
- Nº da peça (seq fixo)
- Código e referência
- Peso pesado (kg)
- Peso do catálogo (kg)
- Diferença (Δ) em % — motivo da separação (fora da margem de 3%)

Rodapé:
- Total de peças separadas e peso total
- Texto: peças registradas na compra apenas para histórico; aguardando decisão do fornecedor (retorno da peça ou compra como material cerâmico)
- Linha para assinatura/ciência do fornecedor

## Detalhes técnicos

- Novo arquivo `src/lib/separated-pieces-report.ts` com `printSeparatedPiecesReport(data)`, reutilizando a mesma técnica de impressão isolada por `iframe` já usada em `printLabelSheet` (`src/components/processes/CeramicoLabelPrint.tsx`) — sem nova dependência de biblioteca de PDF.
- CSS próprio para A4 (`@page { size: A4; margin: 12mm }`), tabela simples e legível em preto e branco.
- `src/components/processes/SacolaConferenciaPanel.tsx`: novo handler que chama `persistAll` e monta os dados a partir de `excludedPieces` (seq, code, reference, unitWeight, catalogWeight, `weightCheck`), com fornecedor via `purchase.supplierName`, filial via `getSupplierBranch` (`src/lib/suppliers.ts`, já usada nas etiquetas) e comprador via `purchase.buyer`.
- Números no padrão brasileiro com `fmtNum`/`fmtKg`; pesos com 3 casas.
- Nenhuma alteração de schema nem de regra de negócio: apenas apresentação/impressão.
