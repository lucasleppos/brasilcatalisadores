# Filtro de fornecedor digitável no módulo Processos

## O que será feito

Substituir o campo **Fornecedor** do filtro do módulo Processos (que aparece em todas as etapas, incluindo Aprovação) por um campo de busca digitável, igual ao já existente na Nova Compra.

## Onde entra a mudança

- **Desktop (`ProcessFilters.tsx`)**: o `Select` de fornecedor passa a usar o componente `SearchableSelect`.
- A lista de opções continua vindo do array `suppliers` já disponível em `ProcessBoard.tsx`.
- Mantém a opção "Todos os fornecedores".
- O filtro de comprador e os demais controles não são alterados.

## Comportamento

- Ao clicar no campo, abre um campo de digitação com a lista completa de fornecedores abaixo.
- Digitando, a lista filtra em tempo real pelo nome do fornecedor.
- Busca ignora acentos, maiúsculas/minúsculas e a ordem das palavras.
- Navegação por teclado (setas + Enter) e mensagem "Nenhum fornecedor encontrado" quando não houver resultado.
- O filtro continua funcionando normalmente com os demais filtros (comprador, tipo, data).

## Detalhes técnicos

- Importar `SearchableSelect` de `src/components/ui/searchable-select.tsx` em `ProcessFilters.tsx`.
- Construir as opções a partir de `suppliers` com `{ value: supplierName, label: supplierName }`.
- Adicionar uma opção inicial `{ value: "all", label: "Todos os fornecedores" }`.
- Manter `value={supplierFilter}` e `onValueChange={onSupplierChange}`.
- Preservar largura e altura atuais (`w-48`, `h-8`).
- Nenhuma alteração de backend, estado ou regras de filtragem.

## Verificação

- `bunx tsgo --noEmit` sem erros.
- Conferir `/processos` no desktop: clicar no filtro de fornecedor, digitar parte do nome e confirmar que a lista filtra e aplica o filtro corretamente.
