# Ajuste no Cabeçalho da Etiqueta Térmica

## Objetivo
Corrigir o cabeçalho da etiqueta 100×50 mm para que o código do lote apareça completo, sem truncamento.

## Alterações

### 1. Remover a palavra "LOTE" do cabeçalho
- Arquivo: `src/components/processes/CeramicoLabelPrint.tsx`
- Substituir o texto `LOTE: {l.code}` por apenas `{l.code}`.

### 2. Otimizar o layout para evitar truncamento
- Revisar a largura da coluna de informações (`grid-template-columns`) e o tamanho da fonte do cabeçalho.
- Ajustar o `font-size` da classe `.lote` e o espaçamento para garantir que o código completo (ex.: `LOT-260716-03-01`) caiba na largura disponível ao lado do QR Code.
- Considerar reduzir ligeiramente a fonte ou aumentar o `min-width` da coluna de texto, conforme necessário.

### 3. Validar visualmente
- Verificar no preview/impressão se o código do lote é exibido por completo.

## Arquivos afetados
| Arquivo | Ação |
|---|---|
| `src/components/processes/CeramicoLabelPrint.tsx` | Remover "LOTE:", ajustar CSS do cabeçalho |

## Não inclui
- Nenhuma mudança na geração do código do lote (`src/lib/labels.ts`).
- Nenhuma mudança nos dados exibidos (comprador, fornecedor, grupo, pesos, QR Code).
- Nenhuma mudança em outros fluxos ou etapas.