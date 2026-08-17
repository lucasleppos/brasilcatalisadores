# Novo fluxo da Filial: da importação até o confronto na matriz

Hoje a importação do PDF já cria a compra com status "Aguardando Transferência" e ela aparece junto das demais no módulo Compras. A mudança concentra todo o ciclo inicial dentro do módulo Filiais e insere uma etapa de conferência feita pelo usuário da filial.

## Fluxo proposto

```text
Importar PDF  ->  Conferência da filial  ->  Estoque da filial      ->  Transferência  ->  Matriz
(gera compra     (peça a peça:              (aguardando transferência,   (lote: seleção     (relatório do lote,
 da filial)       apta / inapta)             lista somável)               e envio)           validação/confronto)
```

- A compra gerada pela importação nasce com o status **"Filial: Em Conferência"** e fica visível apenas no módulo Filiais.
- Ela só entra no módulo Compras / quadro de Processos quando a matriz marcar o lote como **Recebido** (comportamento atual mantido).

## Prévia das telas (módulo Filiais)

Abas: `Conferência` · `Estoque` · `Lotes` · `Confronto` · `Conta Corrente` · `Cadastro`

**1. Conferência (usuário da filial)**

```text
Compras importadas aguardando conferência (2)                [Importar pedido (PDF)]
-------------------------------------------------------------------------------
170826-03 · João da Silva · Filial Campinas · 24 un · 12,480 kg · R$ 18.759,38
   pedidos de origem: 4512, 4513                      [Conferir]  progresso 0/24
170826-04 · Maria Souza · Filial Bauru · 6 un · 3,100 kg · R$ 4.220,00   [Conferir]
```

Ao clicar em **Conferir** abre o painel item a item:

```text
Conferência · 170826-03 · João da Silva                    Marcadas 21 · Fora 3
-------------------------------------------------------------------------------
[v] # Pedido  Código      Referência        Un   Peso      Valor
[v] 1 4512    ABC-123     Ford Ka 1.0       2    1,840 kg  R$ 1.500,00
[ ] 2 4512    XYZ-990     Gol G5            1    0,920 kg  R$   780,00
[v] 3 4513    (granel)    Cerâmico solto    -    2,300 kg  R$ 1.900,00
-------------------------------------------------------------------------------
Marcadas (aptas): 21 un · 10,640 kg · R$ 16.120,00   [Marcar todas] [Limpar]
Não marcadas (inaptas/devolvidas): 3 un · 1,840 kg · R$ 2.639,38
                                    [+ Peça extra] [+ Granel]
                                    [Salvar parcial]  [Concluir conferência]
```

- Cada linha tem apenas uma caixa de marcação: marcada = apta, recebida e contabilizada; não marcada = inapta/devolvida. Sem motivo obrigatório e sem botão de recusa.
- Atalhos "Marcar todas" / "Limpar" para agilizar pedidos grandes.
- Itens não marcados não são apagados: ficam registrados na compra como separados do fluxo, para rastreabilidade e conferência da matriz.
- **Concluir conferência** recalcula peso e valor declarados somando apenas os itens marcados e move a compra para o estoque da filial.


**2. Estoque da filial (aguardando transferência)**

```text
Filial: [Campinas v]        Estoque: 5 compras · 42 un · 24,300 kg · R$ 38.400,00
-------------------------------------------------------------------------------
[x] 170826-03 · João da Silva   · 21 un · 10,640 kg · R$ 16.120,00 · conferida 17/08
[x] 170826-04 · Maria Souza     ·  6 un ·  3,100 kg · R$  4.220,00 · conferida 17/08
[ ] 160826-01 · Pedro Lima      · 15 un · 10,560 kg · R$ 18.060,00 · conferida 16/08
-------------------------------------------------------------------------------
Selecionados: 2 · 27 un · 13,740 kg · R$ 20.340,00
                         [Vincular a lote aberto v]  [+ Abrir novo lote e enviar]
```

**3. Lotes / envio** — mantém o formato atual (Aberto → Em Trânsito → Recebido → Conferido) com o código `FILIAL-DDMMYY-NN`, agora somando somente material aprovado na conferência.

**4. Matriz: relatório do lote recebido**

```text
Lote CAMP-170826-01 · Em Trânsito · 2 compras · 27 un · 13,740 kg · R$ 20.340,00
-------------------------------------------------------------------------------
Compra      Fornecedor     Un aptas  Un recusadas  Peso decl.  Valor decl.
170826-03   João da Silva  21        3             10,640 kg   R$ 16.120,00
170826-04   Maria Souza     6        0              3,100 kg   R$  4.220,00
                                        [Exportar relatório] [Confirmar recebimento]
```

Ao confirmar o recebimento, as compras entram no pipeline normal da matriz (Em Conferência) e a aba **Confronto** passa a comparar declarado (filial) x real (matriz), com o botão de lançamento na Conta Corrente já existente.

## Detalhes técnicos

- Novo status `Filial: Em Conferência` em `src/lib/purchases.ts` (pré-fluxo, fora das máquinas de estado), com filtro para excluir compras de filial em pré-transferência de `PurchasesPage`, `CompletedPage` e `ProcessBoard`.
- `ImportPedidoDialog` passa a criar a compra com esse status e a gravar cada item importado com `seq`, `pedido` de origem e situação pendente de conferência.
- Novo `src/components/branches/BranchConferenciaPanel.tsx` para a conferência item a item por marcação; itens não marcados usam a categoria de item já existente para material separado do fluxo (`conferencia_excluida`).
- Funções novas em `src/lib/branches.ts`: `loadBranchPurchasesByStage`, `saveBranchConferencia`, `finishBranchConferencia` (recalcula `weight_declared` / `declared_value_brl` e muda o status para "Aguardando Transferência").
- `BranchesPage` ganha as abas Conferência e Estoque; a aba Lotes recebe o relatório do lote e o botão de confirmação de recebimento.
- Sem novas tabelas e sem migration: aproveita `purchases`, `purchase_items`, `branch_transfers` e `stage_evidence`.
