# Precificação da compra 110926-24 apagada ao salvar a conferência

## O que aconteceu

Verifiquei a compra 110926-24 no banco:

- Os 112 registros de peças foram todos **recriados hoje às 12:15:51** (todos com a mesma data de criação).
- Nenhum deles tem valor unitário, origem de preço ou memória de cálculo gravada; o total da compra está em R$ 0,00.
- O demonstrativo gerado (versão 1) também está com valor total zero.

Causa: quando a janela **Conferência de Peças** é salva, ela apaga todas as peças da compra e insere tudo de novo. As peças voltam com identificadores novos e sem os valores da precificação. Ou seja, qualquer salvamento da conferência feito depois da precificação zera os preços, e o PDF sai com o valor antigo/zerado.

## Sobre recuperar o que foi preenchido

Os valores digitados não ficaram gravados em nenhum outro lugar (não há histórico de preços por item para esta compra). **Não é possível recuperá-los pelo sistema** — a precificação das 166 peças precisará ser preenchida novamente. Se você tiver a planilha ou o print da tela com os valores, consigo lançá-los de uma vez.

## Correção a implementar

1. **Conferência deixa de apagar e recriar as peças.** Passa a reconciliar por identificador: atualiza as linhas que já existem (peso, quantidade, Flex/Carbono, excluída), insere apenas as novas e remove só as que o operador retirou da tela. Assim valor unitário, origem do preço e memória de cálculo permanecem.
2. **Aviso quando a conferência mudar algo já precificado.** Se a compra já tem valores lançados e o operador alterou peças na conferência, mostrar confirmação avisando que essas peças perderão o preço.
3. **Recalcular o total da compra** ao final do salvamento da conferência, para o card e o PDF nunca ficarem com total defasado.
4. **Registrar histórico da precificação por item** (valor unitário anterior e novo, autor, data), para que um caso assim seja recuperável no futuro.

## Detalhes técnicos

- `src/components/processes/SacolaConferenciaPanel.tsx` → `persistPieces()`: hoje faz `delete` por `purchase_id`/`item_type` e `insert` em lote. Trocar pelo padrão já usado em `updatePurchase` (reconciliação por `id`), preservando `total_value`, `pricing_source`, `calc_input`, `calc_result`.
- Após persistir, chamar recálculo do total (`batchUpdateItemPricing(purchase.id, [])` já soma os itens e grava `total_brl`).
- Nova tabela `purchase_item_price_history` (purchase_id, purchase_item_id, old_unit_value, new_unit_value, quantity, source, changed_by, created_at) com RLS: autenticados leem e inserem; sem update/delete. Gravação em `PiecePricingPanel.handleSave`.
- Verificar o mesmo comportamento no fluxo cerâmico (`CeramicoConferenciaPanel` já reconcilia por id — apenas confirmar).
