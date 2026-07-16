## Manter cerâmico na etapa de Aprovação após confirmar precificação

O fluxo já bloqueia o botão **Aprovar** enquanto o Boleto Syge não é preenchido, e o campo inline de Syge está em `StageActionCard.tsx`. Falta corrigir um comportamento residual do painel de precificação cerâmica.

### Problema

Em `src/components/processes/CeramicoPricingPanel.tsx` (linha 225), ao **Confirmar Precificação** o painel executa `advanceStage(purchase.id, purchase.status)`. Como agora o cerâmico entra na etapa de Aprovação (`Cerâmico: Gerar Boleto de Aprovação`) direto após a análise, esse `advanceStage` faz a compra **sair** da Aprovação para `Aprovado - Aguardando Pagamento` / alocação de Bag — sem exigir o Syge.

### Correção pontual

Arquivo: `src/components/processes/CeramicoPricingPanel.tsx` (função `handleConfirm`, ~linhas 203–235).

- Condicionar a chamada `await advanceStage(...)` a `purchase.status === "Cerâmico: Em Precificação"`.
- Quando aberto a partir da Aprovação (`Cerâmico: Gerar Boleto de Aprovação`), o painel apenas salva `calc_input`, `calc_result`, `total_value` dos lotes e atualiza `total_brl` da compra, e então fecha. A compra permanece na Aprovação até o Syge ser incluído.
- Ajustar a `toast.success` para refletir os dois casos (ex.: "Precificação atualizada" quando não avança).

### Comportamento resultante

1. Análise cerâmica finalizada → compra vai para **Aprovação** (`Cerâmico: Gerar Boleto de Aprovação`).
2. Usuário pode: **Visualizar**, gerar **PDF**, **Contestar** e **Ver Precificação dos Lotes** (reprecificar quantas vezes precisar sem sair da etapa).
3. Após OK do fornecedor, usuário preenche o **Boleto Syge** no campo inline → botão **Aprovar** libera.
4. Ao clicar em Aprovar, a compra avança para Pagamento + alocação de Bag.

### Fora do escopo

- Nenhuma outra etapa, cálculo, PDF ou permissão é alterada.
- Fluxo de peças continua como está (já funciona corretamente porque passa por `Peças: Aguardando Demonstrativo` antes da Aprovação).
