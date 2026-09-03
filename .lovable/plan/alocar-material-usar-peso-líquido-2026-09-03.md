# Alocar Material: usar peso líquido

Situação confirmada no banco: nos lotes cerâmicos, `purchase_items.weight` guarda o **peso bruto** e `weight_loss` guarda a **tara** (ex.: OP 020926-55 com 4,15 kg bruto e 3,465 kg de tara). A tela Alocar Material hoje mostra e aloca o bruto, e os 5 registros já alocados em bags também foram gravados com o bruto.

## O que será feito

### 1. Peso líquido na listagem
- Nas três listas (Disponíveis, Alocados, Em Processo), o peso exibido dos lotes cerâmicos passa a ser **bruto − tara**.
- Os totais do topo (Peso Disponível, Em Processo) e o total da seleção múltipla passam a somar o peso líquido.
- Fluxo de Peças não muda: as linhas Flex/Carbono já usam o peso real pós-trituração, e nesse fluxo `weight_loss` significa perda (não tara), então nada é subtraído ali.

### 2. Contabilização da alocação
- Ao alocar, o peso gravado no bag é o líquido, então o total do bag, o percentual de ocupação e os avisos de limite (1.000 kg / margem de 5%) passam a considerar peso líquido.
- O diálogo de confirmação de alocação mostra o mesmo peso líquido.

### 3. Correção dos 5 registros já alocados
- Atualizar os `bag_items` cerâmicos existentes para o peso líquido e recalcular o peso total dos bags afetados (5 itens, 4 bags).
- Exemplo: item de 11,3 kg com 9,22 kg de tara passa a 2,08 kg.

## Detalhes técnicos

- `src/components/bags/AllocationPanel.tsx`: novo cálculo `netWeight = weight − (weight_loss ?? 0)` aplicado apenas quando `item_type = 'ceramico'`, com piso em 0; `weight_loss` incluído nos `select` de `purchase_items`; usado em `availableMaterials`, `allocatedMaterials`, `inProcessMaterials` e nos totais.
- `src/components/bags/AllocateMaterialDialog.tsx`: recebe o peso já líquido (sem lógica nova de tara).
- Correção de dados via `UPDATE` em `bag_items` + recálculo de `bags.total_weight`/`total_paid_brl` (sem mudança de estrutura).
- Nenhuma alteração no demonstrativo, PDF ou precificação — eles já usam peso líquido.
