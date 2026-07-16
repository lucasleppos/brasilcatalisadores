# Visualização inline do demonstrativo na etapa de Aprovação

## Objetivo
Na etapa de Aprovação (Demonstrativo pendente), permitir que o operador **visualize os mesmos dados do PDF** dentro do app, sem precisar baixar o arquivo a cada atualização. Ocultar temporariamente o botão de WhatsApp.

## Escopo
- Apenas UI/frontend em `src/components/processes/StageActionCard.tsx`.
- Nenhuma alteração em backend, edge functions ou banco.
- Mantém os botões existentes: **PDF** (download), **Aprovar**, **Contestar**.
- O botão **WhatsApp** fica apenas oculto (código preservado, comentado) para reativação futura.

## Alterações

### 1. Novo botão "Visualizar" (com ícone Eye)
Posicionado antes do botão **PDF**, na mesma linha, com o mesmo estilo (outline/sm). Abre um `<Dialog>` grande (max-w-3xl, scroll interno) contendo todos os dados que hoje compõem o PDF:

- **Cabeçalho**: Nº Pedido, Fornecedor, Comprador, Data, Fluxo, Boleto Syge, Versão do demonstrativo.
- **Itens**: mesma tabela do PDF, respeitando os blocos existentes:
  - Peças — Preço Fixo (Catálogo)
  - Peças — Preço Calculado (PPM Lab) com colunas Pt/Pd/Rh
  - Demais Itens (com Tipo, Qtd/Peso, Valor Unit., Valor Total)
- **Análise Laboratorial** (cerâmico): Pt/Pd/Rh em ppm, versão, e cotações usadas (Pt/Pd/Rh USD + Câmbio) — quando `materialFlow === "ceramico"`.
- **Conferência de Peso**: declarado, real, diferença (perda/ganho) quando disponível.
- **Resumo**: total de peças e peso total.
- **VALOR TOTAL** em destaque (mesmo valor do PDF, incluindo o fallback para maior entre `valor_total` do demonstrativo e soma dos itens de conferência).
- Observações (`purchase.notes`) quando existirem.

Toda a informação já está disponível no cliente via `loadDemonstrativos`, `purchase.items`, `lab_results` (via `loadLabResultsForPurchase` ou similar) e `settings`. O componente carregará o necessário no `useEffect` do dialog (open) e mostrará skeleton enquanto carrega. Formatação usa os utilitários brasileiros já existentes (`fmtNum`/`parseNum`).

O botão aparece nos mesmos dois pontos onde hoje existem os botões PDF/WhatsApp (topo "Demonstrative: approve, contest, or generate PDF" e a duplicata em `canGeneratePdf`).

### 2. Ocultar botão WhatsApp
Nos dois blocos que renderizam `<MessageCircle .../>WhatsApp` (linhas ~410-425 e ~700-718), envolver com comentário `{/* WhatsApp temporariamente desativado */}` e não renderizar. Preservar o handler para reativação futura (ou comentar o JSX inteiro).

## Detalhes técnicos
- Criar um pequeno componente local `DemonstrativoViewDialog` no mesmo arquivo (ou em `src/components/processes/DemonstrativoViewDialog.tsx`) para manter `StageActionCard.tsx` legível.
- Reutilizar exatamente as mesmas regras de cálculo do edge function (`generate-demonstrativo-pdf/index.ts`) reescritas em TS no cliente: separação por `pricing_source` (catalogo/calculadora/regular), média de `lab_results` por `versao`, fallback `Math.max(calculatedTotal, valor_total)`.
- Sem chamadas à edge function — tudo lido direto do Supabase para evitar novo download.
- Dialog rola verticalmente e é responsivo (mobile: full width).

## Arquivos alterados
- `src/components/processes/StageActionCard.tsx` — adicionar botão Visualizar, ocultar WhatsApp.
- (opcional) `src/components/processes/DemonstrativoViewDialog.tsx` — novo componente com a view.

## Fora de escopo
- Mudanças no PDF em si.
- Remoção definitiva do WhatsApp (apenas ocultado).
- Ajustes em outras etapas.
