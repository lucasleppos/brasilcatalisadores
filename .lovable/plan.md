

# Ocultar margem (%) do grupo na tabela do Catálogo

## Problema
Na tabela do catálogo e no filtro de grupo, a margem aparece junto ao nome do grupo (ex: "A (5%)"). O usuário quer mostrar apenas o nome do grupo na tabela — sem o percentual. A margem deve ser visível apenas no cadastro da peça (dialog de edição) e somente para super admin.

## Alterações

### `src/pages/CatalogPage.tsx`
1. **Tabela** (linha ~153): trocar `{p.groupName} ({p.groupMargin}%)` por apenas `{p.groupName}`
2. **Filtro de grupo** (linha ~120): trocar `{g.name} ({g.margin}%)` por apenas `{g.name}`
3. **Dialog de edição** (Select de grupo, linha ~207): manter `{g.name} ({g.margin}%)` apenas para super admin — adicionar verificação com `usePermissions` ou checar role do usuário. Se não for super admin, mostrar só `{g.name}`

### Consideração sobre permissões
Usar o hook `usePermissions` (já existente) para verificar se o usuário é super admin. A margem no select do dialog fica visível só para esse perfil.

**1 arquivo, ~3 linhas alteradas.**

