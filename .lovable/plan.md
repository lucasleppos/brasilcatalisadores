# Busca inteligente em todo o app

## Objetivo

Trocar as listas suspensas longas (fornecedor, comprador, bag, grupo) por um campo de busca com digitação, e padronizar todos os campos de busca por texto do app para que encontrem resultados mesmo com acento, letra maiúscula/minúscula ou palavras fora de ordem.

## 1. Novo componente de seleção com busca

Um único componente reutilizável ("selecionar digitando"):

- Abre ao clicar, com campo de digitação no topo e a lista filtrada abaixo.
- Filtra a partir da primeira letra, ignorando acentos, maiúsculas, pontuação (`.`/`-`/`/`) e ordem das palavras: "junio cesar", "JUNIO", "cesar junio" e "junío" encontram "JUNIO CESAR".
- Navegação por teclado (setas, Enter, Esc), opção "Limpar seleção" quando o filtro é opcional, e mensagem "Nenhum resultado" quando não há correspondência.
- Mostra informação secundária quando útil (ex.: documento do fornecedor, comprador da bag) para diferenciar nomes parecidos como "ADILSON RIBEIRO - CELULAR 1 / 2".

Aplicado em:

| Local | Campo |
| --- | --- |
| Nova Compra / Editar Compra | Fornecedor |
| Calculadora | Fornecedor |
| Compras (filtros) | Comprador |
| Processos (filtros) | Fornecedor, Comprador |
| Concluídos | Fornecedor, Bag de destino |
| Bags | Comprador |
| Análise de Bag / Alocação | Bag |
| Catálogo (filtro e cadastro de peça) | Grupo |
| Fornecedores | Comprador |

Selects curtos e fixos (status, tipo de material, fluxo, etapa) continuam como estão — busca não ajuda em 3 a 6 opções.

## 2. Campos de busca por texto

Mesma regra de comparação (sem acento, sem caixa, palavras em qualquer ordem) e melhorias de usabilidade nos campos existentes:

- Compras: fornecedor, nº pedido, comprador, Boleto Syge.
- Concluídos: fornecedor, nº pedido, Syge.
- Fornecedores: nome, documento, e-mail.
- Usuários: nome, e-mail, função.
- Catálogo: código, referência, marca, veículo.
- Busca de peça (Conferência de Peças/Sacola e Precificação): busca a partir de 1 caractere, navegação por teclado e destaque do termo encontrado.

Em todos: ícone de lupa, botão "×" para limpar, contador de resultados ("12 de 340") e busca sem travar a digitação em listas grandes.

## Detalhes técnicos

- Novo `src/components/ui/searchable-select.tsx` sobre `Popover` + `Command` (já presentes no projeto), com `filter` customizado.
- Novos helpers em `src/lib/utils.ts`: `normalizeText()` (remove diacríticos/caixa/pontuação) e `matchesSearch(haystack, query)` (todos os termos devem estar presentes), reaproveitados pelo componente e por todos os filtros de tabela.
- `PartSearch.tsx` e a busca de peça em `SacolaPricingPanel.tsx` passam a usar `matchesSearch` no lado do cliente sobre o resultado da consulta, com debounce reduzido para 150 ms.
- Sem mudanças de banco, de regra de negócio ou de cálculo.
