## Objetivo
Criar um fluxo próprio para **Peça em Sacola**, separado do fluxo de Peça fechada (que fica inalterado):

```text
Inclusão → Conferência (peças do catálogo)
        → Trituração (peça a peça)
        → Laboratório (PPM por peça)
        → Precificação (confirmar valor a pagar)
        → Aprovação (PDF + Boleto Syge)
        → Alocado ao Bag → Concluído
```

## 1. Identificação do fluxo
- Hoje `material_flow` só tem `pecas` e `ceramico`; sacola é detectada pelos itens (`item_type = peca_sacola`).
- Adicionar o valor `sacola` em `MaterialFlow` e em `determineMaterialFlow` (compra cujos itens são `peca_sacola` → `sacola`).
- Compras antigas continuam funcionando: onde não houver `sacola`, cai no comportamento atual (detecção por item).

## 2. Máquina de estados (`src/lib/purchases.ts`)
- Novo `SACOLA_FLOW`: `Aguardando Inclusão → Aguardando Conferência → Em Conferência → Peças: Em Trituração → Peças: Laboratório → Peças: Aguardando Demonstrativo → Peças: Gerar Boleto de Aprovação → Peças: Alocado ao Bag → Concluído` (reaproveita status já existentes, sem migração de banco).
- `getNextStatus` para `sacola`:
  - `Em Conferência → Peças: Em Trituração`
  - `Peças: Em Trituração → Peças: Laboratório`
  - `Peças: Laboratório → Peças: Aguardando Demonstrativo`
  - `Peças: Aguardando Demonstrativo → Peças: Gerar Boleto de Aprovação`
  - `Peças: Gerar Boleto de Aprovação → Peças: Alocado ao Bag` (com exigência do Boleto Syge, como hoje)
  - Contestação continua voltando para `Peças: Aguardando Demonstrativo`.
- Não há etapa de Corte nem pesagem pós-trituração neste fluxo.
- `isInParallelPhase` / encerramento automático após alocação continuam válidos.

## 3. Etapa de Trituração (nova tela)
- Novo painel `SacolaTrituracaoPanel.tsx`, aberto por um botão “Triturar Peças” no card da etapa.
- Lista cada peça conferida (Código, Referência, Qtd) com um marcador “Triturada”, salvo em `stage_evidence` (uma evidência por peça).
- **Sem campo de peso** (definido com o usuário) — apenas a confirmação por peça.
- Botão “Encerrar” habilita só quando todas as peças estiverem marcadas; avança para Laboratório.

## 4. Etapa de Laboratório
- Reaproveita o `SacolaLabPanel.tsx` existente (PPM por peça conferida, salvo em `lab_results` com `purchase_item_id`).
- Ajustes: pré-carregar valores já salvos (já faz), permitir edição, e ao encerrar avançar para Precificação.
- O painel passa a ser acionado pelo status `Peças: Laboratório` no fluxo `sacola`.

## 5. Etapa de Precificação
- Usa o painel de precificação de sacola já existente (`SacolaPricingPanel`), acionado em `Peças: Aguardando Demonstrativo`.
- Valor sugerido calculado com os **PPMs do laboratório** (não do catálogo) e a margem `margin_pecas` do fornecedor; valor unitário editável livremente, como no fluxo de peças.
- Confirmar precificação grava os valores e avança para Aprovação.

## 6. Etapa de Aprovação
- Igual ao que já existe: Visualizar demonstrativo, Gerar PDF, Contestar sempre ativos; “Aprovar” bloqueado até preencher o Boleto Syge.
- Demonstrativo/PDF da sacola mostram Código, Referência, Qtd, Valor unitário e Subtotal (sem PPM/margem), como no fluxo de peças.

## 7. Board de Processos e permissões
- Grupos de abas: sacola entra em “Conferência”, “Trit. / Homog. / Amostr.”, “Prep. Amostra / Análise” (Laboratório), “Precif. / Demonstrativo” e “Aprovação” — sem mudar os grupos existentes.
- `STAGE_ROLES`: `Peças: Em Trituração` → operacional; `Peças: Laboratório` → laboratório (já configurado).
- Badge do card passa a exibir “Sacola” para esse fluxo.

## Detalhes técnicos
- Arquivos afetados: `src/lib/purchases.ts` (tipo, flows, transições, badge helpers), `src/components/processes/StageActionCard.tsx` (roteamento dos painéis), novo `src/components/processes/SacolaTrituracaoPanel.tsx`, ajustes em `SacolaLabPanel.tsx` e `SacolaPricingPanel.tsx`, e rótulos em `DemonstrativoViewDialog.tsx` / edge function do PDF.
- Sem alteração de schema no banco: usa `stage_evidence`, `lab_results` e `purchase_items` já existentes.
