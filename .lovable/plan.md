# Renomear e reordenar grupos da barra de processos

## Objetivo
Ajustar os rótulos e a ordem dos grupos exibidos na barra de processos (desktop e mobile), conforme a sequência solicitada pelo usuário.

## Sequência solicitada
- Inclusão → ocultar
- Conferência → manter
- Trit. / Homog. / Amostr. → renomear para **Moagem**
- Prep. Amostra / Análise → renomear para **Laboratorio**
- Precif. / Demonstrativo → renomear para **Demonstrativo**
- Aprovação → manter
- Corte → manter

## Mudanças técnicas
1. **`src/components/processes/ProcessBoard.tsx`**
   - Reordenar o array `PROCESS_GROUPS`, deixando `Inclusão` fora da lista visível.
   - Aplicar os novos rótulos nos grupos:
     - "Trit. / Homog. / Amostr." → "Moagem"
     - "Prep. Amostra / Análise" → "Laboratorio"
     - "Precif. / Demonstrativo" → "Demonstrativo"
   - Manter os mesmos `statuses` internos em cada grupo, já que os nomes de status internos não precisam mudar.

2. **`src/lib/process-group-ui.ts`**
   - Atualizar o mapa `PROCESS_GROUP_UI` para refletir os novos rótulos e a nova ordem.
   - Remover a entrada de "Inclusão".
   - Ajustar o `short` de cada grupo para caber na barra inferior mobile.

3. **Verificação de impacto**
   - Revisar `MobileProcessBoard.tsx` para garantir que a nova ordem seja respeitada (ele consome `PROCESS_GROUPS` e `groupUI`).
   - Confirmar que os status internos em `src/lib/purchases.ts` não serão alterados, preservando o fluxo de negócio.
   - Rodar typecheck e verificar o preview desktop/mobile.
