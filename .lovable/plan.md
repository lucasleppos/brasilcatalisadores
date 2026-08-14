# Importar pedido em PDF na inclusão de compra

Sim, é possível. Testei o arquivo enviado (`Pedido_de_catalisador_14-08.pdf`) e o conteúdo é texto real (não imagem escaneada), com tabela bem estruturada. Consegui extrair todas as 19 linhas com Código, Referência, Modelo, Qtd., Valor unitário e Peso unitário, além do resumo (24 peças, 34,940 kg, R$ 18.759,38).

## O que será construído

Botão **"Importar pedido (PDF)"** no diálogo de Nova Compra (fluxo Peça/Sacola):

1. Operador seleciona o PDF do outro sistema.
2. O app lê o PDF no próprio navegador e extrai as linhas da tabela de itens.
3. Abre uma tela de revisão com a lista extraída:
   - Código, Referência, Modelo/Veículo, Quantidade, Peso unitário, Valor unitário.
   - Cada linha é cruzada com o catálogo por Código e, se não achar, por Referência.
   - Status por linha: **Encontrada no catálogo** (vincula automaticamente) ou **Não encontrada** (permite buscar manualmente no catálogo ou marcar para cadastro posterior).
   - Linhas podem ser editadas ou desmarcadas antes de importar.
4. Ao confirmar, os itens entram na compra respeitando a quantidade de cada linha (uma peça com Qtd. 3 gera 3 unidades, seguindo a regra atual de numeração `seq`).
5. Resumo de validação: total de peças e peso extraídos do PDF x total efetivamente importado, com alerta se divergir.

## Pontos a confirmar

- No arquivo, o peso unitário aparece como "0,920g" mas o total do pedido é "34,940 kg". Vou tratar os valores como **kg** (coerente com o total e com o app), ignorando o sufixo "g" do PDF.
- O valor unitário do PDF será importado como **referência informativa** (preço do fornecedor/outro sistema), sem sobrescrever a precificação do app — a etapa de Precificação continua mandando.

## Detalhes técnicos

- Parsing no cliente com `pdfjs-dist` (extração de texto por posição, agrupando por linha), sem depender de OCR ou backend. Se o PDF vier escaneado (sem camada de texto), o app avisa que o arquivo não pode ser lido.
- Parser isolado em `src/lib/pdf-order-import.ts`, com regras de reconhecimento de cabeçalho (`Código | Referência | Modelo | Qtd. | Valor | Peso`) e normalização numérica brasileira via `parseNum`.
- Novo componente `src/components/purchases/PdfOrderImportDialog.tsx` (upload + revisão + match no catálogo, reutilizando `PartSearch`).
- Integração em `src/components/purchases/NewPurchaseDialog.tsx`: os itens revisados alimentam a lista de itens existente, mantendo a trava anti-duplicação atual.
- Nenhuma mudança de schema: usa `catalog_parts` (code/reference/weight) e `purchase_items.catalog_part_id`.

## Fora do escopo (nesta etapa)

- Cadastro automático de peças novas no catálogo (fica como ação manual no diálogo de revisão).
- Leitura de PDFs escaneados via OCR.
- Importação de múltiplos pedidos no mesmo arquivo.
