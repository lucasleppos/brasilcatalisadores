## Objetivo

Na etapa **Peças: Trituração e Amostragem**, trocar o checklist "Confirmar trituração e amostragem concluídas" por um campo obrigatório de **Peso após trituração (kg)**, e usar esse peso para mostrar a perda total do processo antes da alocação no bag.

## O que muda

1. **Campo da etapa**
   - Remove a tarefa de confirmação por observação.
   - Adiciona: `Peso após trituração (kg)` — obrigatório, tipo peso (mesmo componente já usado no Corte, com teclado decimal e formato brasileiro).
   - Opcional: `Foto do material triturado (opcional)` — não bloqueia o avanço. (Confirme se quer isso; posso deixar de fora.)
   - O botão "Concluir Peças: Trituração e Amostragem" só libera após o peso ser registrado.

2. **Resumo de perda do processo** (novo bloco no card desta etapa)
   - Peso conferido (peças conferidas na Conferência)
   - Peso da cerâmica extraída (registrado no Corte)
   - Peso após trituração (novo campo)
   - Perda de corte = conferido − extraída; Perda de trituração = extraída − pós-trituração; **Perda total** em kg e %.
   - Só exibe as linhas cujos pesos existem; valores em 4 casas decimais, padrão brasileiro.

3. **Persistência**
   - O peso é gravado em `stage_evidence` (`task_key: weight_pos_trituracao`, tipo peso), sem migração de banco.
   - Registros antigos que já usaram `weight_pos_trituracao` no fluxo legado continuam válidos.

## Detalhes técnicos

- `src/lib/stage-tasks.ts`: substituir a entrada de `"Peças: Trituração e Amostragem"` pelo requisito de peso (e foto opcional).
- `src/components/processes/StageActionCard.tsx`: renderizar o bloco de resumo de perda acima do `StageChecklist` quando o status for `Peças: Trituração e Amostragem`, lendo as evidências já carregadas (`weight_ceramica_extraida`) e os itens conferidos.
- Nenhuma alteração no PDF/demonstrativo nem no fluxo de cerâmico.
