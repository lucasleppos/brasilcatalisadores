
# Fase 4 — Precificação Inteligente Peça em Sacola ✅ IMPLEMENTADO

## O que foi feito

1. **Migração SQL**: Coluna `pricing_source text` adicionada à tabela `purchase_items`
2. **`SacolaPricingPanel.tsx`**: Dialog fullscreen com comparação catálogo vs lab, inputs manuais de valor, radio buttons, filtros/busca, scroll para 100+ peças
3. **`StageActionCard.tsx`**: Condicional para exibir "Comparar e Precificar" para pedidos com `peca_sacola` na etapa "Aguardando Demonstrativo"
4. **`purchases.ts`**: Helper `batchUpdateItemPricing()` para atualizar valores e `pricing_source` em lote
5. **Edge function PDF**: Separação em dois blocos (Preço Fixo sem PPMs + Preço Calculado com PPMs Lab)
