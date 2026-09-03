# Bônus no Demonstrativo (fluxo Peças)

## O que será feito

No painel **Precificação de Peças**, no final da listagem, entra uma linha fixa chamada **Bônus**:

- Preço fixo de **R$ 50,00** por unidade (não editável).
- Um campo digitável para a **quantidade** (padrão vazio / 0).
- Subtotal calculado automaticamente: quantidade × R$ 50,00.
- O subtotal do Bônus soma ao **Valor total** do painel e, portanto, ao valor do Boleto/demonstrativo.

O Bônus só existe se preenchido:

- Quantidade vazia ou 0 → nada é gravado e nada aparece no demonstrativo nem no PDF.
- Quantidade > 0 → aparece como última linha do demonstrativo (visualização e PDF), com Qtd, Valor unit. R$ 50,00 e Subtotal, e entra no VALOR TOTAL.

Editar depois: alterar a quantidade atualiza o valor; zerar remove o Bônus.

## Detalhes técnicos

- Persistência: item em `purchase_items` com `category = "bonus"`, `item_type = "peca"`, `quantity` = qtd digitada, `total_value` = qtd × 50, `pricing_source = "bonus"`, sem `weight` e sem vínculo de catálogo. Criado/atualizado/removido no `handleSave` de `src/components/processes/PiecePricingPanel.tsx`.
- `PiecePricingPanel.tsx`: novo estado `bonusQty`, carregado do item `bonus` existente; linha fixa após o `items.map` (versões mobile e desktop); `computedTotal` passa a incluir o bônus; o bônus é excluído da lista `items` de peças (para não aparecer como peça a precificar) e dos contadores de Qtd/Peso total.
- `src/components/processes/DemonstrativoViewDialog.tsx`: excluir o item de bônus dos blocos de peças/grupos e das somas de peso/quantidade; renderizar linha "Bônus" ao final da tabela de Peças quando existir; incluir seu valor no total calculado.
- `supabase/functions/generate-demonstrativo-pdf/index.ts`: mesmo tratamento (linha Bônus ao final e soma no total), com redeploy da função.
- Fluxo cerâmico permanece inalterado.
