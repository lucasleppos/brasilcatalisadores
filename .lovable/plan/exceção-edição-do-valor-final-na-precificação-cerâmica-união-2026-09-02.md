# Exceção: edição do valor final na precificação cerâmica (UNIÃO)

Somente para o fornecedor **UNIAO COMERCIO E RECICLAGEM DE SUCATAS LTDA** (id `8a533d5a-...`), a tela "Ver Precificação dos Lotes" (fluxo cerâmico) permitirá editar manualmente o valor final de cada lote. Para todos os outros fornecedores nada muda.

## O que muda para o usuário

- Ao abrir a precificação cerâmica de uma compra desse fornecedor, cada lote continua mostrando o cálculo automático (Pt/Pd/Rh, deduções, margem), mas o campo "Valor calculado" passa a ser um campo editável em reais, já preenchido com o valor calculado.
- O total do rodapé e o total da compra passam a refletir o valor editado.
- Quando o valor for alterado, aparece um selo "Valor manual" no lote e um botão para voltar ao valor calculado.
- "Recalcular" continua funcionando e sobrescreve o valor manual pelo calculado.
- Lotes do grupo Diesel seguem com a escolha entre R$ 35,00 e R$ 40,00 por kg como hoje.

## Detalhes técnicos

- `src/components/processes/CeramicoPricingPanel.tsx`:
  - Constante com o id do fornecedor autorizado; flag `canEditFinal = purchase.supplierId === UNIAO_SUPPLIER_ID` (comparação por id, com fallback por nome normalizado caso o id mude).
  - Novo estado por lote (`manualValue: string | null`) usando `type="text"` + `inputMode="decimal"` e `parseNum` (padrão brasileiro, vírgula decimal), conforme convenção do projeto.
  - `totalValue` do lote passa a ser o valor manual quando presente; `allCalculated` aceita lote com valor manual > 0.
  - Ao salvar, `pricing_source` grava `"manual"` para lotes editados (mantendo `calc_input`/`calc_result` do cálculo original para rastreabilidade) e `total_brl` da compra usa o total exibido.
  - Sem alterações no motor de cálculo, no demonstrativo/PDF (que já leem `total_value`), em permissões ou no banco.

## Verificação

- Typecheck.
- Abrir a precificação de uma compra cerâmica da UNIÃO: editar valor, conferir total e persistência; abrir a de outro fornecedor e confirmar que o campo continua somente leitura.
