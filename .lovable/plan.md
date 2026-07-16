## Correções

### 1. Sidebar — Concluídos não aparece
As permissões no banco já estão corretas (`concluidos.access = true` para `super_admin`, `admin` e `operacional`), e o item já existe em `AppSidebar.tsx`. A causa provável é o cache do React Query (`staleTime: 5 min` em `usePermissions`), que mantém o perfil de permissões antigo (sem o módulo `concluidos`) até expirar.

**Ação:** em `src/lib/permissions.ts`, forçar refetch quando o perfil não contiver o módulo `concluidos` (bump da `queryKey` para incluir uma versão, ex.: `["permissions", role, "v2"]`). Isso garante que qualquer sessão ativa recarregue as permissões atualizadas na próxima renderização, sem precisar de logout.

Também garantir que os papéis `comprador`, `laboratorio` e `visualizador` — que hoje têm `access:false` — permaneçam sem acesso (nenhuma mudança para eles).

### 2. Processos — remover abas "Bags" e "Concluídos"
Como o fluxo pós-aprovação agora vive nos módulos **Bags** (alocação) e **Concluídos** (consulta), essas duas colunas do board de Processos ficam redundantes.

**Ação em `src/components/processes/ProcessBoard.tsx`:**
- Remover os grupos `"Bags"` (linhas 65-69) e `"Concluídos"` (linhas 70-73) de `PROCESS_GROUPS`.
- No `tasksByGroup` (linhas 132-161), remover o bloco que envia itens para essas colunas quando `isInParallelPhase(p)` — esses itens já são tratados nos módulos dedicados e devem simplesmente sumir do board de Processos.
- Ajustar `pendingCount` (linhas 163-167) removendo o filtro `g.label !== "Concluídos"` (não é mais necessário).

Nada muda no banco, nas rotas ou nos módulos Bags/Concluídos.

### Arquivos alterados
- `src/lib/permissions.ts` — bump da queryKey.
- `src/components/processes/ProcessBoard.tsx` — remoção das duas colunas e da lógica associada.
