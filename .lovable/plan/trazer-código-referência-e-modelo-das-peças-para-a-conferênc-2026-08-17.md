# Trazer código, referência e modelo das peças para a conferência da filial

## Problema confirmado

Consultei os itens da compra `170826-08` no banco: todos os itens importados do PDF estão com `catalog_part_id` vazio e nenhum outro campo descritivo preenchido. O leitor de PDF (`pedido-pdf-import.ts`) **já extrai** código, referência e modelo do veículo, e o diálogo de importação mostra esses dados na tela — mas nada disso é gravado quando a compra é criada. Como a peça normalmente não existe no catálogo, o painel de conferência não tem de onde ler o código e cai no texto "sem código".

## O que será feito

1. **Guardar os dados da peça na compra**: cada item passa a gravar código, referência, modelo do veículo e o número do pedido de origem, vindos direto do PDF (ou do catálogo, quando a peça for adicionada pelo catálogo).
2. **Conferência da filial**: cada linha mostra `nº · código` em destaque, e abaixo referência + modelo do veículo, além do pedido de origem quando o arquivo tiver mais de um pedido. Busca por código/referência no topo da lista para conferências grandes.
3. **Estoque e lotes**: a lista de itens da compra passa a exibir os códigos, e o relatório CSV do lote ganha colunas de código e referência por item.
4. **Etiquetas e demonstrativo**: as etiquetas de entrada e o demonstrativo do fluxo de peças usam o código gravado quando não houver peça de catálogo vinculada.
5. **Compras já importadas**: preenchimento retroativo não é possível (o dado nunca foi salvo). As compras `170826-06/07/08` continuam sem código; se quiser, elas podem ser reimportadas do PDF depois do ajuste.

## Detalhes técnicos

- Migração em `public.purchase_items`: novas colunas `part_code text`, `part_reference text`, `part_vehicle text`, `pedido_number text` (todas opcionais, sem quebrar itens existentes).
- `src/lib/purchases.ts`: `PurchaseQuoteItem` ganha `partCode`, `partReference`, `partVehicle`, `pedidoNumber`; mapear nos loaders e nos inserts/updates (`createPurchase`, `updatePurchase`, e o caminho de itens de conferência).
- `src/components/branches/ImportPedidoDialog.tsx`: ao montar `purchaseItems`, propagar `code`, `reference`, `vehicleModel` e `pedidoNumber` de cada linha revisada (uma linha por unidade, como hoje).
- `src/components/branches/BranchConferenciaPanel.tsx`: montar o label a partir de `catalogPartCode ?? partCode`, referência a partir de `catalogPartRef ?? partReference`, exibir `partVehicle` e `pedidoNumber`; adicionar campo de filtro por texto.
- `src/pages/BranchesPage.tsx`: exibir código nos itens do lote e incluir código/referência no CSV.
- `src/components/processes/CeramicoLabelPrint.tsx` e a Edge Function do demonstrativo: usar o código gravado como fallback.
