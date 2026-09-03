# Alocação de Peças: sempre 2 linhas por OP (Flex e Carbono)

## Problema

Hoje a divisão Flex/Carbono é feita **por peça conferida**: uma OP com 2 peças gera 4 linhas (Flex + Carbono para cada peça), como no teste da OP 030926-25.

## Comportamento desejado

Independente da quantidade de peças na OP, a tela **Alocar Material** mostra no máximo **2 linhas** para aquela OP:

- 1 linha **Flex** — peso Flex após trituração informado na etapa de Moagem
- 1 linha **Carbono** — peso Carbono após trituração

Regras:

- Se apenas um dos pesos foi informado, aparece apenas 1 linha (com o valor integral da OP).
- O **valor** de cada linha é o valor total da OP (soma de todas as peças conferidas) dividido proporcionalmente aos dois pesos digitados.
- **Pt / Pd / Rh** exibidos: média ponderada pelo peso das peças da OP (sem casas decimais, como já está).
- Fornecedor, Tipo, coluna Carbono (Flex/Carbono), ordenação por OP, seleção múltipla e layout mobile continuam iguais.
- Cada uma das 2 linhas é alocada de forma independente e desaparece da lista após alocada.
- Materiais cerâmicos não mudam: continuam uma linha por grupo, com o selo Carbono por Ce/Zr ou "—".
- Fora da alocação nada muda (demonstrativo, PDF, precificação, relatórios seguem com valor e peso totais).

## Detalhes técnicos

- `src/lib/purchases.ts`: substituir/complementar `getRealWeightFractionsByItem` por uma versão **por compra** (`getRealWeightFractionsByPurchase`), retornando `{ flex, carbono, legacy }` por `purchase_id` sem ratear por item.
- `src/components/bags/AllocationPanel.tsx`: para compras de peças com peso Flex/Carbono, agregar os itens de conferência da OP (soma de valores, média ponderada de PPMs, fornecedor/tipo do primeiro item) e emitir **uma linha virtual por fração** com id `<purchase_id>::flex` / `<purchase_id>::carbono`. Quando não houver pesos Flex/Carbono, manter o comportamento atual por item (legado/cerâmico).
- `src/components/bags/AllocateMaterialDialog.tsx`: mesma agregação para manter consistência.
- Checagem de itens já alocados passa a comparar também os ids virtuais por compra.
- Sem alterações de schema, RLS ou de precificação.
