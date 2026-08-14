# Detalhamento do Cálculo: mover para o final e restringir ao Super Admin

## O que muda na Calculadora

1. O card "Detalhamento do Cálculo" sai da coluna de resultados (direita) e passa para o final da página, depois da lista de cotações realizadas.
2. O detalhamento passa a ser recolhível: aparece apenas o título "Detalhamento do Cálculo" com um ícone de seta; ao clicar no nome, o conteúdo abre. Começa fechado.
3. O detalhamento só é renderizado para usuários com perfil **Super Admin**. Nenhum outro perfil (Admin, Comprador, Laboratório, Operacional, Visualizador) vê o título nem o conteúdo.
4. A coluna de resultados mantém o valor calculado, o preço tabelado e o botão "Adicionar à Lista" como estão hoje.

## Detalhes técnicos

- `src/pages/CalculatorPage.tsx`:
  - remover `<CalculationDetails result={result} />` de dentro do bloco de resultados;
  - inserir após `<QuoteList ... />`, condicionado a `result && role === "super_admin"` (usando `role` do `useAuth()`);
  - envolver em `Collapsible` (shadcn) com o `CollapsibleTrigger` no título, estado inicial fechado, e chevron rotativo.
- `src/components/calculator/CalculationDetails.tsx`: manter o conteúdo da tabela; o cabeçalho do card passa a ser o gatilho do collapsible (ou o collapsible envolve o card na página, mantendo o componente intacto).
- A checagem de visibilidade usa o `role` da sessão (vindo de `user_roles`), não `localStorage`. A flag `isAdmin` baseada em `localStorage` continua governando apenas as cotações customizadas, sem relação com o detalhamento.
- Nada de mudança em cálculo, banco de dados ou permissões do backend — o detalhamento é derivado de dados já disponíveis na tela.
