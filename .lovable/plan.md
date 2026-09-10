# Processos: visão em lista detalhada (opcional)

## Objetivo
Ter uma segunda forma de ver o módulo Processos: uma lista densa, em linhas, que mostra rapidamente tudo o que está em aberto em cada etapa — para acompanhar e cobrar. Os cards atuais continuam como visão padrão.

## Como funciona
- No topo da tela, ao lado dos filtros, um seletor com duas opções: **Cards** (padrão) e **Lista**.
- A escolha fica lembrada no navegador do usuário, então ele volta na visão que preferir.
- As abas de etapa (Conferência, Moagem, Laboratório, Demonstrativo, Aprovação, Corte) e todos os filtros existentes continuam iguais e valem para as duas visões.
- Na Lista, além da aba de uma etapa, existe a opção **Todas as etapas**: mostra tudo o que está em aberto agrupado por etapa, com o total de cada etapa no cabeçalho do grupo, que pode ser recolhido.

## A lista
Uma linha por OP, ordenada da mais antiga para a mais nova (como hoje), com as colunas:

```text
OP        Fornecedor              Filial   Tipo    Comprador   Qtd/Peso     Boleto Syge   Tempo    Etapa
020926-05 MURIELE GUIMARAES...    Betim    Sacola  MARCOS R.   103 pç       Sem boleto    8d       Conferência
040926-07 IGOR ANTONIO DA...      Contagem Sacola  HIAGO       13 pç/11,2kg 123456        6d       Conferência
```

- **Sem boleto** aparece em destaque vermelho, como hoje nos cards.
- Divergência de conferência e outros alertas viram um ícone de aviso na linha, com o detalhe ao passar o mouse.
- Linhas paradas há muito tempo ganham destaque leve no tempo (por exemplo, acima de 7 dias), para facilitar a cobrança.
- Clicar na linha abre o painel da etapa (o mesmo conteúdo do card de hoje) em uma janela lateral, com as mesmas ações e respeitando permissões e o modo somente leitura.
- Cabeçalhos clicáveis para ordenar por OP, fornecedor, tempo na etapa e valor.

## No celular
A visão em Lista usa linhas compactas de duas informações por linha (fornecedor + OP/tipo/filial, tempo à direita), aproveitando o padrão de lista já usado no app. O seletor Cards/Lista fica no cabeçalho da tela.

## Fora do escopo
Nenhuma mudança em etapas, cálculos, permissões ou dados. É apenas uma nova forma de visualizar.

## Detalhes técnicos
- `ProcessBoard.tsx`: novo estado `viewMode: "cards" | "list"` persistido em `localStorage`; dentro de cada `TabsContent`, renderiza o grid atual de `StageActionCard` ou o novo `ProcessListView`.
- Novo `src/components/processes/ProcessListView.tsx`: tabela (shadcn `Table`) alimentada pelo mesmo `tasksByGroup`, sem refazer carregamento nem filtros; ordenação via `use-sortable`; clique abre `Dialog`/`Sheet` com `StageActionCard` (`readOnly={!canAdvance}`, `onCompleted={reload}`).
- Filial: reaproveitar a busca de `suppliers.branch` já usada em `MobileProcessBoard.tsx`, extraída para um hook simples e usada nas duas telas.
- Modo "Todas as etapas": iterar `visibleGroups` e renderizar seções com `Collapsible`.
- `MobileProcessBoard.tsx`: mesmo seletor, alternando entre `MobileListRow` atual (já é lista) e uma variante mais densa com colunas resumidas.
