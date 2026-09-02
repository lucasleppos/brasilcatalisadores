# Ajustes na tela "Alocar Material"

## 1. Selo "Carbono" — verificado no banco

A coluna do selo já existe no código (vem depois de "Tipo"), mas ela fica vazia quando o material não atende à regra. Nos dois lotes da compra 020926-58 (BRASIL FILIAL BETIM) os resultados de laboratório são:

- Lote 1: Zr 5,0% / Ce 7,0% → não é carbono (Ce acima de 3,5 e Zr não menor que 5)
- Lote 2: Zr 1,5% / Ce 4,0% → não é carbono (Ce acima de 3,5)

Ou seja, a regra atual (Ce < 3,5 **e** Zr < 5) está funcionando; nenhum dos lotes se qualificou.

Mudança proposta: transformar a coluna em uma coluna nomeada "Carbono", sempre visível no cabeçalho, mostrando o selo "Carbono" quando a regra é atendida e um "—" quando não é — assim fica claro que a verificação existe e foi feita, em vez de uma coluna sem título e aparentemente ausente.

Se os limites (Ce < 3,5 e Zr < 5) estiverem diferentes do esperado, basta informar os valores corretos.

## 2. Nova coluna "OP"

Incluir uma coluna "OP" com o Nº do Pedido da compra (ex.: 020926-58), posicionada antes de "Fornecedor" nas listas de material da tela Alocar Material. O número já é carregado junto da compra; passa a ser trazido também na consulta dos materiais disponíveis, em processo e alocados.

## 3. Pt, Pd e Rh sem casas decimais

Os valores de Pt, Pd e Rh passam a ser exibidos arredondados, sem casas decimais e com separador de milhar brasileiro (ex.: `213,3333…` → `213`; `1200` → `1.200`). Apenas exibição — os cálculos continuam usando o valor original.

## Detalhes técnicos

- `src/components/bags/AllocationPanel.tsx`: adicionar `purchaseNumber` aos tipos de material e às três consultas (`select` já inclui a compra; incluir `purchase_number`); nova `TableHead` "OP" e `TableHead` "Carbono"; renderizar PPMs com `fmtNum(valor, 0)`.
- `src/components/bags/MobileBagsList.tsx` (se exibir esses valores) recebe o mesmo tratamento de exibição, para manter consistência mobile.
- Nenhuma alteração de schema, RLS ou de lógica de precificação.
