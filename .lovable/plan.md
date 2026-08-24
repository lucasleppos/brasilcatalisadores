# Voltar o projeto ao estado de antes de hoje

Tudo o que foi feito hoje (24/08) será descartado. Isso não deve ser feito com código novo — reescrever manualmente cada arquivo para "desfazer" quase sempre deixa restos e inconsistências. O caminho correto é restaurar uma versão anterior pelo próprio histórico do projeto.

## Como fazer (você executa, em 1 minuto)

1. Abra a aba **Histórico**, no topo do chat.
2. Escolha a última versão de **antes de 24/08** (a última do dia anterior).
3. Confirme a restauração.

Alternativa equivalente: no chat, clique no botão de **reverter** abaixo da minha última resposta do dia anterior.

As mensagens e edições posteriores ao ponto de revert ficam arquivadas mas continuam visíveis no chat, e podem ser reaplicadas depois clicando no botão de reverter delas — nada é perdido de forma definitiva.

## O que será desfeito

Todo o trabalho de hoje na impressão de etiquetas: suporte a impressora Bluetooth/TSPL, o card "Impressora de etiquetas" em Configurações, a renderização em imagem (raster) e os ajustes de gap/offset e trabalho único de impressão. A impressão de etiquetas volta ao comportamento anterior (via navegador).

Nada de banco de dados foi alterado hoje, então não há migração a reverter — o revert de código é suficiente.

## Depois do revert

Se quiser retomar a impressora Bluetooth mais tarde, podemos reconstruir do zero com um escopo menor, partindo já do layout que funcionou.
