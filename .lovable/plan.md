## Situação atual (verificada no banco)

A compra de peças `27/07/2026 - 02` (Syge 4444) está com status **"Peças: Alocado ao Bag"** — a trituração já foi concluída e o fluxo avançou corretamente. O problema é como esse status é tratado nas telas:

- **Processos**: "Peças: Alocado ao Bag" não pertence a nenhuma aba do quadro, mas continua entrando na contagem dos KPIs → é ele que aparece como "Em Produção: 1".
- **Concluídos**: a página só lista `Peças: Encerrado`, `Cerâmico: Encerrado`, `Concluído` ou `op_status = Bag Alocado`. Como os itens ainda não foram alocados em bag, a compra não aparece em lugar nenhum.
- **Bags**: a compra já é elegível (status listado, filial matriz, 2 itens de conferência de 3 un cada), mas o peso oferecido para alocação vem do catálogo (3,48 kg + 3,87 kg), e não do peso real após trituração.

## Alterações propostas

1. **Tirar peças pós-trituração do quadro de Processos** (`src/lib/purchases.ts`)
   - Estender `isInParallelPhase` para incluir peças com status "Peças: Alocado ao Bag", igual ao cerâmico com `op_status = Alocando Bag`.
   - Efeito: o KPI "Em Produção" deixa de contar essa compra e ela some das abas de Processos.

2. **Mostrar a compra em Concluídos** (`src/pages/CompletedPage.tsx`)
   - Incluir no filtro as compras com status "Peças: Alocado ao Bag" (e cerâmicos em "Alocando Bag"), exibindo na coluna Bag(s) o indicador "Aguardando alocação" enquanto não houver bag vinculado.
   - Manter a rotina `syncCeramicoAllocation`, que muda o status para "Peças: Encerrado" assim que todos os itens de conferência forem alocados — aí a linha passa a mostrar os bags.

3. **Usar o peso após trituração na alocação do bag** (`src/components/bags/AllocationPanel.tsx`)
   - Para compras de peças, ler a evidência `weight_pos_trituracao` (registrada na etapa de Trit./Homog./Amostr.) em `stage_evidence`.
   - Quando existir, esse peso passa a ser o peso disponível para alocação, em vez do peso de catálogo dos itens de conferência.
   - Como a compra tem vários itens de conferência e apenas um peso real de trituração, o peso real será **rateado proporcionalmente** entre os itens (na proporção do peso de catálogo de cada um), garantindo que a soma alocada ao bag seja exatamente o peso após trituração.
   - Na tabela de materiais disponíveis, indicar que o peso exibido é o peso real pós-trituração; se a evidência não existir, mantém-se o peso de catálogo como hoje.

4. **Validação em tela**
   - Conferir que a compra de peças aparece em "Materiais Disponíveis" com o peso real, alocar em um bag e confirmar que o status vira "Peças: Encerrado" e a compra aparece em Concluídos com o bag vinculado.

## Detalhe técnico

Nenhuma migração de banco é necessária — o peso de trituração já é persistido em `stage_evidence` (`task_key = weight_pos_trituracao`). Arquivos afetados: `src/lib/purchases.ts`, `src/pages/CompletedPage.tsx` e `src/components/bags/AllocationPanel.tsx`.
