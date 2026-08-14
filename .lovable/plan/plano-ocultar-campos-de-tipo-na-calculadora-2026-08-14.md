# Plano: Ocultar campos de tipo na calculadora

## Objetivo
Ocultar os campos **Tipo de Entrada** e **Tipo de Material** da seção "Entrada de Dados" da página `/calculadora`, mantendo os valores padrão (`grupo` e `comum`) para não quebrar o cálculo nem a criação de compras.

## Alterações
1. Em `src/pages/CalculatorPage.tsx`:
   - Ocultar o bloco `<Select>` de **Tipo de Entrada** (linhas ~226-237).
   - Ocultar o bloco `<Select>` de **Tipo de Material** (linhas ~255-266).
   - Manter os estados `entryType` e `materialType` com seus valores iniciais (`grupo`, `comum`) para preservar a lógica de cálculo e envio de compras.

## Validação
- Verificar visualmente que os selects não aparecem mais na calculadora.
- Confirmar que o cálculo continua funcionando e que o envio para compras mantém o tipo `ceramico`/`grupo`.
