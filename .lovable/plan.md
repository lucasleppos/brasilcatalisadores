

# Reposicionar e garantir exibição da coluna "Boleto Syge"

## Problema
A coluna "Boleto Syge" existe no código mas está condicionada à permissão `hideErp`. O perfil de permissão do usuário provavelmente oculta esse campo. Além disso, a ordem atual é: Nº Pedido → Fornecedor → Comprador → Boleto Syge. O usuário quer: **Nº Pedido → Boleto Syge → Fornecedor → Comprador**.

## Alterações

### `src/pages/PurchasesPage.tsx`
1. **Reordenar colunas** no header e no body: mover "Boleto Syge" para logo após "Nº Pedido"
2. **Remover a condição `hideErp`** da coluna — ela passará a ser sempre visível (o destaque vermelho para campo vazio já está implementado)
3. Remover a variável `hideErp` e a referência a `isFieldHidden("compras", "erp_number")`

Ordem final das colunas:
```
Nº Pedido | Boleto Syge | Fornecedor | Comprador | Itens | Total | Status | Ações
```

**1 arquivo afetado**, ~6 linhas alteradas (reordenação + remoção do condicional).

