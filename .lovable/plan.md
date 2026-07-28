## Diagnóstico

O peso de corte **existe no banco** (7 kg, `weight_ceramica_extraida`, etapa "Peças: Em Corte", compra Boleto 4444). O problema é no front-end.

Existe um laço infinito no card:

```text
StageActionCard renderiza
  -> passa onChecklistChange={(ready) => { ...; setLossRefresh(k => k+1) }}  (função nova a cada render)
     -> StageChecklist tem useEffect com dependência [.., onChecklistChange]
        -> dispara e chama onChecklistChange
           -> setLossRefresh incrementa -> novo render -> nova função -> repete
```

Cada volta do laço faz `PecasLossSummary` recarregar as evidências, e cada chamada do Supabase disputa o lock de autenticação. Daí os avisos no console ("Lock ... was not released within 5000ms") e o erro `Lock broken by another request with the 'steal' option`. Resultado: a leitura das evidências nunca conclui (peso de corte fica "pendente") e o `addEvidence` do peso pós-trituração é abortado no `auth.getUser()`, então nada é salvo.

## O que fazer

1. **Quebrar o laço** (`src/components/processes/StageActionCard.tsx`)
   - Estabilizar o callback passado ao checklist com `useCallback` e parar de incrementar `lossRefresh` dentro dele.
   - Atualizar o resumo apenas quando uma evidência for realmente registrada.

2. **Notificar de forma pontual** (`src/components/processes/StageChecklist.tsx`)
   - Adicionar uma prop opcional `onEvidenceAdded` chamada após salvar peso/foto/nota; o card usa isso para incrementar `lossRefresh`.
   - Garantir que o efeito de "pode avançar" use uma ref para o callback, sem depender da identidade da função.

3. **Reduzir disputa pelo lock de auth** (`src/lib/stage-tasks.ts`)
   - Em `addEvidence`/`addLabAnalysis`, obter o usuário via `supabase.auth.getSession()` (leitura de sessão em cache) em vez de `getUser()`, e não bloquear a inserção caso a chamada falhe.

4. **Validar no preview**
   - Abrir o card de "Peças: Trituração e Amostragem" da compra 4444, confirmar que "Peso após corte" mostra 7,0000 kg, salvar o peso pós-trituração e verificar que ele persiste e o console fica limpo.

Nenhuma mudança de banco, PDF ou regras de etapa.
