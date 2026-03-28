

# Fix: Scroll na lista de peças do SacolaPricingPanel

## Problema
O `ScrollArea` dentro do `DialogContent` não está rolando porque o layout flex não está propagando a restrição de altura corretamente para o viewport interno do Radix ScrollArea. Com 5 peças, a 5a fica cortada e inacessível.

## Solução
Envolver o `ScrollArea` em uma `div` com `overflow-hidden` e `flex-1 min-h-0`, e garantir que o ScrollArea tenha `h-full`. Isso força o container flex a calcular a altura disponível e o ScrollArea a respeitar esse limite.

## Arquivo alterado
`src/components/processes/SacolaPricingPanel.tsx` — ajustar o wrapper do ScrollArea:
- Adicionar uma div wrapper com `className="flex-1 min-h-0 overflow-hidden"` em volta do `ScrollArea`
- O `ScrollArea` recebe `className="h-full"` em vez de `flex-1 min-h-0`

Correção simples de CSS/layout, sem mudança de lógica.

