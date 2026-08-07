# Busca inteligente de Fornecedor na Nova Compra

## O que muda

O campo **Fornecedor** deixa de ser uma lista suspensa longa e passa a ser um campo de busca:

- Ao clicar, abre um campo de digitação com a lista completa abaixo.
- Digitando, a lista filtra em tempo real pelo nome do fornecedor (também por documento/CNPJ e comprador, para facilitar).
- A busca ignora acentos, maiúsculas/minúsculas e a ordem das palavras (ex.: "frote luana" encontra "LUANA FROTE XAVIER").
- Navegação por teclado (setas + Enter) e mensagem "Nenhum fornecedor encontrado" quando não houver resultado.
- Mantém o comportamento atual: desabilitado ao editar compra, aviso quando não há fornecedores cadastrados e a linha de margens do fornecedor selecionado.

## Detalhes técnicos

- Novo componente reutilizável `src/components/ui/searchable-select.tsx` baseado em Popover + Command (já disponíveis no projeto), com props `value`, `onValueChange`, `options` (value/label/keywords), `placeholder`, `disabled`.
- Normalização de texto (remoção de diacríticos) e filtro por todos os termos digitados.
- `NewPurchaseDialog.tsx`: substituir o `Select` do fornecedor por esse componente, alimentado por `suppliers` (label = nome, keywords = documento e comprador).
- Sem alterações de dados ou de backend.
