

# Melhorias no Módulo de Processos

## Contexto

Duas solicitações:
1. **Tabs fixas na ordem do fluxograma** — Hoje as tabs são geradas dinamicamente só com etapas que têm compras ativas, mudando de posição e desaparecendo a cada avanço. O usuário quer todas as etapas sempre visíveis, na ordem do fluxograma, com contagem (inclusive zero).
2. **Diálogo de confirmação mais completo** — O AlertDialog atual mostra apenas fornecedor e status. Deve mostrar dados completos do processo (número do pedido, valor, itens, fluxo, comprador, peso, tempo na etapa) e, na etapa "Gerar Boleto de Aprovação", incluir o botão de PDF.

---

## Alterações

### 1. Tabs fixas na ordem do fluxograma — `ProcessBoard.tsx`

**Problema atual:** `activeStages` filtra apenas etapas com `count > 0`, então tabs desaparecem.

**Solução:**
- Em vez de usar `activeStages` (dinâmico), montar a lista de tabs a partir da ordem definida em `PECAS_FLOW`, `CERAMICO_FLOW` e `LEGACY_FLOW` (já exportados via `getFlowStatuses`).
- Para admin/super_admin: mostrar TODAS as etapas dos dois fluxos (Comum + Peças + Cerâmico), sempre na mesma ordem, com badge de contagem (0 quando vazio).
- Para outros perfis: mostrar apenas as etapas do seu perfil (via `STAGE_ROLES`), mas mantê-las fixas mesmo com count=0.
- A tab ativa padrão continua sendo a primeira com itens, mas todas ficam visíveis e clicáveis.
- Referência visual: similar à imagem enviada pelo usuário — tabs como "Aguardando Inclusão 1", "Enviado ao Bag 3", etc., todas sempre visíveis.

Criar uma constante `ORDERED_DISPLAY_STAGES` que mescla os fluxos na ordem correta do fluxograma para exibição.

### 2. Diálogo de confirmação enriquecido — `StageActionCard.tsx`

**Problema atual:** O `AlertDialogContent` mostra apenas: "A compra de {fornecedor} avançará de {status} para a próxima etapa."

**Solução:** Substituir o conteúdo do AlertDialog por um resumo completo:

```
┌─────────────────────────────────────┐
│ Confirmar avanço de etapa           │
│                                     │
│ Pedido:      #PED-2024-001          │
│ Fornecedor:  Fornecedor ABC         │
│ Comprador:   João Silva             │
│ Fluxo:       Cerâmico               │
│ Valor:       R$ 15.000,00           │
│ Itens:       3 itens                │
│ Tempo:       2d nesta etapa         │
│ Peso decl.:  120,5 kg (se houver)   │
│                                     │
│ Etapa atual → Próxima etapa         │
│ "Em Separação" → "Em Trituração"    │
│                                     │
│ [📄 Gerar PDF]  (só no Boleto)      │
│                                     │
│         [Cancelar]  [Confirmar]     │
└─────────────────────────────────────┘
```

- Mostrar: `purchaseNumber`, `supplierName`, `buyer`, `materialFlow`, `totalBrl`, `items.length`, tempo na etapa, pesos (se preenchidos).
- Mostrar a transição: status atual → próximo status (usando `getNextStatus`).
- Na etapa "Gerar Boleto de Aprovação": incluir botão de PDF dentro do diálogo.
- Aplicar essa melhoria a TODOS os AlertDialogs do componente (avanço padrão, aprovação, contestação).

---

## Arquivos afetados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/processes/ProcessBoard.tsx` | Tabs fixas ordenadas pelo fluxograma, sempre visíveis |
| `src/components/processes/StageActionCard.tsx` | AlertDialog enriquecido com dados completos + PDF no Boleto |
| `src/lib/purchases.ts` | Exportar `PECAS_FLOW`, `CERAMICO_FLOW`, `COMMON_STATUSES` para uso no ProcessBoard |

