

# Adicionar módulo "Catálogo" nas definições de permissões

## Problema
O módulo `catalogo` já está protegido via `ProtectedRoute` e presente no sidebar, mas não aparece em `MODULE_DEFINITIONS` no `src/lib/permissions.ts`. Isso impede que o admin configure acesso ao Catálogo pela tela de Permissões.

## Alteração

### `src/lib/permissions.ts`
Adicionar entrada `catalogo` ao `MODULE_DEFINITIONS` (após `bags`, antes de `relatorios`):

```typescript
catalogo: {
  label: "Catálogo",
  actions: [
    { key: "create", label: "Criar" },
    { key: "edit", label: "Editar" },
    { key: "delete", label: "Excluir" },
    { key: "import", label: "Importar Excel" },
  ],
  fields: [],
},
```

**1 arquivo, ~8 linhas adicionadas.** Após isso, o módulo aparecerá automaticamente na tela de Permissões para configuração de acesso por perfil.

