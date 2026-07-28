## Objetivo

Deixar o Demonstrativo (visualização) e o PDF do fluxo de **Peças / Peça em Sacola** com o mesmo layout da tela de Precificação de Peças — porém **sem exibir PPM (Pt/Pd/Rh) e sem exibir margem**. O fluxo Cerâmico continua exatamente como está hoje.

## Prévia do novo bloco (fluxo Peças)

```text
PEÇA                                   QTD / PESO     VALOR UNIT. (R$)      SUBTOTAL
---------------------------------------------------------------------------------
Código: B39                                  3 un              R$ 903,78   R$ 2.711,34
Referência: SKDM5GR                     3,4800 kg
---------------------------------------------------------------------------------
Código: 52090492AB                           3 un            R$ 2.162,07   R$ 6.486,21
Referência: 810295                      3,8700 kg
---------------------------------------------------------------------------------
Total de peças: 6 un                                    Peso total: 7,3500 kg

                                                   VALOR TOTAL:  R$ 9.197,55
```

Sem a linha "Pt … · Pd … · Rh … ppm · margem …%" e sem a coluna "Calculado unit.".

## O que muda

**1. Visualização (`DemonstrativoViewDialog.tsx`)**
- Quando o fluxo NÃO for cerâmico, substituir a tabela genérica atual ("Tipo / Qtd-Peso / Valor Unit. / Valor Total") por uma tabela no formato da precificação:
  - Coluna **Peça**: duas linhas — `Código: <code>` e `Referência: <reference>` (vindo de `catalog_parts`).
  - Coluna **Qtd / Peso**: `<quantidade> un` e, abaixo, o peso total do item em kg (4 casas).
  - Coluna **Valor unit. (R$)** e **Subtotal**.
- Rodapé do bloco: `Total de peças: X un` e `Peso total: Y kg`, mantendo o `VALOR TOTAL` já existente.
- Não exibir Pt/Pd/Rh nem margem em nenhum ponto do fluxo de peças; o bloco "Análise Laboratorial" continua restrito ao cerâmico.
- Para peças, o resumo inferior passa a mostrar "Total de peças" e "Peso total" (sem bruto/líquido, que só faz sentido no cerâmico).

**2. PDF (`supabase/functions/generate-demonstrativo-pdf/index.ts`)**
- Espelhar o mesmo layout: no fluxo de peças, uma única tabela com colunas `#`, `Peça (Código / Referência)`, `Qtd / Peso`, `Valor unit.`, `Subtotal`.
- Remover, para peças, as colunas Pt/Pd/Rh do bloco "Preço Calculado" e qualquer menção a margem.
- Rodapé com `Total de peças`, `Peso total` e `VALOR TOTAL`, mantendo cabeçalho (Nº pedido, fornecedor, comprador, data, fluxo, Boleto Syge) e observações.
- Cerâmico permanece com bruto/tara/líquido e sem alterações.

## Detalhes técnicos

- Os itens usados são os de `category = "conferencia"` (mesma fonte da tela de precificação), com fallback para todos os itens não-placeholder.
- Código e referência vêm do mapa de `catalog_parts` já carregado nos dois lados; itens sem catálogo mostram "Manual" na linha de código.
- Valor unitário exibido = `total_value / quantity`; subtotal = `total_value`. Nenhum recálculo com PPM/margem é feito na exibição.
- Nenhuma mudança de banco de dados.
