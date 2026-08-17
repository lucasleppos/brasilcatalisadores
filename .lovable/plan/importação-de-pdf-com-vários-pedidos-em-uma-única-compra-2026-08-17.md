# Importação de PDF com vários pedidos em uma única compra

Testei o PDF enviado (`Impressão_de_Pedidos_betim.pdf`): a leitura já identifica os **2 pedidos** (15779 e 15778) — o selo "1 de 2" da sua captura confirma. O problema é o fluxo: hoje o diálogo mostra um pedido por vez e cria **uma compra por pedido**. O certo é o contrário: o arquivo inteiro vira **uma única compra**, com todas as peças de todos os pedidos juntas.

## Como vai funcionar

Ao ler o arquivo, o diálogo mostra uma única conferência consolidada:

```text
Arquivo lido: 2 pedidos (15779, 15778) · BRASIL FILIAL BETIM · 17/08/2026
Filial: [Minas Gerais v]
Total do arquivo: 2 un · 1,485 kg · R$ 668,82

Pedido   Código        Referência   Modelo             Qtd   Peso un.  Valor un.
15779    030131703M    030178FA     VOLKSWAGEN - VW     1    0,715     298,44
15778    H55197724     21H6PFQ735   FIAT - FIAT         1    0,770     370,38

                                  [Cancelar]  [Confirmar e criar 1 compra]
```

- Todas as peças de todos os pedidos aparecem numa lista só, com uma coluna **Pedido** para rastrear a origem de cada peça.
- A conferência continua igual: marcar/desmarcar peça com motivo, ajustar qtd/peso/valor, adicionar peça extra do catálogo ou material a granel.
- Os totais do rodapé (un, peso, valor) somam o arquivo inteiro, e o aviso de divergência compara com a soma dos totais impressos de todos os pedidos.
- Uma filial única para o arquivo. O fornecedor é o do arquivo (o mesmo em todos os pedidos).
- Se o arquivo tiver pedidos de fornecedores diferentes (CPF/CNPJ distintos), o diálogo avisa e agrupa por fornecedor, criando uma compra por fornecedor — não é possível juntar fornecedores diferentes na mesma compra.
- Nas observações da compra ficam registrados os números de pedido de origem ("Importado dos pedidos 15779, 15778") e as peças removidas com o motivo.

## Detalhes técnicos

- `src/components/branches/ImportPedidoDialog.tsx`: substituir o estado `current`/`pedidos[current]` por uma lista única de `ReviewItem` achatada, cada item carregando `pedidoNumber`. `handleConfirm` cria uma compra só, com `weightDeclared`/`declaredValueBrl` somando todas as peças confirmadas. Agrupamento por CPF/CNPJ quando houver mais de um fornecedor no arquivo.
- Rastreabilidade: `purchases.source_pedido_number` recebe a lista de números separados por vírgula (campo texto, já existente).
- `src/lib/pedido-pdf-import.ts` não muda — o parser já devolve todos os pedidos.

## Verificação

Importar o arquivo de teste e confirmar: as 2 peças aparecem juntas com a coluna Pedido preenchida, o total mostra 2 un / 1,485 kg / R$ 668,82, e o botão cria **uma** compra com esses valores e observação citando os pedidos 15779 e 15778.
