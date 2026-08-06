# Etiquetas na Conferência de Peças e Peças em Sacola

Hoje só o fluxo de Cerâmico imprime etiquetas. Vamos disponibilizar a mesma etiqueta térmica (100 x 50 mm, com QR Code) na conferência de **Peças** e **Peças em Sacola**, que usam o mesmo card.

## Como vai funcionar

- Novo botão **"Imprimir Etiquetas"** no card de conferência, junto de "Salvar e Continuar" e "Encerrar".
- Antes de imprimir, os itens são salvos (para garantir o código da etiqueta).
- São geradas **3 cópias idênticas** da etiqueta, igual ao padrão do Cerâmico.
- Também fica disponível reimpressão a qualquer momento enquanto o card estiver aberto.

## Conteúdo da etiqueta

Mesmo layout do Cerâmico (código do lote em destaque + QR Code), com:

- Código do lote (padrão `LOT-AAMMDD-NN`)
- Comprador
- Fornecedor
- Tipo: "Peças" ou "Peças em Sacola"
- **Aprovadas: X un** — peças conferidas que seguem no fluxo
- **Reprovadas: Y un** — peças devolvidas na entrada (fluxo Peças) e/ou separadas do fluxo por peso fora da margem (fluxo Sacola)
- Peso bruto total conferido (kg)

## Detalhes técnicos

- `src/components/processes/CeramicoLabelPrint.tsx`: campos opcionais em `LabelData` (`qtyApproved`, `qtyRejected`, `typeLabel`) renderizados apenas quando presentes; o bloco "Grupo"/"Peso Bruto" continua igual para o Cerâmico. Sem mudança de dimensões nem de CSS de impressão.
- `src/components/processes/SacolaConferenciaPanel.tsx`: importar `CeramicoLabelPrint` + `buildLabelCodeDisplay`/`buildLabelUrl`, adicionar estado `printLabels`, portal de impressão (`createPortal` no `document.body`) e handler que faz `persistAll` → monta a etiqueta com os totais (`totalQty` aprovadas, `excludedQty + returnedQty` reprovadas, `totalWeight`) → `window.print()` com o mesmo atraso usado no painel de Cerâmico.
- Reaproveita `LABEL_COPIES_PER_GROUP` (3) de `src/lib/labels.ts` para as cópias.
