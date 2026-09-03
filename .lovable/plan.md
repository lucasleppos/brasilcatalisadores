# Incluir coluna "Valor/kg" no demonstrativo de materiais cerâmicos

## Objetivo
No demonstrativo de valores, para compras do fluxo **Cerâmico**, apresentar o **valor por quilograma** de cada grupo/material logo antes da coluna "Valor" (ou "Valor Total"), calculado como:

```text
Valor/kg = valor total do grupo ÷ peso do grupo
```

## O que será alterado

### 1. Diálogo de prévia — `src/components/processes/DemonstrativoViewDialog.tsx`
Inserir coluna **"Valor/kg"** nas tabelas cerâmicas:
- **Material — Preço Fixo (Catálogo)**: colunas passam a ser `# | Material | Peso | Valor/kg | Valor`.
- **Material — Preço Calculado (PPM Lab)**: colunas passam a ser `# | Material | Peso | Pt | Pd | Rh | Valor/kg | Valor`.
- **Demais Itens** (quando houver): renomear coluna "Valor Unit." para **"Valor/kg"** para padronizar a nomenclatura no fluxo cerâmico.

O valor por kg deve ser calculado a partir do peso líquido do grupo (`weights(it).liquido`) e do valor total efetivo (`total_value` ou `calc_result.finalValueBrl`). Quando o peso ou o valor for zero, exibir `"—"`.

### 2. PDF do demonstrativo — `supabase/functions/generate-demonstrativo-pdf/index.ts`
Replicar a mesma coluna **"Valor/kg"** no PDF gerado, nas mesmas tabelas e com o mesmo cálculo, garantindo que o documento exportado fique idêntico à prévia visual.

### 3. Formatação
Usar `fmtBrl` para o valor por kg, com duas casas decimais, seguindo o padrão brasileiro já utilizado no app.

## Fora de escopo
- Não alterar o cálculo do valor total do grupo.
- Não incluir a coluna no fluxo de Peças/Peça em Sacola (mantém "Valor unit.").
- Não alterar a estrutura do demonstrativo além das colunas indicadas.

## Validação
- TypeScript sem erros (`bunx tsgo --noEmit`).
- Visualização do demonstrativo e PDF gerado exibem a nova coluna com os valores corretos para compras cerâmicas.
