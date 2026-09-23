# Grupo cerâmico ao lado do número da compra

## Alteração

Na tela **Bag > Alocar Material**, mostrar o grupo ao lado do número da compra somente nas linhas de material Cerâmico.

Exemplo:

```text
030926-28    Gr. 01
030926-28    Gr. 02
```

- Cada lote exibirá seu próprio grupo, conforme definido na Conferência.
- Peças e Peça em Sacola continuam mostrando apenas o número da compra.
- A informação aparecerá nos cartões do celular e na coluna **OP** da tabela no computador.
- A busca por número da compra continuará funcionando normalmente.

## Detalhes técnicos

- Carregar, junto aos materiais disponíveis, a identificação de grupo registrada para cada item cerâmico em `stage_evidence` (`lote_cat_<id do item>`).
- Adicionar o grupo ao modelo visual do material disponível.
- Converter os rótulos `Grupo 01`, `Grupo 02` etc. para a forma compacta `Gr. 01`, `Gr. 02` ao exibir.
- Para categorias cerâmicas especiais, preservar um rótulo compacto reconhecível, sem inventar numeração.
- Não alterar dados, pesos, valores nem regras de alocação.

## Validação

- Confirmar que a compra 030926-28 aparece em duas linhas, respectivamente como `030926-28 Gr. 01` e `030926-28 Gr. 02`.
- Conferir celular e computador e validar que compras não cerâmicas permanecem inalteradas.
