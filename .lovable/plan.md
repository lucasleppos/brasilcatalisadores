# Quantidade devolvida na conferência de Peças

Permitir que o operador registre peças reprovadas/devolvidas na entrada, descontando-as do total declarado para que a conferência possa ser encerrada.

## Como vai funcionar

No painel **Conferência — Peças** (apenas fluxo de Peças soltas):

- Novo bloco "Peças devolvidas" com:
  - **Quantidade devolvida (un)** — número inteiro, 0 por padrão.
  - **Motivo da devolução** — texto curto (ex.: "2 peças deformadas"), obrigatório quando a quantidade for maior que zero.
- O total declarado passa a ser calculado como: `declaradas - devolvidas`.
  - Exemplo: 5 recebidas, 2 devolvidas → progresso e encerramento exigem 3 peças conferidas.
- O cabeçalho do painel mostra a composição: `5 declaradas · 2 devolvidas · 3 no fluxo`.
- Bloqueios: não é possível informar devolução maior que o total declarado, nem encerrar com motivo em branco.
- Ao salvar/encerrar, quantidade e motivo são gravados como evidência da etapa, ficando visíveis no histórico da compra e mantendo a rastreabilidade.

Peças em Sacola e Cerâmico ficam inalterados.

## Detalhes técnicos

- `src/components/processes/SacolaConferenciaPanel.tsx`:
  - Estados `returnedQtyStr` e `returnedReason`, carregados no `open` a partir de `stage_evidence`.
  - `declaredQty = max(0, baseDeclaredQty - excludedQty - returnedQty)`; `isComplete` e a barra de progresso usam esse valor.
  - Persistência em `stage_evidence` (sem migração): `stage: "conferencia"`, `task_key: "qtd_devolvida"` (`data_type: "number"`, `value_numeric`) e `task_key: "motivo_devolucao"` (`data_type: "text"`, `value_text`) — delete + insert por `purchase_id`/`task_key` para evitar duplicidade.
  - Bloco renderizado somente quando `!isSacola` e o fluxo não é cerâmico.
- Nenhuma alteração de schema: `stage_evidence` já suporta valor numérico e texto por etapa.
