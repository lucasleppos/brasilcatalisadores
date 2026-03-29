

# Encurtar processo de Pagamento — Confirmação direta para Bag

## O que muda
Após a aprovação do demonstrativo no fluxo de Peças, em vez de passar por **duas etapas** ("Aprovado - Aguardando Pagamento" → "Pagamento Realizado"), o sistema exibirá uma **tela de confirmação simples** perguntando se o material deve ser enviado para pagamento, e então avançará direto para "Alocado ao Bag".

## Modelo da tela de confirmação

```text
┌──────────────────────────────────────────┐
│  ✅ Demonstrativo Aprovado               │
│                                          │
│  Fornecedor: [nome]                      │
│  Pedido: [número]                        │
│  Valor Total: R$ X.XXX,XX               │
│                                          │
│  ⚠ Ao confirmar, este material será      │
│  registrado para pagamento e enviado     │
│  diretamente para alocação ao Bag.       │
│                                          │
│  ┌────────────┐  ┌───────────────────┐   │
│  │  Cancelar  │  │ Confirmar e Alocar│   │
│  └────────────┘  └───────────────────┘   │
└──────────────────────────────────────────┘
```

## Alterações técnicas

### 1. `src/lib/purchases.ts` — Pular etapas de pagamento
- Na função `getNextStatus`, quando o status atual for `"Peças: Gerar Boleto de Aprovação"`, retornar diretamente `"Peças: Alocado ao Bag"` em vez de `"Peças: Aprovado - Aguardando Pagamento"`.
- Manter os status no array `PECAS_FLOW` para compatibilidade com compras antigas.

### 2. `src/components/processes/StageActionCard.tsx` — Tela de confirmação
- No bloco `isDemonstrative` (aprovação), alterar o dialog de "Aprovar" para incluir a mensagem de confirmação de envio para pagamento + alocação ao bag (apenas para fluxo de peças).
- O dialog mostrará: resumo da compra, valor total, e o aviso de que o material será registrado para pagamento e seguirá direto para o bag.

### 3. `src/components/processes/ProcessBoard.tsx` — Ajustar agrupamento
- Remover ou ajustar o grupo "Pagamento" no board para não exibir coluna vazia (manter para compras legadas que ainda estejam nesses status).

## Resultado
Fluxo atual: Aprovação → Aguardando Pagamento → Pagamento Realizado → Alocado ao Bag (3 cliques)
Fluxo novo: Aprovação → Confirmação única → Alocado ao Bag (1 clique)

