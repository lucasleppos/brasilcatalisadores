# Ajustes no demonstrativo de Peça em Sacola

## 1. Corrigir sobreposição de textos

No PDF, ao incluir as colunas Pt/Pd/Rh a coluna "Peça" ficou estreita e o Código/Referência invadiu a coluna "Qtd / Peso". Correção:

- Redistribuir as larguras das colunas para caber tudo em A4: "#" e "Qtd / Peso" mais estreitas, Pt/Pd/Rh compactas, "Valor unit." e "Subtotal" reduzidas, sobrando espaço maior para "Peça".
- Reduzir a fonte das linhas da tabela para 8 pt quando as colunas de análise estiverem presentes.
- Truncar Código e Referência ao limite da coluna, para nunca invadir a coluna seguinte.

A prévia em tela já se ajusta automaticamente; nenhuma mudança de layout necessária além de conferir alinhamento.

## 2. Peças segregadas no Resumo

No Resumo (prévia e PDF), abaixo de "Total de peças", incluir:

- **Peças segregadas do processo: N un** — soma das peças separadas na conferência (as que foram retiradas do fluxo).
- A linha só aparece quando houver pelo menos uma peça segregada.
- Essas peças continuam fora do peso total e do valor total.

## Detalhes técnicos

- `supabase/functions/generate-demonstrativo-pdf/index.ts`: ajustar `pCols`/`pHeaders` do bloco `!isCeramico` (larguras somando `contentWidth`), aplicar `doc.setFontSize(8)` nas linhas quando `showItemLab`, e usar `doc.splitTextToSize`/corte por largura no rótulo de código e referência. No Resumo, calcular `segregadas = items.filter(i => i.category === "conferencia_excluida").reduce((s,i)=>s+(Number(i.quantity)||1),0)` e imprimir a linha quando `> 0`. Redeploy da função.
- `src/components/processes/DemonstrativoViewDialog.tsx`: mesmo cálculo a partir de `itemsNoBonus` e nova linha no bloco de Resumo.
- Validação: `bunx tsgo --noEmit` e geração do PDF de uma compra de Peça em Sacola com peças segregadas.
