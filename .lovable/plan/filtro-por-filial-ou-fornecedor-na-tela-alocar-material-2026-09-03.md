# Filtro por Filial ou Fornecedor na tela Alocar Material

## O que muda

Adicionar filtros por **Fornecedor** e **Filial** na tela **Alocar Material** (módulo Bag), aplicando às três listas: Materiais Disponíveis, Materiais Alocados e Materiais em Processo.

- Dois controles de filtro: um para fornecedor e outro para filial.
- Opções preenchidas automaticamente a partir dos dados carregados.
- Botão "Limpar filtros" para reset rápido.
- Os totais dos cards de resumo refletem os materiais visíveis após o filtro.
- A seleção múltipla é limpa ao alterar qualquer filtro, evitando alocar itens ocultos.

## Detalhes técnicos

- `src/components/bags/AllocationPanel.tsx`:
  - Adicionar estados `supplierFilter` e `branchFilter`.
  - Derivar listas únicas de fornecedores e filiais a partir de `availableMaterials`, `allocatedMaterials` e `inProcessMaterials`.
  - Criar listas filtradas (`filteredAvailable`, `filteredAllocated`, `filteredInProcess`) usando os estados.
  - Renderizar os controles de filtro acima das tabelas/cards, tanto no desktop quanto no mobile.
  - Desktop: dois `Select` (Fornecedor / Filial) e botão "Limpar" em linha.
  - Mobile: mesmos controles em layout empilhado/compacto, usando `Select` do shadcn.
  - Atualizar os cards de resumo para usarem as listas filtradas.
  - Limpar `selectedIds` sempre que `supplierFilter` ou `branchFilter` mudarem.
  - Substituir as referências de renderização (`availableMaterials`, `allocatedMaterials`, `inProcessMaterials`) pelas versões filtradas.
- Sem alterações de schema, RLS, backend ou cálculo de preços.
