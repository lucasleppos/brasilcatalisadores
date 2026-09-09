# Observação na etapa de Aprovação

Adicionar um campo "Obs." dentro do card de cada pedido na etapa de Aprovação, no módulo Processos.

## Como vai funcionar

- Uma linha de texto no card, logo abaixo das informações do pedido, com o rótulo "Obs.".
- O operador digita ou apaga livremente. O que ele escrever é guardado automaticamente pouco depois de parar de digitar — não existe botão de salvar.
- Se apagar tudo, fica vazio (também guardado automaticamente).
- A observação é visível para todos os usuários que abrirem o mesmo pedido na etapa de Aprovação.
- É apenas de acompanhamento: não entra no demonstrativo, no PDF, nem em nenhuma outra etapa, e não bloqueia nem influencia o avanço do processo.
- Também aparece no card em modo somente leitura (por exemplo para o comprador), sem permitir edição.
- Funciona igual no computador e no celular.

## Detalhes técnicos

- Sem mudança de banco: a observação é gravada na tabela existente `stage_evidence` com `stage = purchase.status`, `task_key = 'aprovacao_obs'`, `data_type = 'text'` e o conteúdo em `value_text`.
- Novo helper em `src/lib/stage-photos.ts` (ou pequeno módulo `src/lib/stage-notes.ts`): `loadStageNote(purchaseId)` e `saveStageNote(purchaseId, stage, text)` — leitura do registro mais recente e upsert manual (update se existir, insert caso contrário).
- Novo componente `src/components/processes/StageNoteField.tsx`: `Textarea` compacto, estado local, `useEffect` com debounce de ~600 ms para gravar, indicador discreto de "salvo".
- `StageActionCard.tsx`: renderizar `StageNoteField` quando `isDemonstrative` (etapas "Peças/Cerâmico: Gerar Boleto de Aprovação") for verdadeiro, tanto no card normal quanto no bloco `readOnly` (com `disabled`).
- Nenhuma alteração em permissões, avanço de etapa, demonstrativos ou PDFs.
