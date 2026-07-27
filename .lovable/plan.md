## Diagnóstico (verificado no banco)

Na compra `27/07/2026 - 01` existem taras gravadas (0,133 / 0,222 / 0,333 kg) em `stage_evidence`, porém vinculadas a IDs de itens antigos (`d1258972…`, `d9ba9809…`, `6ada9a96…`) que não existem mais. Os itens atuais (13 / 5 / 7 kg) têm `weight_loss = 0`. Ou seja: a tara não sumiu por erro de leitura — ela ficou órfã porque, na volta por contestação, os itens de conferência foram recriados com novos IDs (comportamento da versão anterior do painel, já corrigido para preservar IDs).

## 1. Carregar a TARA já registrada

No painel de Trituração/Homogeneização (`CeramicoTrituracaoPanel`):

- Manter a leitura por ID (`tare_<itemId>` e `photo_embalagem_<itemId>`), que já funciona para os processos novos.
- Adicionar um resgate para evidências órfãs: quando nenhum lote atual encontra tara por ID e existem registros de tara antigos em quantidade igual à de lotes atuais, associá-los por ordem de criação, pré-preenchendo o campo TARA e a foto da embalagem.
- Os valores resgatados entram como sugestão editável (o operador confirma ou altera) e são re-gravados com o ID atual ao salvar, eliminando o órfão de vez.
- Exibir uma marcação discreta "tara carregada do registro anterior — confirme" no lote resgatado.
- Também usar `purchase_items.weight_loss` como fonte quando maior que zero (já previsto no código atual).

## 2. Esconder "Dados já registrados" no card

No `ReanalysisBanner`, remover a tabela de resumo (Grupo / Bruto / Tara / Líquido / Pt / Pd / Rh) do card. Ficam apenas o selo "EM REAMOSTRAGEM E REANÁLISE", o motivo da contestação e a frase de orientação sobre poder alterar pesos, grupos, fotos e análises.

## Detalhes técnicos

- `src/components/processes/CeramicoTrituracaoPanel.tsx`: buscar todas as evidências de tara/foto do estágio, separar as com ID válido das órfãs, e aplicar o mapeamento posicional apenas como fallback; marcar o lote como "pendente de confirmação" no estado local.
- `src/components/processes/ReanalysisBanner.tsx`: remover o bloco da tabela e as consultas que só existiam para alimentá-la.
