# Coluna "Filial" na tela Alocar Material

## O que muda

Adicionar uma coluna **Filial** nas listas da tela Alocar Material (Disponíveis, Alocados, Em Processo), mostrando a filial cadastrada no fornecedor da compra (campo Filial do cadastro de fornecedores).

- Desktop: nova coluna "Filial" logo após "Fornecedor", com texto truncado.
- Mobile: a filial aparece como texto secundário no card, junto ao fornecedor (sem criar rolagem horizontal).
- Quando o fornecedor não tiver filial preenchida (existem cadastros com o campo vazio), exibe "—".

## Detalhes técnicos

- `src/components/bags/AllocationPanel.tsx`:
  - incluir `supplier_id` nos `select` de `purchases` das três consultas;
  - carregar uma vez `suppliers (id, branch)` e montar um mapa `id -> branch`;
  - adicionar `supplierBranch` às interfaces de material (disponível, alocado, em processo) e preencher a partir do mapa;
  - nas linhas virtuais Flex/Carbono das OPs de peças, herdar a mesma filial da compra;
  - renderizar `TableHead`/`TableCell` "Filial" e o texto no card mobile.
- Sem alterações de schema, RLS ou de cálculo/precificação.
