# Processos: visão em lista (padrão do celular no computador)

## Objetivo
Ter uma segunda forma de ver o módulo Processos: a mesma lista enxuta que já existe no celular, agora também no computador. Clicando em um item, abre um card lateral com todos os detalhes e as ações da etapa. Os cards atuais continuam disponíveis.

## Como funciona
- No topo, ao lado dos filtros, um seletor com duas opções: **Cards** e **Lista**. A escolha fica lembrada para o próximo acesso.
- As abas de etapa (Conferência, Moagem, Laboratório, Demonstrativo, Aprovação, Corte) e todos os filtros continuam iguais e valem para as duas visões.
- Na Lista, cada OP ocupa uma linha só, o que permite ver muita coisa em aberto de uma vez.

## A linha da lista (igual ao celular)
```text
[SA]  MURIELE GUIMARAES CALCA                                        8d  >
      020926-05 · Sacola · Betim · MARCOS ROBERTO TEIXEIRA
      103 pç · 11,175 kg · Sem boleto  ⚠
```
- Selo redondo à esquerda com o tipo (PC = Peças, SA = Sacola, CE = Cerâmico), nas mesmas cores de hoje.
- Nome do fornecedor em destaque; abaixo, OP, tipo, filial e comprador.
- Terceira linha com quantidade/peso e o Boleto Syge; sem boleto aparece em vermelho com o aviso.
- À direita, o tempo na etapa; linhas paradas há mais tempo (acima de 7 dias) ficam destacadas para facilitar a cobrança.
- No computador a lista aproveita a largura: aparece em uma ou duas colunas de linhas, conforme o espaço.

## Card de detalhes
Clicar na linha abre, pelo lado direito, um painel com exatamente o conteúdo do card de hoje: dados da compra, valor, alertas, impressão de etiqueta e os botões da etapa. Permissões e modo somente leitura continuam valendo. Ao concluir uma ação, o painel fecha e a lista se atualiza.

## No celular
Permanece como está hoje (já é essa lista), apenas ganhando a filial e o comprador na mesma linha de informações, para ficar idêntico ao computador.

## Fora do escopo
Nenhuma mudança em etapas, cálculos, permissões ou dados — apenas uma nova forma de visualizar.

## Detalhes técnicos
- `ProcessBoard.tsx`: novo estado `viewMode: "cards" | "list"` persistido em `localStorage`; dentro de cada `TabsContent`, renderiza o grid de `StageActionCard` atual ou o novo `ProcessListView`.
- Novo `src/components/processes/ProcessListView.tsx`: reutiliza `MobileListRow`/`MobileListDivider` alimentados pelo mesmo `tasksByGroup` (sem novo carregamento nem filtros próprios); grid `md:grid-cols-2` para aproveitar telas largas.
- Detalhe: `Sheet` (lado direito) com `StageActionCard` (`readOnly={!canAdvance}`, `onCompleted={() => { close(); reload(); }}`).
- Filial: extrair a busca de `suppliers.branch` já feita em `MobileProcessBoard.tsx` para um hook compartilhado usado nas duas telas.
- Subtítulo/detalhe das linhas: helpers `flowBadge`, `purchaseWeight`, `timeSince` movidos de `MobileProcessBoard.tsx` para um módulo compartilhado.
