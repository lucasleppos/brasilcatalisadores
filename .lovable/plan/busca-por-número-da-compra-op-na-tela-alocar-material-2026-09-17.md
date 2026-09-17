# Busca por número da compra (OP) na tela Alocar Material

## O que muda

Na tela **Alocar Material** (módulo Bag), ao lado dos filtros de fornecedor e filial, entra um **campo de busca digitável**:

- Digitar o número da compra (ex.: `020926-45`) filtra as três listas ao mesmo tempo: Materiais Disponíveis, Materiais Alocados e Materiais em Processo.
- A busca ignora espaços e maiúsculas/minúsculas; basta digitar parte do número (ex.: `020926`).
- Os cards de resumo (Lotes Disponíveis, Peso, Valor, Em Processo) continuam refletindo o resultado do filtro.
- Botão **Limpar filtros** também limpa a busca (e passa a aparecer quando ela estiver preenchida).
- A seleção múltipla é limpa quando a busca muda, evitando alocar itens ocultos.

## Detalhes técnicos

- `src/components/bags/AllocationPanel.tsx`:
  - Novo estado `searchQuery`.
  - Incluir `searchQuery` no `useEffect` que limpa `selectedIds` (linha ~555).
  - Estender a função `matchesFilters`: além de fornecedor/filial, testar `m.purchaseNumber.toLowerCase().includes(termo)`.
  - Adicionar um `<Input>` com ícone `Search` (padrão já usado no app) em linha com os `Select` de fornecedor/filial, largura `w-56` e altura `h-9` para combinar; placeholder "Buscar nº da compra...".
  - Condição do botão "Limpar filtros" passa a incluir `searchQuery !== ""`; limpar também reseta a busca.
  - Funciona no desktop e no mobile (os controles já ficam na mesma área da tela).
- Sem alterações de banco, regras de alocação ou cálculos.

## Verificação

- `bunx tsgo --noEmit` sem erros.
- Abrir `/bags` → aba Alocar Material: digitar uma OP existente e confirmar que as três listas filtram; digitar algo inexistente e confirmar listas vazias; limpar e confirmar que tudo volta.
