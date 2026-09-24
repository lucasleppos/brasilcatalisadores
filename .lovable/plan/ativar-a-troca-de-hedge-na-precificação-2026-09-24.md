# Ativar a troca de hedge na precificação

## Situação atual (verificado)

- O botão **"Trocar hedge"** já existe nos três painéis de precificação (Cerâmico, Peças e Peça em Sacola), ao lado da linha "Hedge: ..." do cabeçalho.
- Ele só aparece para quem tem a permissão **Processos → "Trocar hedge da compra"** — e hoje **nenhum perfil tem essa permissão ligada**, nem o Super Admin. Por isso o botão não aparece na sua tela.
- O fluxo de troca já está pronto e não precisa de aprovação de outra pessoa: escolher o hedge na lista (não digita cotação livre), justificativa obrigatória, e tudo fica gravado no histórico (quem, quando, de qual para qual, motivo), visível no detalhe da compra.
- A compra 220926-14 foi criada antes do controle de hedge existir, por isso mostra "Cotação anterior ao controle de hedge" e continua usando as cotações atuais. Nada será alterado nela automaticamente.

## O que fazer

1. **Ligar a permissão só para o Super Admin** — atualizar o perfil de permissões `super_admin` no banco, marcando a ação "Trocar hedge da compra" como permitida no módulo Processos. Os demais perfis (admin, operacional, comprador, laboratório, visualizador) continuam sem o botão.
2. **Nenhuma mudança de código é necessária** — o botão, o diálogo com justificativa e o histórico já estão implementados e passam a aparecer assim que a permissão estiver ativa.
3. **Conferir a tela de Permissões** — o interruptor "Trocar hedge da compra" já deve estar visível no módulo Processos para o Super Admin poder ligar/desligar no futuro.

## Como usar (fluxo final)

1. Na precificação (Cerâmico, Peças ou Peça em Sacola), o cabeçalho mostra o hedge da compra.
2. O Super Admin clica em **"Trocar hedge"**, escolhe o hedge correto da lista e escreve a justificativa.
3. Ao confirmar, a compra passa a usar as cotações daquele hedge e a troca fica registrada no histórico — sem etapa de aprovação extra.
4. Compras antigas sem hedge (ex.: 220926-14) continuam com as cotações atuais até alguém, se necessário, vinculá-las a um hedge pelo mesmo botão.

## Verificação

- Confirmar no banco que só o perfil `super_admin` ficou com a ação ligada.
- Abrir uma precificação no preview e conferir que o botão "Trocar hedge" aparece e o diálogo salva com justificativa.