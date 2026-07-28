## Objetivo

Na conferência de Peça em Sacola, as peças que não passam na 1ª validação (peso abaixo da margem de 3%) deixam de seguir o fluxo de sacola. Elas saem do bloco principal, vão para um bloco separado no final da tela, e ficam registradas na compra (não são apagadas) para que o operador crie depois uma nova compra no fluxo cerâmico só com elas.

## Como fica na tela

1. Cada peça fora da margem continua marcada em vermelho e ganha o botão **"Separar do fluxo"**.
2. Ao separar, a peça desce para o bloco **"Peças fora da margem — não seguem o fluxo de sacola"**, em fundo âmbar, mostrando código, referência, peso pesado, peso de catálogo e Δ%.
3. Atalho **"Separar todas fora da margem"** no aviso já existente ("4 peça(s) fora da margem…"), para fazer em lote.
4. É possível **devolver ao fluxo** uma peça separada, caso tenha sido engano.
5. As peças separadas **saem das quantidades da compra**:
   - não contam no total de peças, nem no peso, nem no valor;
   - o total declarado é **reduzido**: separando 4 de 10, o contador passa a exibir **6/6 peças** e o encerramento é liberado com 6;
   - o cabeçalho passa a mostrar "10 declaradas · 4 separadas · 6 no fluxo";
   - exibem a etiqueta "Destino: nova compra — fluxo cerâmico".
6. Resumo do bloco separado: quantidade e peso total separados, para facilitar a criação da nova compra cerâmica.

## Efeito nas etapas seguintes

Trituração, Laboratório e Precificação de sacola passam a ignorar as peças separadas — não aparecem para pesagem, análise nem precificação, e não entram no demonstrativo/PDF. O registro fica preservado no banco e é exibido no detalhe da compra (e no módulo Concluído) como "peças transferidas para fluxo cerâmico".

## Detalhes técnicos

- Em `purchase_items`, as peças separadas passam a ter `category = "conferencia_excluida"` (mesma linha, só muda a categoria) — nada é perdido e não há mudança de schema.
- `src/components/processes/SacolaConferenciaPanel.tsx`: estado `excluded` por peça, carregamento das duas categorias em `loadExistingPieces`, gravação com a categoria correspondente em `persistPieces`, novo bloco de UI, e recálculo de `declaredQty` (= declarado − separadas) e dos totais.
- `src/components/processes/SacolaTrituracaoPanel.tsx`, `SacolaLabPanel.tsx`, `SacolaPricingPanel.tsx`: filtrar itens por `category = "conferencia"`.
- `src/components/processes/DemonstrativoViewDialog.tsx` e `supabase/functions/generate-demonstrativo-pdf/index.ts`: ignorar `conferencia_excluida`.
- `src/components/purchases/PurchaseDetail.tsx` e `src/components/purchases/CompletedDetailRow.tsx`: seção informativa com as peças separadas.
- A separação é sempre ação manual do operador, nunca automática.
