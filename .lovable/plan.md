## Problema

Hoje o painel "Precificação de Peças" abre com todos os valores em R$ 0,00: ele só exibe `total_value` dos itens da conferência, que nunca foi calculado. A conferência grava apenas `catalog_part_id`, quantidade e peso — os PPMs do catálogo existem (`catalog_parts.pt_ppm/pd_ppm/rh_ppm`), mas não são usados. Além disso, `suppliers` tem uma única coluna `margin`, usada como desconto do cliente tanto no cerâmico quanto (implicitamente) nas peças.

## O que será feito

### 1. Duas margens por fornecedor
- Migração: adicionar `margin_pecas` e `margin_ceramico` em `suppliers` (numeric, default 15) e copiar o valor atual de `margin` para as duas (conforme escolhido). A coluna `margin` fica como legado.
- `src/lib/suppliers.ts`, `SupplierForm.tsx`, `SupplierImport.tsx` e `SuppliersPage.tsx`: dois campos "Margem Peças (%)" e "Margem Cerâmico (%)".
- `CeramicoPricingPanel.tsx` passa a ler `margin_ceramico`.

### 2. Cálculo automático na precificação de peças
Em `PiecePricingPanel.tsx`, ao abrir:
- Busca `catalog_parts` (peso, Pt/Pd/Rh ppm) dos itens conferidos e as cotações de `settings`.
- Para cada linha, roda `calculate()` de `src/lib/calculator.ts` com peso bruto = peso unitário × quantidade, tara 0, PPMs do catálogo e `clientDiscount = margin_pecas` do fornecedor.
- Preenche **Valor unit. (R$)** = valor final BRL ÷ quantidade, com subtotal e total do pedido em tempo real.
- Linha mostra os PPMs usados e a margem aplicada, para conferência.
- "Salvar precificação" grava `total_value` + `calc_input`/`calc_result` por item (via `batchUpdateItemPricing`), alimentando demonstrativo e PDF.

### 3. Alteração manual com justificativa e aprovação
- Valor unitário continua editável, mas ao divergir do calculado o sistema exige **justificativa** (mín. 10 caracteres) antes de salvar.
- Nova tabela `price_override_log` (purchase_id, purchase_item_id, valor calculado, valor informado, justificativa, autor, data, status pendente/aprovado/rejeitado) com RLS + GRANTs.
- O item ajustado ganha badge "Valor ajustado — aguardando aprovação"; a compra não avança de Precif./Demonstrativo enquanto houver override pendente.
- Aprovação/rejeição feita por quem tem a ação `aprovar_preco` no módulo `compras` (Super Admin já incluso), em um bloco dentro do próprio painel, com histórico visível de todas as alterações do pedido.

## Detalhes técnicos
- Sem alteração no fluxo de etapas; só leitura/gravação de valores.
- Formato brasileiro mantido (vírgula decimal, `type="text"` + `inputMode="decimal"`, pesos com 4 casas).
- Recalcular disponível por botão, para o caso de cotações atualizadas.
