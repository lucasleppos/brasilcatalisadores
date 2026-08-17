# Importação de arquivos com vários pedidos

Testei o PDF enviado (`Impressão_de_Pedidos_betim.pdf`): a leitura identifica corretamente os **2 pedidos** (15779 e 15778) — o próprio diálogo mostra o selo "1 de 2" na sua captura. O problema não é a leitura, é o fluxo: o diálogo só exibe **um pedido por vez** e só passa para o seguinte depois de criar a compra do atual. Com 10 pedidos no mesmo arquivo isso fica inviável e dá a impressão de que os outros foram perdidos.

## Como vai funcionar

Depois de ler o arquivo, o diálogo passa a mostrar **todos os pedidos do arquivo em uma lista**, cada um em um cartão recolhível:

```text
Arquivo lido: 2 pedidos · 2 un · 1,485 kg · R$ 668,82
Filial (aplicada a todos): [Minas Gerais v]

[x] Pedido 15779 · BRASIL FILIAL BETIM · 17/08/2026 · 1 un · 0,715 kg · R$ 298,44   [abrir]
[x] Pedido 15778 · BRASIL FILIAL BETIM · 17/08/2026 · 1 un · 0,770 kg · R$ 370,38   [abrir]

                          [Cancelar]  [Criar 2 compras]
```

- Cada cartão pode ser aberto para conferir/editar os itens exatamente como hoje (marcar/desmarcar item com motivo, ajustar qtd/peso/valor, adicionar peça extra do catálogo ou material a granel).
- Cartão fechado mostra o resumo do pedido e o aviso de divergência com o rodapé do PDF, quando houver.
- Checkbox no cartão permite **pular** um pedido sem criar compra para ele.
- A filial é escolhida uma vez e vale para todos, com opção de trocar em um pedido específico.
- Um único botão cria todas as compras em sequência, com barra de progresso ("3 de 10"). No fim, um resumo lista as compras criadas e, se algum pedido falhar, ele permanece na lista com a mensagem de erro para nova tentativa — as compras já criadas não são desfeitas.
- Pedidos repetidos: se o número do pedido já tiver sido importado antes, o cartão vem marcado como "já importado" e desmarcado por padrão, evitando compra duplicada.

## Detalhes técnicos

- `src/components/branches/ImportPedidoDialog.tsx`: trocar o estado `current` + `items` por um mapa `Record<pedidoIndex, ReviewItem[]>`, renderizar a lista com `Accordion`/`Collapsible` e extrair a tabela/cartões de itens de um pedido para um subcomponente reutilizado dentro de cada cartão. `handleConfirm` passa a iterar os pedidos selecionados, acumulando sucessos/erros.
- Detecção de duplicidade usando `source_pedido_number` das compras existentes (campo já gravado hoje em `createPurchase`).
- Nada muda em `src/lib/pedido-pdf-import.ts` — o parser já devolve o array com todos os pedidos.

## Verificação

Importar o arquivo de teste e confirmar: os 2 pedidos aparecem juntos, edição em cada um funciona, e o botão único cria 2 compras (0,715 kg / R$ 298,44 e 0,770 kg / R$ 370,38). Repetir a importação do mesmo arquivo e confirmar que ambos vêm marcados como já importados.
