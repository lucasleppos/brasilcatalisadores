

# Fix: Demonstrativo PDF sem valor total + adicionar totais de peças/kg

## Problema
O demonstrativo e criado automaticamente ao avançar para "Aguardando Demonstrativo", mas nesse momento o `total_brl` da compra ainda e 0 porque a precificação das peças em sacola acontece *depois*. O PDF usa `demo.valor_total` que foi gravado como 0.

## Solução

### 1. PDF: calcular valor total a partir dos itens (edge function)
No `generate-demonstrativo-pdf/index.ts`, em vez de confiar apenas em `demo.valor_total`, calcular o total somando `total_value` de todos os `purchase_items` com `category = 'conferencia'`. Usar o maior entre o valor calculado e `demo.valor_total`.

### 2. PDF: adicionar resumo de quantidades
Antes da linha "VALOR TOTAL", adicionar uma seção de resumo com:
- **Total de peças**: contagem dos itens de conferencia
- **Peso total**: soma dos pesos dos itens

### 3. Atualizar `valor_total` do demonstrativo ao gerar PDF
Quando o PDF e gerado e o `demo.valor_total` e 0 mas os itens ja tem valores, atualizar o registro do demonstrativo com o valor correto.

### 4. Corrigir criação do demonstrativo no StageActionCard
Nos pontos onde `createDemonstrativo` e chamado manualmente (botão de gerar demonstrativo), recalcular o total a partir dos itens antes de criar.

## Arquivo alterado
- `supabase/functions/generate-demonstrativo-pdf/index.ts` — calcular total dos itens, adicionar resumo de peças/kg, atualizar demo se necessario

## Detalhe tecnico
O PDF ja tem acesso a todos os `items` da compra. Basta somar `total_value` dos itens com `category = 'conferencia'` e usar esse valor. A seção de resumo sera inserida logo antes do "VALOR TOTAL".

