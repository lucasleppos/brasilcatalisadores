## Problema

Hoje a "Média inicial" não é um valor fixo: ela é reconstruída a cada render por `calcBaselineAverage` em `src/components/processes/CeramicoLabPanel.tsx`. Quando não existe registro de histórico para uma versão de análise, a função usa o valor **atual** da linha (`l.rows`) como se fosse o valor original. Resultado: ao digitar uma nova Análise 2 na reanálise, ela entra na média inicial e o bloco "Média inicial (2 análises)" muda junto com a reanálise — exatamente o que aparece no print.

## Solução

Congelar a média inicial em um snapshot gravado uma única vez, no momento em que o painel é aberto pela primeira vez em modo reanálise, e nunca mais recalculá-la a partir dos campos editáveis.

### Onde guardar

Em `stage_evidence` (mesma tabela já usada pelo fluxo cerâmico), com:
- `stage`: `analise_ceramico`
- `task_key`: `lab_baseline_<purchase_item_id>`
- `value_text`: JSON `{ pt, pd, rh, n, at }`

Assim o valor vive junto da compra, sobrevive a recarregamentos e não depende do histórico.

### Comportamento

1. Ao carregar `loadLotes`, se a compra estiver em reanálise (`getContestInfo(purchase)` retorna contestação):
   - Buscar os snapshots existentes de `stage_evidence`.
   - Para cada grupo sem snapshot, calcular a média das linhas **como estão nesse primeiro carregamento** (que ainda são os dados da análise inicial) e gravar o snapshot.
   - Para grupos que já têm snapshot, apenas ler — nunca sobrescrever.
2. A UI passa a exibir:
   - **Média inicial** = valor do snapshot (imutável, tons neutros).
   - **Média da reanálise** = `calcAverage` das linhas atuais (laranja).
   - **Δ Pt / Δ Pd / Δ Rh** = reanálise − snapshot; se iguais, "Sem alteração em relação à análise inicial".
3. Fora do modo reanálise, nada muda: exibe apenas a média única.

### Detalhes técnicos

- Remover `calcBaselineAverage` (reconstrução por histórico) e o estado derivado dele; substituir por um estado `baselines: Record<string, {pt;pd;rh;n}>` carregado/gravado em `loadLotes`.
- Gravar o snapshot com `upsert`/insert condicional para evitar corrida em duplo carregamento; a chave `task_key` por item garante unicidade lógica.
- Salvamento de PPM (`persistRow`), histórico (`logHistory`) e precificação continuam usando a média atual — o snapshot é apenas exibição comparativa.
- O snapshot continua fora do demonstrativo e do PDF.

### Ressalva

Para a compra que já está em reanálise agora, as linhas atuais já foram editadas; ao aplicar a mudança o snapshot será gerado a partir do que estiver salvo no momento. Se quiser, no mesmo passo posso semear o snapshot dessa compra usando o valor mais antigo registrado em `lab_result_history` para cada versão, recuperando a média original real.
