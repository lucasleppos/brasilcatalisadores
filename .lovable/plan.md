## Diagnóstico (verificado no banco)

Na compra `27/07/2026 - 01` as análises existem (Pt 200 / Pd 1160 / Rh 180, Pt 222 / Pd 1111 / Rh 199, Pt 222 / Pd 3333 / Rh 222, Pt 333 / Pd 2222 / Rh 333) mas estão vinculadas a IDs de itens antigos (`d1258972…`, `d9ba9809…`, `6ada9a96…`) que não existem mais — os itens atuais são `5d59601e` (13 kg), `e4dce3af` (5 kg) e `3a033bd3` (7 kg). Por isso o painel de Laboratório abre com todos os campos vazios, exatamente o mesmo tipo de órfão já resolvido para a TARA.

## 1. Carregar os PPMs anteriores na reanálise

Em `CeramicoLabPanel`:

- Continuar lendo por `purchase_item_id`, que funciona nos processos novos.
- Fallback de resgate: quando nenhum lote atual encontra análise por ID e existem análises órfãs, associá-las aos lotes atuais por ordem de criação (mesma regra usada na TARA), preservando as versões 1/2/3 de cada lote.
- Ao resgatar, re-apontar os registros para o `purchase_item_id` atual, eliminando o órfão de vez.
- Os valores ficam totalmente editáveis; grupos não reanalisados simplesmente permanecem como estão.
- Marcação discreta no lote resgatado: "análise carregada do registro anterior — confirme ou altere".

## 2. Histórico de alterações da análise

- Nova tabela `lab_result_history` no banco: compra, item, versão, Pt/Pd/Rh anteriores, quem alterou e quando (com regras de acesso iguais às demais tabelas do processo).
- Sempre que uma linha de análise já salva for alterada (ou apagada) com valores diferentes, o sistema grava automaticamente os valores anteriores no histórico antes de sobrescrever.
- No card de cada grupo, quando houver histórico, aparece um bloco recolhível "Histórico de análises" listando em ordem cronológica: data/hora, autor, valores anteriores → valores novos, e a média resultante de cada momento.
- O histórico aparece **somente** dentro do painel de Análise/Reanálise. Nada muda em `DemonstrativoViewDialog` nem na função de PDF.

## Detalhes técnicos

- Migração: criar `public.lab_result_history` com GRANTs, RLS e políticas alinhadas a `lab_results`.
- `src/components/processes/CeramicoLabPanel.tsx`: fallback posicional de resgate no `loadLotes`, re-vinculação de `purchase_item_id`, gravação de snapshot no `persistRow` antes de update/delete, e novo bloco de histórico por lote (colapsável).
