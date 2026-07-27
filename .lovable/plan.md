## Objetivo

No painel Laboratório — Cerâmico, quando a compra estiver em reamostragem/reanálise, exibir duas médias por grupo:

- **Média inicial** — congelada, referente aos PPMs existentes no momento da contestação (parâmetro de comparação).
- **Média da reanálise** — calculada em tempo real com os valores atualmente preenchidos.

Fora do modo reanálise, o card continua exatamente como hoje (uma única "Média").

## Como a média inicial é congelada

Não é preciso nova tabela. A base já registra todas as alterações em `lab_result_history` (valores antigos e novos, com data). O painel reconstrói o estado de cada linha no instante da contestação:

1. Obter a data da contestação com `getContestInfo(purchase)` (já existe em `src/lib/purchases.ts`).
2. Partir dos valores atuais de cada linha (`lab_results`) e "desfazer" em ordem inversa todos os registros de `lab_result_history` criados **após** essa data — o `old_*` do registro mais antigo pós-contestação vira o valor inicial; registros de `delete` restauram a linha; linhas criadas depois da contestação (sem histórico anterior) não entram na média inicial.
3. A média inicial é a média simples das linhas assim reconstruídas, com a mesma regra atual (só linhas com Pt, Pd e Rh preenchidos).

Assim a média inicial nunca muda enquanto o operador digita, e reflete fielmente o resultado enviado ao fornecedor.

## Interface

Dentro do bloco de média de cada grupo, em modo reanálise:

```text
┌───────────────────────────────┬───────────────────────────────┐
│ Média inicial (2 análises)    │ Média da reanálise (3 análises)│
│ Pt 339 · Pd 2.228 · Rh 228    │ Pt 350 · Pd 2.300 · Rh 240     │
└───────────────────────────────┴───────────────────────────────┘
        Δ Pt +11 · Pd +72 · Rh +12   (verde/vermelho conforme sinal)
```

- Coluna esquerda em tom neutro/cinza (fixa), coluna direita destacada em laranja claro (cor já usada na reanálise).
- Quando os valores forem idênticos, mostrar "sem alteração" no lugar do delta.
- Grupos sem histórico pós-contestação exibem a mesma média nas duas colunas (nada foi reanalisado ainda).
- O histórico colapsável "Histórico de análises" permanece como está.

## Detalhes técnicos

- Arquivo alterado: `src/components/processes/CeramicoLabPanel.tsx`.
- Nova função pura `computeBaselineRows(rows, historyEntries, contestDate)` no mesmo arquivo, mais um `baselineAvg` por lote calculado uma única vez ao carregar (e recalculado após cada gravação, para acompanhar o histórico).
- Nenhuma mudança de banco, nenhuma mudança no demonstrativo nem no PDF: a precificação continua usando a média atual (reanálise), que é o resultado válido.
- Sem alteração em outros fluxos (peça/sacola).
