## Alinhar Dialog do Demonstrativo com o PDF

Ajustar `src/components/processes/DemonstrativoViewDialog.tsx` para exibir os mesmos totais de peso que o PDF já mostra.

### Mudança
No bloco "Resumo" (grid com Total de grupos/peças e Peso total), substituir a linha única `Peso total: X kg` por duas linhas:
- `Peso bruto total: X kg` — soma de `weights(i).bruto` de `itemsForTotal`
- `Peso líquido total: Y kg` — soma de `weights(i).liquido` de `itemsForTotal`

Reutilizar a função `weights()` já existente no componente (mesmo cálculo usado nas linhas por grupo, garantindo paridade com o PDF).

Ajustar o grid para acomodar as duas linhas (ex.: manter `grid-cols-2`, colocando as duas linhas de peso empilhadas na coluna direita).

### Fora de escopo
- PDF (já atualizado).
- Demais seções do dialog.

### Arquivo alterado
- `src/components/processes/DemonstrativoViewDialog.tsx`
