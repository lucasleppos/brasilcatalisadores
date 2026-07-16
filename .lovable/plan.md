## Ajustes finais no PDF do Demonstrativo

Apenas em `supabase/functions/generate-demonstrativo-pdf/index.ts`:

1. **Remover "Versão N" do cabeçalho** — apagar as linhas que imprimem `Versão ${demo.versao}` logo abaixo do título "DEMONSTRATIVO DE VALORES".

2. **Resumo (rodapé)** — substituir a linha única "Peso total: X kg" por duas informações:
   - `Peso bruto total: X kg` (soma de `grossWeight`/`weight` de `itemsForTotal`)
   - `Peso líquido total: Y kg` (soma de `grossWeight - tare` de `itemsForTotal`)
   
   Manter no fluxo Peças o comportamento equivalente (bruto = líquido quando não há tara, ou apenas mostrar "Peso total" simples). Para simplicidade, aplicar as duas linhas em ambos os fluxos usando os mesmos cálculos.

### Fora de escopo
- Sem mudanças no dialog de visualização, cálculos, ou demais seções.

### Arquivo alterado
- `supabase/functions/generate-demonstrativo-pdf/index.ts`
