# Filial no card de Moagem — por que não aparece

## O que eu verifiquei

- A filial já está funcionando no app em desenvolvimento (pré-visualização). Testei a tela de Processos no celular e as linhas saem assim: `020926-05 · Sacola · MARCOS`, `040926-07 · Sacola · Matriz`.
- Os 438 fornecedores cadastrados têm filial preenchida, então não é falta de dado.

Conclusão: a alteração está pronta, mas a versão que você abre no celular ainda é a publicada anteriormente — ela só passa a mostrar a filial depois de publicar. Se o app foi adicionado à tela inicial (atalho), também é preciso recarregar para pegar a nova versão.

## O que fazer

1. Publicar o app.
2. No celular, fechar e abrir novamente o atalho (ou dar um recarregar na página) para a nova versão entrar.
3. Conferir a lista de Moagem: cada pedido deve aparecer como `número · tipo · filial`.

## Observação

Nenhuma mudança de código é necessária. Se após publicar e recarregar a filial ainda não aparecer no seu celular, eu investigo o cache do atalho na tela inicial.
