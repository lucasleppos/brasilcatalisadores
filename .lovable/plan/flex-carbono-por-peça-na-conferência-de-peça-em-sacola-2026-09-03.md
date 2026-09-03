# Flex / Carbono por peça na Conferência de Peça em Sacola

## O que muda na conferência

Na tela **Conferência — Peça em Sacola**, cada peça adicionada passa a ter uma marcação obrigatória de material:

- **Flex** ou **Carbono** (dois botões/seletor por peça)
- Padrão: **Flex** (pode ser alterado na lista de peças já adicionadas)
- A marcação aparece também no bloco "Adicionar Peça", para já entrar correta

Essa informação é apenas classificatória: não altera peso, valor, precificação, laboratório, demonstrativo, PDF ou qualquer etapa seguinte.

## O que muda na Alocação (módulo Bag)

Depois da aprovação, na tela **Alocar Material**, uma compra de Peça em Sacola deixa de listar uma linha por peça e passa a mostrar até **2 linhas** por OP:

- 1 linha com a soma das peças marcadas como **Flex**
- 1 linha com a soma das peças marcadas como **Carbono**

Regras:

- Peso da linha = soma dos pesos das peças daquela marcação; valor da linha = soma dos valores dessas peças.
- Pt / Pd / Rh = média ponderada pelo peso das peças da linha (sem casas decimais, como hoje).
- A coluna **Carbono** já existente mostra **Flex** ou **Carbono**.
- Se todas as peças forem de uma só marcação, aparece apenas 1 linha.
- Cada linha é alocada de forma independente e sai da lista após alocada; seleção múltipla, filtros, ordenação por OP e layout mobile continuam iguais.
- Peças separadas do fluxo (excluídas na conferência) continuam fora da alocação.
- Fluxos Cerâmico e Peças (Corte/Moagem com pesos Flex/Carbono) não mudam.

## Detalhes técnicos

- Migração: adicionar coluna `material_kind text` em `public.purchase_items` (valores `flex` | `carbono`, default `flex`, aceita nulo para o legado). Sem mudança de RLS/GRANTs.
- `src/components/processes/SacolaConferenciaPanel.tsx`: campo `materialKind` no tipo `ConferenciaPiece`, seletor no formulário de adicionar e em cada linha (desktop e mobile), leitura no `select` e gravação em `persistPieces`.
- `src/components/bags/AllocationPanel.tsx`: para compras de `item_type = peca_sacola` sem pesos Flex/Carbono de trituração, agregar os itens `conferencia` por `material_kind` em linhas virtuais com id `<purchase_id>::kind_flex` / `<purchase_id>::kind_carbono`; reaproveitar a lógica de exibição da coluna Carbono (`fraction`) e a checagem de itens já alocados por id virtual.
- `src/components/bags/AllocateMaterialDialog.tsx`: mesma agregação, para consistência.
- Nenhuma alteração em precificação, demonstrativo, PDF ou relatórios.
