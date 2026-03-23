

# Remover margem (%) do grupo nos resultados de busca de peças

## Problema
No componente `PartSearch.tsx` (usado dentro do Dialog de Precificação e em outros locais), o badge do grupo exibe a margem junto ao nome: `"U (7%)"`, `"V (9%)"`. Conforme a regra de visibilidade de margens, essa informação deve ser ocultada.

## Alteração

### `src/components/catalog/PartSearch.tsx` — Linha 68
Trocar:
```tsx
<Badge variant="outline" className="text-[10px]">{part.groupName} ({part.groupMargin}%)</Badge>
```
Por:
```tsx
<Badge variant="outline" className="text-[10px]">{part.groupName}</Badge>
```

**1 arquivo, 1 linha.**

Isso afeta todos os locais que usam `PartSearch`: Dialog de Precificação, NewPurchaseDialog, etc.

