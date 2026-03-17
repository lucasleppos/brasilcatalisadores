

# Fix: PDF bloqueado pelo Chrome ao abrir em nova aba

## Problema

O `window.open(blobUrl, "_blank")` é bloqueado por ad blockers e pelo popup blocker do Chrome, gerando `ERR_BLOCKED_BY_CLIENT`.

## Solução

Trocar de `window.open` para download direto via `<a>` tag com `download` attribute. Isso evita popups e faz o browser baixar o arquivo diretamente.

## Arquivos afetados

### `src/components/processes/StageActionCard.tsx`
- No handler de PDF: trocar `window.open(url, "_blank")` por criar um `<a>` temporário com `a.href = url`, `a.download = "demonstrativo.pdf"`, `a.click()`

### `src/components/processes/PurchaseSummary.tsx`
- Mesmo fix no `handlePdf`: trocar `window.open(url, "_blank")` por download direto via `<a>` tag

## Mudança concreta

```typescript
// Antes:
window.open(url, "_blank");

// Depois:
const a = document.createElement("a");
a.href = url;
a.download = `demonstrativo-${purchase.purchaseNumber}.pdf`;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
```

Simples, 2 arquivos, mesma mudança em cada.

