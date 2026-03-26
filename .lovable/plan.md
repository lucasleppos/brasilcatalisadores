

# Melhorias na Conferência Peça em Sacola

## Problema 1: Busca de peças difícil
O campo atual usa busca manual com botão "Buscar" que retorna apenas 1 resultado por `code`. O componente `PartSearch` já existente no catálogo faz busca com autocomplete (debounce, dropdown com sugestões, busca por código/ref/marca/carro) — muito mais amigável.

## Problema 2: "Salvar e Continuar" não fecha a tela
O `handleSave` salva os dados mas não chama `onOpenChange(false)` para fechar o dialog.

## Alterações

### `src/components/processes/SacolaConferenciaPanel.tsx`

1. **Substituir o campo de código manual + botão "Buscar"** pelo componente `PartSearch` existente (`src/components/catalog/PartSearch.tsx`)
   - Ao selecionar uma peça no autocomplete, preenche automaticamente o código e associa o `catalog_part_id`
   - Manter campo de peso líquido separado
   - Permitir também adicionar peça sem catálogo (campo de código manual como fallback)
   - Remover states `foundPart`, `searchDone`, `searching` e a função `handleSearch`

2. **Fechar dialog ao salvar**: Adicionar `onOpenChange(false)` no final do `handleSave` (após o `toast.success`)

| Arquivo | Mudança |
|---------|---------|
| `src/components/processes/SacolaConferenciaPanel.tsx` | Usar `PartSearch` para autocomplete + fechar ao salvar |

