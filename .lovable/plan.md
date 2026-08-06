# Encerrar e Etiqueta (Conferência de Cerâmico)

Hoje o operador precisa clicar em "Imprimir Etiquetas" e depois em "Encerrar Conferência". A ideia é unificar: um único botão que encerra a etapa e dispara a impressão automaticamente.

## O que muda

- O botão principal passa a ser **"Encerrar e Etiqueta"** (mantém a contagem de grupos).
- Ao clicar:
  1. valida como hoje (grupo, peso bruto, foto, tolerância de saldo);
  2. salva os grupos e gera/garante os códigos de etiqueta;
  3. abre a impressão automática das etiquetas — 3 cópias por grupo, como já é hoje;
  4. avança a compra para a etapa seguinte e fecha o card.
- O botão separado "Imprimir Etiquetas" continua disponível para reimpressão antes de encerrar, e o ícone de impressora por grupo também permanece.

## Detalhes técnicos

- `src/components/processes/CeramicoConferenciaPanel.tsx`: em `handleFinish`, após `persistAll()` usar os lotes retornados para montar os `LabelData` (mesma lógica de `handlePrintAll`, com `expandCopies`), chamar `openPrint`, aguardar o disparo do `window.print()` e só então executar `advanceStage`, `onOpenChange(false)` e `onCompleted()`.
- A impressão usa o portal `CeramicoLabelPrint` renderizado por este componente; por isso o fechamento do diálogo/refresh acontece depois do print, com o mesmo atraso já usado em `openPrint`, evitando desmontar o conteúdo antes da janela de impressão.

Se o "processo de transferência" que você mencionou for outra etapa (e não a Conferência de Cerâmico), me avise que eu aplico o mesmo botão lá.
