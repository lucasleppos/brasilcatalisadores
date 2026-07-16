# Ajustar terminologia da conferência de cerâmico para Peso Bruto

## Contexto
A etiqueta térmica já foi alterada para exibir **"Peso Bruto"** (tara não é informada nesta etapa). Agora é preciso alinhar os textos da tela de conferência para a mesma terminologia.

## Modificações

### 1. Textos da interface de conferência (`CeramicoConferenciaPanel.tsx`)
- **Campo de entrada**: "Peso Líquido (kg)" → **"Peso Bruto (kg)"**
- **Lista de lotes**: "Peso Líq.:" → **"Peso Bruto:"**
- **Resumo**: "Total Líquido Conferido:" → **"Total Bruto Conferido:"**
- **Mensagem de validação**: "Informe o peso líquido" → **"Informe o peso bruto"**

### 2. Alinhamento semântico do estado interno
- Renomear `weightNet` → `weightGross` no tipo `CeramicoLote`
- Renomear `weightNetStr` → `weightGrossStr` no estado
- Atualizar todas as referências internas (`totalNet` → `totalGross`, etc.) para refletir que o valor capturado é bruto nesta etapa
- O cálculo do saldo continua: `Peso Bruto Recebido - Σ Pesos Brutos dos Grupos`

### 3. Persistência
- O campo continua sendo salvo em `purchase_items.weight` (o banco não possui coluna `weight_gross`, e o conceito de bruto/líquido é da etapa de negócio)
- `weight_loss` permanece `0` conforme já implementado

### 4. Verificação
- Executar `tsgo` para garantir que a renomeação não quebrou tipos
- Gerar prévia visual da etiqueta atualizada (já com "Peso Bruto") e, se possível, capturar screenshot do painel de conferência para validar os novos textos

## Arquivos
- `src/components/processes/CeramicoConferenciaPanel.tsx`
- `src/components/processes/CeramicoLabelPrint.tsx` (revisão, sem alteração de texto)