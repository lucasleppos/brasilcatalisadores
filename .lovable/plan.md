## Objetivo

No card **Peças: Trituração e Amostragem**, o bloco superior mostra apenas a sequência de pesagens (conferência → corte → trituração), mantendo o campo "Peso após trituração" como está. As linhas de perda (corte, trituração, total em kg/%) saem da tela do operacional — ficarão para um relatório futuro.

## O que muda

1. **Bloco de pesagens** (hoje "Perda do processo")
   - Renomear para "Pesagens do processo".
   - Linha 1: `Peso conferido (peças)` — soma dos itens conferidos (catálogo).
   - Linha 2: `Peso após corte (cerâmica extraída)` — valor registrado na etapa de Corte.
   - Linha 3: `Peso após trituração` — exibe "pendente" enquanto não registrado e o valor depois de salvo.
   - Remover: "Perda no corte", "Perda na trituração" e "Perda total".

2. **Peso do corte não aparecendo**
   - Na compra em teste (Boleto 4444) o peso de corte existe no banco (7 kg registrado em "Peças: Em Corte"), mas o card mostra só o peso conferido. A causa ainda não está confirmada; o primeiro passo da implementação é reproduzir o card e verificar o carregamento das evidências, corrigindo o que impedir a exibição.

## Detalhes técnicos

- `src/components/processes/PecasLossSummary.tsx`: remover cálculos e linhas de perda, manter as três linhas de peso (com estado "pendente"), ajustar título.
- Validar a leitura de `stage_evidence` (`weight_ceramica_extraida`) no card via preview antes de encerrar.
- Nenhuma mudança de banco, de PDF ou do checklist da etapa.
