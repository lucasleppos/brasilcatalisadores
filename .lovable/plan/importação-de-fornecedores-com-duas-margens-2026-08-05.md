# Importação de fornecedores com duas margens

Hoje a importação por Excel só reconhece uma coluna de margem e copia o mesmo valor para Peças e Cerâmico. O cadastro manual já tem os dois campos separados, então a importação precisa ficar igual.

## O que muda

1. **Dois campos no mapeamento de colunas**
   - "Margem Peças (%)" e "Margem Cerâmico (%)" substituem o campo único "Margem (%)".
   - Reconhecimento automático das colunas por nomes como: `margem peças`, `margem pecas`, `margem peca`, `peças`, `pecas` e `margem cerâmico`, `margem ceramico`, `cerâmico`, `ceramico`.
   - Se a planilha tiver apenas uma coluna genérica de margem, ela é usada para as duas margens (compatibilidade com planilhas antigas).
   - Se nenhuma coluna for mapeada, o padrão continua 15%.

2. **Leitura dos valores no padrão brasileiro**
   - Aceita vírgula como decimal (ex.: `12,5` → 12,5) e ignora o símbolo `%`.

3. **Prévia da importação**
   - A tabela de prévia passa a mostrar duas colunas calculadas ("Margem Peças" e "Margem Cerâmico") ao lado das colunas do arquivo, para o operador confirmar antes de importar.

4. **Texto de ajuda**
   - A tela inicial passa a indicar as colunas esperadas: nome, CNPJ/CPF, e-mail, filial, comprador, margem peças, margem cerâmico.

## Detalhes técnicos

- `src/components/suppliers/SupplierImport.tsx`: campos `marginPecas` e `marginCeramico` na lista `FIELDS`, novos padrões de auto-mapeamento, fallback para coluna genérica de margem, parse com `parseNum` de `@/lib/utils`, e colunas extras na prévia.
- `margin` (legado) continua sendo gravado com o valor de Peças — já é o comportamento de `importSuppliers` em `src/lib/suppliers.ts`, portanto nenhuma mudança no banco ou nessa função.
