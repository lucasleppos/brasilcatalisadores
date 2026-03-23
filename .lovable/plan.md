

# Quantidade total de peças no card + Múltiplas fotos na Conferência

## Problema 1: "1 itens" no card
O card exibe `purchase.items.length` (número de linhas/itens), mas o usuário quer ver a **quantidade total de peças** (soma dos campos `quantity` de cada item). Ex: 1 item com quantity=50 deve mostrar "50 peças".

### Alteração em `StageActionCard.tsx`
- Linha 172: calcular `totalQty = purchase.items.reduce((sum, i) => sum + (i.quantity || 1), 0)`
- Exibir `{totalQty} peças` em vez de `{purchase.items.length} itens`

---

## Problema 2: Apenas 1 foto na Conferência
Atualmente a task `photo_recebimento` aceita apenas 1 evidência. Uma vez feito upload, marca como concluído e não permite mais fotos.

### Alteração em `StageChecklist.tsx`
- Para tasks do tipo `photo`: permitir múltiplas evidências (não marcar como "concluído" que esconde o botão de upload)
- Mudar `isCompleted` para considerar "pelo menos 1 foto" como suficiente para o checklist, mas continuar exibindo o botão de upload para adicionar mais
- Listar todas as fotos já enviadas (não apenas a primeira)
- `getEvidence` → `getEvidences` (retornar array filtrado por taskKey)

### Alteração em `src/lib/stage-tasks.ts`
- Na definição da task `photo_recebimento`, adicionar flag `multi: true` ao `TaskRequirement` interface
- Adicionar campo opcional `multi?: boolean` ao tipo `TaskRequirement`

### Lógica visual
- Task com `multi: true`: mostra lista de fotos já enviadas + botão para adicionar mais
- Task sem `multi`: comportamento atual (1 evidência, depois marca concluído)

---

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/stage-tasks.ts` | Adicionar `multi?: boolean` ao `TaskRequirement`; marcar `photo_recebimento` com `multi: true` |
| `src/components/processes/StageChecklist.tsx` | Suportar múltiplas evidências para tasks `multi`; listar todas as fotos; manter botão upload visível |
| `src/components/processes/StageActionCard.tsx` | Exibir soma de `quantity` em vez de `items.length` |

