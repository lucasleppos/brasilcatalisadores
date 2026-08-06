# Etiquetas de Peças e Peças em Sacola sem Peso Bruto

Ajustar o layout da etiqueta térmica para os fluxos de **Peças** e **Peças em Sacola**, removendo a linha de "Peso Bruto" e mantendo apenas as quantidades aprovadas e reprovadas.

## O que será alterado

1. **Tornar o peso opcional no componente de etiqueta**
   - Em `src/components/processes/CeramicoLabelPrint.tsx`, alterar `weightGross` de campo obrigatório para opcional (`weightGross?: number`).
   - Renderizar a linha "Peso Bruto" somente quando `weightGross` estiver definido.
   - Garantir que o layout continue equilibrado quando essa linha estiver ausente.

2. **Não enviar peso bruto nas etiquetas de Peças/Sacola**
   - Em `src/components/processes/SacolaConferenciaPanel.tsx`, remover a propriedade `weightGross` do objeto `LabelData` criado para impressão nos fluxos de peças.
   - Manter `qtyApproved` e `qtyRejected` como hoje.

3. **Manter comportamento do Cerâmico inalterado**
   - O fluxo de Cerâmico continua enviando `weightGross`, portanto a linha de peso continuará aparecendo normalmente.

## Critérios de aceitação

- Etiquetas de Peças e Peças em Sacola exibem: lote, comprador, fornecedor, tipo, aprovadas e reprovadas.
- Etiquetas de Cerâmico continuam exibindo o peso bruto.
- Impressão gera 3 cópias idênticas, conforme já implementado.
