# Filtro por tipo de compra no módulo Processos

## O que será feito

Adicionar um filtro de **tipo de material** (Cerâmico, Peça, Peça em Sacola) na tela de Processos, funcionando tanto no desktop quanto no mobile. O filtro restringe as compras exibidas no board antes da divisão por etapas.

## Onde entra o filtro

- **Desktop (`ProcessBoard.tsx`)**: novo select ao lado dos filtros de fornecedor/comprador, controlado por estado e repassado ao `ProcessFilters`.
- **Mobile (`MobileProcessBoard.tsx`)**: nova linha de chips logo abaixo da barra de busca, permitindo alternar entre "Todas", "Cerâmico", "Peças" e "Peça em Sacola".

## Comportamento

- Opções: "Todos os tipos", "Cerâmico", "Peças", "Peça em Sacola".
- O tipo é determinado pelo campo `materialFlow` da compra (`ceramico`, `pecas`, `sacola`), usando a mesma lógica já existente (`isSacolaFlow` para diferenciar peça em sacola).
- O filtro é aplicado antes do agrupamento em etapas, então as abas de processo e os contadores refletem apenas o tipo selecionado.
- O filtro de busca por OP/fornecedor continua funcionando sobre o resultado já filtrado por tipo.
- A contagem de pendentes no badge também respeita o filtro ativo.

## Detalhes técnicos

- `ProcessFilters.tsx`:
  - Recebe `materialFilter` ( `"all" | "ceramico" | "pecas" | "sacola"`) e `onMaterialChange`.
  - Adiciona um `Select` com as quatro opções, posicionado ao lado dos demais filtros.
- `ProcessBoard.tsx`:
  - Adiciona estado `materialFilter`.
  - Aplica o filtro no `useMemo` de `filtered`.
  - Passa o estado e o setter para `ProcessFilters`.
- `MobileProcessBoard.tsx`:
  - Adiciona estado `materialFilter`.
  - Renderiza chips de filtro abaixo da barra de busca (ou acima das abas de etapa quando `!stageTabsInBar`).
  - Aplica o filtro no `boardPurchases` antes do agrupamento.
  - Atualiza o contador do header e os contadores das etapas considerando o filtro.
- Nenhuma alteração em banco de dados, regras de etapa ou permissões.

## Verificação

- `bunx tsgo --noEmit` sem erros.
- Conferir `/processos` no desktop e no mobile: selecionar cada tipo e confirmar que as abas e contadores mudam corretamente.
