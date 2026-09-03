# Pesos separados Flex / Carbono no fluxo de Peças

## O que muda nas etapas

**Peças: Em Corte** — os dois campos abaixo substituem o campo único "Peso real da cerâmica extraída":
- Peso Real Flex Extraído (kg)
- Peso Real Carbono Extraído (kg)

**Peças: Trituração e Amostragem** — os dois campos abaixo substituem o campo único "Peso após trituração":
- Peso Flex após trituração (kg)
- Peso Carbono após trituração (kg)

Regra de liberação: em cada etapa, basta **um dos dois** pesos estar preenchido para concluir. Se nenhum estiver, o botão de concluir fica bloqueado com aviso "Informe o peso Flex e/ou Carbono".

As fotos opcionais de cada etapa continuam como estão. O resumo "Pesagens do processo" passa a listar as linhas Flex e Carbono separadamente (somente quando informadas).

## O que muda na Alocação

Na tela **Alocar Material**, uma compra de peças com os dois pesos após trituração passa a aparecer em **duas linhas** com a mesma OP. A identificação da fração usa a coluna **Carbono** que já existe:
- linha com peso Flex → coluna Carbono mostra **Flex**
- linha com peso Carbono → coluna Carbono mostra **Carbono**

Nos materiais cerâmicos a coluna Carbono continua funcionando como hoje (selo pelo Ce/Zr do laboratório ou "—").

O valor pago é dividido proporcionalmente aos pesos após trituração digitados (ex.: 6 kg Flex + 4 kg Carbono → 60% / 40% do valor). Se apenas um peso for informado, aparece uma única linha com o valor integral.

Cada linha é alocada de forma independente (inclusive na seleção múltipla) e, depois de alocada, deixa de aparecer como disponível. Ordenação por OP, colunas Pt/Pd/Rh e a versão mobile continuam iguais.


Fora da alocação nada muda: demonstrativo, PDF, precificação e relatórios seguem usando o valor e o peso totais da compra.

## Detalhes técnicos

- `src/lib/stage-tasks.ts`: novas chaves `weight_flex_extraido`, `weight_carbono_extraido` (Corte) e `weight_flex_trituracao`, `weight_carbono_trituracao` (Moagem), com `required: false` e um grupo `anyOf` por etapa; `canAdvanceStage` ganha validação de grupo "pelo menos um preenchido". As chaves antigas (`weight_ceramica_extraida`, `weight_pos_trituracao`) continuam sendo lidas como legado.
- `src/components/processes/StageChecklist.tsx`: renderiza os campos e mostra o pendente do grupo quando nenhum dos dois foi salvo.
- `src/components/processes/PecasLossSummary.tsx`: linhas separadas Flex/Carbono para corte e trituração, com fallback para os valores legados.
- `src/lib/purchases.ts`: `getRealWeightsByItem` passa a retornar, por item de conferência, as frações `flex` e `carbono` (rateio proporcional ao peso de catálogo), mantendo o comportamento atual quando só existe o peso legado.
- `src/components/bags/AllocationPanel.tsx` (e `AllocateMaterialDialog.tsx` para consistência): gera linhas virtuais por fração usando `purchase_item_id` sufixado (`<id>::flex` / `<id>::carbono`), com `label` de fração exibido junto à OP; a checagem de itens já alocados considera o sufixo.
- Sem alterações de schema, RLS ou de lógica de precificação (`bag_items.purchase_item_id` já é texto).
