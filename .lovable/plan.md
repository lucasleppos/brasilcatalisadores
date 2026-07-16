## Ajustes nas etapas PeD (Precif./Demonstrativo) e Apr (Aprovação)

### 1. Fluxo Cerâmico — remover PeD como etapa manual

Hoje o fluxo cerâmico é:
```text
Lab em Análise → Em Precificação (PeD) → Gerar Boleto de Aprovação (Apr) → Aprovado
```

A etapa "Cerâmico: Em Precificação" exige uma ação do usuário (avançar) sem valor real — o cálculo do preço já ocorre automaticamente com base nos resultados de laboratório. Vamos removê-la do fluxo do usuário, mantendo toda a lógica de precificação.

**Novo fluxo cerâmico:**
```text
Lab em Análise → Gerar Boleto de Aprovação (Apr) → Aprovado
```

Alterações:

- `src/lib/purchases.ts`
  - Em `getNextStatus`: alterar `"Cerâmico: Lab em Análise" → "Cerâmico: Gerar Boleto de Aprovação"` (pula "Em Precificação").
  - Manter `"Cerâmico: Em Precificação"` na lista de status válidos (para compras já existentes nesse estado), mas ele deixa de aparecer no fluxo padrão.
  - Adicionar migração de estado no `getNextStatus`: se `current === "Cerâmico: Em Precificação"` → retornar `"Cerâmico: Gerar Boleto de Aprovação"` (compat).
  - Em `Cerâmico: Demonstrativo Contestado`: retorno permanece para "Em Trituração/Homogeneização" (sem mudança).

- `src/components/processes/ProcessBoard.tsx`
  - No grupo **"Precif. / Demonstrativo"**: remover `"Cerâmico: Em Precificação"` (fica somente para Peças).
  - No grupo **"Aprovação"**: mantém `"Cerâmico: Gerar Boleto de Aprovação"` (já está lá).

- `src/components/processes/StageActionCard.tsx`
  - No estágio `"Cerâmico: Gerar Boleto de Aprovação"`, habilitar o botão "Visualizar/Gerar PDF do Demonstrativo" (hoje o `canGeneratePdf` inclui só "Em Precificação"). Atualizar:
    - `canGeneratePdf` passa a incluir `"Cerâmico: Gerar Boleto de Aprovação"`.
    - `needsErp` já inclui `isDemonstrative` (que cobre "Gerar Boleto de Aprovação"), então o bloqueio por Boleto Syge continua vigente.
  - Remover a lógica específica de `isCeramicoPricing` que renderiza o painel de precificação no estágio "Em Precificação" — o painel de precificação (`CeramicoPricingPanel`) passa a ser exibido no estágio "Gerar Boleto de Aprovação" para permitir visualização/edição da precificação junto do PDF.

- `src/lib/purchases.ts` (função `advanceStage` / lógica de gate)
  - Nenhuma mudança em `demoStages` — "Cerâmico: Em Precificação" permanece listado para não quebrar compras antigas; a nova rota simplesmente não passa por lá.

### 2. Etapa Apr — bloquear avanço sem Boleto Syge, com campo inline

Hoje, quando o Boleto Syge está vazio nos estágios de aprovação, o card exibe apenas a mensagem "Preencha o campo Boleto Syge na compra antes de prosseguir" — o usuário precisa sair da tela de Processos e editar a compra. Vamos adicionar um input inline no próprio card.

- `src/components/processes/StageActionCard.tsx`
  - Quando `needsErp && missingErp`, substituir a mensagem estática por:
    - Input de texto controlado (`erpInput`, `setErpInput`) com label "Boleto Syge (ERP Number)" e `placeholder`.
    - Botão "Salvar Boleto Syge" que chama uma nova função `updatePurchaseErp(purchaseId, erp)` (nova em `src/lib/purchases.ts`) e depois chama `onCompleted()` para recarregar.
    - Validação: `.trim()` obrigatório, não vazio.
  - Manter o bloqueio: o botão de "Avançar" / "Gerar Boleto" só habilita quando `!missingErp`.
  - Aplicar nos dois pontos onde a mensagem aparece hoje (linhas ~384 e ~654 do arquivo).

- `src/lib/purchases.ts`
  - Adicionar `updatePurchaseErp(id: string, erpNumber: string)` que faz `UPDATE purchases SET erp_number = ? WHERE id = ?`.

### Fora de escopo
- Nenhuma alteração de cálculo de preço.
- Nenhuma migração de banco (colunas já existem; status antigos permanecem válidos).
- Sem mudanças em Peças (PeD continua existindo para o fluxo de Peças).
- Sem mudanças no PDF do demonstrativo.
