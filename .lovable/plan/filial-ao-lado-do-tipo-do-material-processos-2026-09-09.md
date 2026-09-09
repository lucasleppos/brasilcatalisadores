# Filial ao lado do tipo do material (Processos)

## O que muda

Na lista de tarefas do módulo Processos no celular, a linha do pedido passa a mostrar a filial do fornecedor logo depois do tipo do material:

```text
020926-20 · Peças · Barcos
021926-21 · Peças · TV
020926-25 · Peças · Matriz
```

- A filial vem do cadastro do fornecedor (campo Filial), igual ao que já é usado em Concluídos.
- Se o fornecedor não tiver filial preenchida, nada é adicionado — a linha fica como está hoje.
- Nenhuma mudança de status, cálculo ou etapa.

## Detalhes técnicos

- `src/components/processes/MobileProcessBoard.tsx`: após carregar as compras, buscar `suppliers (id, branch)` para os `supplierId` presentes e montar um mapa em estado; usar no `subtitle` do `MobileListRow`: `${p.purchaseNumber} · ${flow.name}${branch ? ` · ${branch}` : ""}`.
- Sem alterações de schema, RLS ou de precificação.
