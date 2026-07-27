## Objetivo

Quando um demonstrativo é contestado e o processo volta para trás, o card deve ficar visualmente destacado como "EM REAMOSTRAGEM E REANÁLISE", exibir o motivo da contestação e permitir que o operador reedite todos os dados já lançados (grupos, pesos, TARA, fotos e análises), percorrendo novamente as etapas até a aprovação.

## 1. Detectar o modo reanálise

Criar um helper em `src/lib/purchases.ts` (`isInReanalysis(purchase)` + `getContestInfo(purchase)`), que varre o histórico de status de trás para frente e identifica se existe um registro de contestação posterior à última passagem pela etapa de aprovação. Retorna também o motivo e a data da contestação, que já ficam gravados na observação do histórico.

O modo permanece ativo em todas as etapas do retorno (Conferência, Trituração/Homogeneização, Análise, Precificação) e é encerrado quando o processo chega novamente à etapa de Aprovação/Boleto.

## 2. Aparência do card

Em `src/components/processes/StageActionCard.tsx`, quando em reanálise:

- Borda e fundo do card em laranja claro (tokens novos no design system, sem cores hardcoded).
- Faixa no topo com o selo "EM REAMOSTRAGEM E REANÁLISE".
- Bloco de destaque com: motivo da contestação, data e etapa de destino.
- Resumo dos dados já registrados (grupos conferidos com peso bruto, TARA, peso líquido e médias de análise), para o operador ver o que existe antes de alterar.

## 3. Reedição dos dados

- **Conferência**: o painel de conferência cerâmica já carrega os grupos existentes; passa a permitir editar peso bruto, categoria e foto de cada grupo, além de adicionar e remover grupos (conforme decidido). Ao remover um grupo, as análises e evidências vinculadas a ele são apagadas junto, com aviso de confirmação.
- **Ponto crítico a corrigir**: hoje o salvamento da conferência apaga e recria todos os itens do processo, o que zera a TARA e desvincula as análises de laboratório. Passa a atualizar os grupos existentes pelo id e só inserir/excluir o que mudou, preservando TARA, análises e alocações.
- **Trituração/Homogeneização**: já recarrega TARA e foto por grupo; mantém o comportamento de edição.
- **Análise**: o painel de laboratório já recarrega até 3 análises por grupo; mantém edição e recálculo automático da média.

## 4. Fluxo de retorno

O processo percorre novamente as etapas normalmente (Conferência → Trituração → Análise → Precificação → Aprovação), com os botões de avanço de sempre. Ao voltar à etapa de aprovação, o destaque laranja e o selo somem, um novo demonstrativo é gerado com os valores atualizados e o motivo da contestação anterior permanece registrado no histórico do processo.

## Detalhes técnicos

- `src/lib/purchases.ts`: helpers `isInReanalysis` / `getContestInfo` a partir de `status_history`.
- `src/components/processes/StageActionCard.tsx`: estilo condicional do card, selo, bloco de motivo e resumo dos dados já lançados.
- `src/components/processes/CeramicoConferenciaPanel.tsx`: edição inline dos grupos e persistência incremental (update/insert/delete por id) em vez de apagar tudo.
- `src/index.css` / `tailwind.config.ts`: token semântico para o estado de reanálise (laranja claro).
- Sem alteração de banco de dados nem da edge function de PDF.
