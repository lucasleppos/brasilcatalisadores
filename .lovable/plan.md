

# Categoria com entrada livre no CeramicoConferenciaPanel

## O que muda
Substituir o `Select` fixo de categorias por um **combobox** que permite tanto selecionar das categorias predefinidas quanto digitar uma categoria personalizada.

## Alteração técnica

### `src/components/processes/CeramicoConferenciaPanel.tsx`
- Substituir o `Select` por um campo que combina as opções predefinidas com input livre
- Usar um `Popover` + lista de sugestões filtráveis, ou simplesmente um `Input` com `datalist` HTML nativo para manter a simplicidade
- Abordagem mais simples: trocar o `Select` por um `Input` com um `datalist` contendo as categorias predefinidas — o usuário pode escolher da lista ou digitar qualquer texto
- Manter a validação `!category` no botão "Adicionar Lote"

O resultado: o operador vê as sugestões (Grupo 01–10, Especial, Extra) mas pode digitar livremente qualquer categoria.

