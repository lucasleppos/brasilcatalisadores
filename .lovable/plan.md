## Objetivo

No painel de Conferência dos fluxos **Peça** e **Peça em Sacola**, substituir o campo "Peso (kg)" por "Quantidade (un)" e exigir seleção do catálogo (sem código manual).

## Alterações (src/components/processes/SacolaConferenciaPanel.tsx)

1. **Formulário "Adicionar Peça"**
   - Remover o campo "Ou código manual (se não encontrar)" e o estado `manualCode`.
   - Substituir o input de peso por **Quantidade (un)** (inteiro, padrão 1).
   - Botão "Adicionar Peça" habilitado apenas com peça do catálogo selecionada e quantidade ≥ 1.
   - O peso continua vindo automaticamente do catálogo (`part.weight`), apenas não é mais editável na tela.

2. **Lista de peças conferidas**
   - Cada linha passa a mostrar: Código, Referência, **Qtd**, peso unitário e peso total (qtd × peso unitário).
   - Se a mesma peça do catálogo for adicionada novamente, somar na linha existente em vez de criar duplicata.
   - Botões para ajustar quantidade (+/−) e remover a linha.
   - Deixa de existir o estado "Não encontrada no catálogo" (todas as peças vêm do catálogo).

3. **Totais e progresso**
   - Contagem de peças passa a ser a **soma das quantidades** (não o número de linhas), comparada com o total declarado na criação da compra.
   - Peso total = soma de (qtd × peso unitário).

4. **Persistência**
   - Cada linha grava um registro em `purchase_items` com `quantity` = quantidade informada e `weight` = peso unitário × quantidade (mantendo a semântica de peso total do item usada nas etapas seguintes).
   - Ao recarregar, as linhas voltam agrupadas por peça do catálogo com sua quantidade.

## Observação

Peças fora do catálogo deixam de ser aceitas nesta etapa; se aparecer uma peça nova, ela precisa ser cadastrada antes no módulo de Catálogo.
