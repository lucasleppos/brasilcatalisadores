

# Plano: Avançar automaticamente após precificação cerâmica

## Problema
Após confirmar a precificação dos lotes cerâmicos no `CeramicoPricingPanel`, o status permanece em "Cerâmico: Em Precificação". O painel salva os valores mas **não avança o status** para "Cerâmico: Gerar Boleto de Aprovação", onde ficam os botões de PDF e WhatsApp.

## Causa raiz
No `handleConfirm` do `CeramicoPricingPanel` (linha 219), após salvar os dados, ele chama `onCompleted()` que apenas recarrega os dados — mas não chama `advanceStage()` para mover para a próxima etapa.

## Solução
Adicionar a chamada `advanceStage(purchase.id, purchase.status)` no `handleConfirm` do `CeramicoPricingPanel`, logo após salvar os valores e antes de fechar o dialog. Isso fará o status avançar automaticamente para "Cerâmico: Gerar Boleto de Aprovação", onde o operador terá acesso aos botões de gerar PDF e enviar via WhatsApp.

## Arquivo editado
- `src/components/processes/CeramicoPricingPanel.tsx` — importar `advanceStage` de `@/lib/purchases` e chamá-lo após salvar a precificação

