## Objetivo
Permitir selecionar vários grupos/peças na tabela "Materiais Disponíveis para Alocação" e enviar todos de uma vez para o mesmo bag.

## O que muda (apenas `src/components/bags/AllocationPanel.tsx`)

1. **Coluna de checkbox**
   - Nova primeira coluna na tabela de materiais disponíveis com `Checkbox` por linha.
   - Checkbox no cabeçalho para "selecionar todos / limpar seleção" (estado indeterminado quando parcial).
   - Clique na linha também alterna a seleção (sem interferir no botão "Alocar").

2. **Barra de ação em lote**
   - Aparece acima da tabela quando há 1+ selecionados: "N itens selecionados · X,X kg · R$ Y" + botões "Alocar selecionados" e "Limpar".

3. **Diálogo de alocação em lote**
   - Reaproveita o diálogo atual, agora aceitando 1 ou N materiais.
   - Mostra a lista dos itens escolhidos (fornecedor, tipo, peso) e o seletor de Bag destino.
   - Rodapé com o peso projetado: `peso atual do bag + soma dos selecionados / máximo`.

4. **Validação de peso considerando o total do lote**
   - Usa a soma dos pesos selecionados em `isOverWeight` / `isNearLimit`.
   - Acima de 5% da margem: bloqueia com toast (como hoje).
   - Entre o máximo e 5%: exibe o `AlertDialog` de confirmação, uma única vez para o lote inteiro.

5. **Execução**
   - `allocateItem` é chamado em sequência para cada item selecionado.
   - `syncCeramicoAllocation` é chamado uma vez por `purchaseId` distinto, ao final (evita chamadas repetidas).
   - Toast: "N materiais alocados com sucesso"; em caso de falha parcial, informa quantos foram alocados.
   - Limpa a seleção e recarrega os dados.

6. **Botão "Alocar" individual permanece** na linha, agora funcionando como atalho para o mesmo fluxo com um único item.

## Detalhes técnicos
- Estado novo: `selectedIds: Set<string>` (chaveado por `purchaseItemId`), e `allocatingMaterials: AvailableMaterial[]` substituindo `allocatingMaterial`.
- `Checkbox` do shadcn (`@/components/ui/checkbox`).
- Sem mudanças de banco de dados nem em `src/lib/bags.ts`.
- `AllocateMaterialDialog.tsx` não é alterado (fluxo separado, usado fora do painel).
