

# Plano: Controle manual de etapa para Super Admin

## Problema
Se uma etapa for pulada por engano, não há como corrigir manualmente. O super_admin precisa de uma forma de mover a compra para qualquer status do fluxo.

## Solução

Adicionar um botão "Alterar Etapa" visível apenas para `super_admin` no card de cada compra no ProcessBoard. Ao clicar, abre um Dialog com um Select contendo todos os status possíveis do fluxo daquela compra (`getFlowStatuses(materialFlow)`), permitindo escolher o destino. Ao confirmar, atualiza o `status` e adiciona entrada no `status_history` com nota "Movido manualmente pelo admin".

## Implementação

### Arquivo: `src/components/processes/StageActionCard.tsx`

1. Importar `useAuth` e `getFlowStatuses` 
2. Adicionar estado `adminMoveOpen` e `adminTargetStatus`
3. Renderizar botão "Alterar Etapa" (ícone de setas) quando `role === "super_admin"`, ao lado dos botões existentes
4. Dialog com:
   - Select com todos os status do fluxo da compra
   - Campo de observação (opcional)
   - Botão "Confirmar Movimentação"
5. Ao confirmar: `supabase.from("purchases").update({ status, status_history })` e chamar `onCompleted()`

### Considerações
- Para compras em fase paralela (`Cerâmico: Aprovado`), também permitir alterar `fin_status` e `op_status` individualmente
- O select mostrará status lineares + status de sub-fluxos paralelos quando aplicável
- Registrar no `status_history` quem fez a alteração manual

