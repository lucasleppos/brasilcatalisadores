# Zr(%) e Ce(%) no Laboratório + indicativo "Carbono" na Alocação

## O que muda

### 1. Etapa Laboratório (fluxo cerâmico)
Cada linha de análise (Análise 1, 2 e 3) passa a ter dois campos novos além de Pt/Pd/Rh:
- **Zr (%)**
- **Ce (%)**

Regras:
- São opcionais: a linha continua sendo salva com Pt/Pd/Rh como hoje; Zr e Ce são gravados junto quando preenchidos.
- Entram na média simples do lote, mostrada junto com a média de Pt/Pd/Rh (exibida como porcentagem, padrão brasileiro).
- Não entram em nenhum cálculo de valorização, precificação, demonstrativo ou PDF, e não aparecem em nenhuma outra tela.

### 2. Tela "Alocar Material"
Na tabela de materiais disponíveis, imediatamente após a coluna **Tipo**, uma nova coluna sem título fixo exibe o selo **"Carbono"** quando o lote atende as duas condições ao mesmo tempo:
- média de **Ce < 3,5**
- média de **Zr < 5**

Se algum dos dois valores não tiver sido informado no laboratório, nenhum selo aparece (célula vazia). O selo é apenas informativo — não altera peso, valor, seleção nem alocação.

## Detalhes técnicos

- **Migração de banco**: adicionar `zr_pct numeric` e `ce_pct numeric` (nulos permitidos) em `public.lab_results`. Sem mudança de RLS ou grants.
- `src/lib/lab-results.ts`: incluir `zrPct`/`cePct` no mapeamento.
- `src/components/processes/CeramicoLabPanel.tsx`: grid das linhas passa de 3 para 5 campos numéricos (`type="text"` + `inputMode="decimal"` com `parseNum`, conforme o padrão do app); `calcAverage` calcula média de Zr e Ce sobre as linhas que os têm preenchidos; `persistRow` grava/atualiza as duas colunas. Histórico de contestação (`lab_result_history`) permanece restrito a Pt/Pd/Rh.
- `src/components/bags/AllocationPanel.tsx`: em `loadAvailableMaterials`, buscar `lab_results` dos itens listados, calcular média de Zr/Ce por `purchase_item_id` e derivar o sinalizador `carbono`; renderizar `<Badge>Carbono</Badge>` na nova célula após Tipo, com token semântico de cor (sem cores fixas).
- Escopo: apenas o Laboratório cerâmico (`CeramicoLabPanel`) e a tabela de materiais disponíveis em "Alocar Material". `SacolaLabPanel`, demonstrativo, PDF e cálculos permanecem intocados.
