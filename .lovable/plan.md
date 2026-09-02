# Peças da conferência desapareceram (020926-17)

## O que os registros mostram

Consultei a compra `020926-17` (JULIO SERGIO GONCALVES DOS SANTOS, fluxo peças):

- Só existe **1 item**, o marcador criado na inclusão às 14:07 (11 un, sem código, sem categoria).
- **Nenhum item de conferência foi gravado.** As 11 peças por código nunca chegaram ao banco.
- O registro de devolução da conferência **foi** gravado às 14:55:08 (motivo "Quebrada"), e a compra avançou às 14:55:09 para "Peças: Aguardando Demonstrativo".

Ou seja: no clique em salvar a conferência, a gravação das peças falhou, mas o restante do fluxo seguiu como se tivesse dado certo (mensagem "Conferência salva" e avanço de etapa). Por isso a precificação abre com "Item 1 · 11 un · 0,0000 kg".

## Causa confirmada

A gravação da conferência apaga os itens antigos e insere as peças conferidas. As regras de acesso da tabela de itens exigem permissão de **criar** e **excluir** no módulo Compras — e apenas Admin e Super Admin têm essas ações. Perfis Operacional e Laboratório (que fazem a conferência e têm permissão de avançar etapa) têm criar/excluir em **false**, então o apagar e o inserir são recusados silenciosamente. O código não verifica o retorno de erro dessas operações, então mostra sucesso e avança a etapa mesmo sem ter salvo nada.

## Correção

1. **Permitir a conferência para quem opera as etapas**: ajustar as regras de acesso dos itens de compra para aceitar inserção e exclusão também de quem tem permissão de avançar etapa nos processos (mesma regra já usada na edição), mantendo bloqueado para Comprador/Visualizador.
2. **Nunca mais falhar em silêncio**: passar a verificar o erro de cada operação de gravação da conferência (apagar, inserir, devoluções) e, em caso de falha, mostrar mensagem clara, manter o diálogo aberto e **não** permitir o avanço da etapa.
3. **Validar antes de avançar**: ao concluir a conferência, confirmar que a quantidade de itens gravados no banco corresponde à conferida; se não corresponder, bloquear o avanço com aviso.
4. **Recuperar esta compra**: retornar `020926-17` para "Em Conferência" para que as 11 peças sejam relançadas por código (o dado original não existe no banco, não há como restaurar automaticamente). Depois disso a precificação mostrará quantidade e peso corretos.

## Detalhes técnicos

- Migração nas políticas de `public.purchase_items`: INSERT/DELETE passam a aceitar `user_can_do(auth.uid(),'compras','create'/'delete')` **ou** `user_can_do(auth.uid(),'processos','advance_stage')`.
- `src/components/processes/SacolaConferenciaPanel.tsx`: `persistPieces`/`persistReturns` retornam erro; `handleSave` lança em erro, exibe toast com a mensagem e não fecha o diálogo; recontagem de itens gravados após o insert.
- Verificar o mesmo padrão de erro ignorado nos painéis irmãos (`CeramicoConferenciaPanel`, `SacolaTrituracaoPanel`) e aplicar a mesma checagem.
- Operação de dados: voltar `020926-17` para status "Em Conferência" com registro no histórico.
