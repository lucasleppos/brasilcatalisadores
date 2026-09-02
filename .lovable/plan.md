# Melhoria mobile da tela "Alocar Material"

## Problema
Na versão mobile a tabela de alocação exige rolagem horizontal. O usuário pediu para ocultar a coluna **Valor**, reduzir o nome do fornecedor e ajustar a tela para que tudo seja visível sem deslizar para o lado.

## Solução
Converter as três listas da tela (Disponíveis, Alocados, Em Processo) em **cards verticais no mobile**, mantendo a tabela atual no desktop. A tabela desktop também recebe os ajustes de conteúdo.

## Alterações

### 1. Ocultar coluna "Valor"
- Remover a coluna **Valor (R$)** da visualização mobile.
- No desktop a coluna pode continuar visível (`hidden md:table-cell`) ou ser removida também — decidir no momento da implementação conforme preferência do usuário.

### 2. Reduzir nome do fornecedor
- Truncar o nome do fornecedor com `truncate` e largura máxima fixa.
- No mobile, exibir apenas o nome truncado em uma linha; tooltip opcional com o nome completo.

### 3. Visualização mobile em cards
- Usar `useIsMobile` para detectar viewport mobile.
- Substituir a `<Table>` por cards verticais quando mobile:
  - **Materiais Disponíveis**: card com checkbox, OP, fornecedor truncado, tipo, selo Carbono/"—", peso, Pt/Pd/Rh e botão "Alocar".
  - **Materiais Alocados**: card com OP, fornecedor truncado, tipo, peso e bag destino.
  - **Em Processo**: card com OP, fornecedor truncado, tipo, peso e status.
- Manter a seleção múltipla no mobile via checkbox no topo de cada card.
- Manter o botão de ação em massa "Alocar selecionados" quando houver itens selecionados.

### 4. Ajustes na tabela desktop
- Ocultar coluna Valor no mobile (`hidden md:table-cell` se mantida no desktop).
- Truncar fornecedor na tabela.
- Manter as colunas OP, Tipo, Carbono, Peso, Pt, Pd, Rh, Ação.

## Arquivos envolvidos
- `src/components/bags/AllocationPanel.tsx` — principal alteração: detecção mobile, cards e ajustes na tabela.
- Possivelmente `src/components/mobile/MobileListRow.tsx` — se for reutilizado/adaptado para os cards de alocação.

## Validação
- Abrir a aba "Alocar" na página de Bags em viewport mobile (393 × 852 px).
- Verificar que não há rolagem horizontal.
- Confirmar que coluna Valor não aparece no mobile.
- Confirmar que nomes longos de fornecedor são truncados.
- Testar seleção múltipla e alocação individual.
