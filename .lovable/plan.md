# Adicionar `inputMode="decimal"` nos campos numéricos para teclado mobile

Sim, é possível. O atributo HTML `inputMode="decimal"` faz o celular abrir o teclado numérico com ponto/vírgula decimal, em vez do teclado alfanumérico padrão.

## Abordagem

Alterar o componente `Input` em `src/components/ui/input.tsx` para automaticamente adicionar `inputMode="decimal"` quando `type="number"`, eliminando a necessidade de alterar cada arquivo individualmente.

## Campos afetados (todos os `type="number"` do projeto)


| Arquivo                  | Campos                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **CalculatorPage.tsx**   | Preço Manual, Peso Bruto (kg), Tara (kg), Pt (ppm), Pd (ppm), Rh (ppm), Margem de Fornecedor (%), Pt ($/ozt), Pd ($/ozt), Rh ($/ozt) |
| **SettingsPage.tsx**     | Todos os campos de configuração (preços, taxas, margens) — componente `Field` interno                                                |
| **SupplierForm.tsx**     | Margem (%)                                                                                                                           |
| **NewBagDialog.tsx**     | Peso Máximo (kg)                                                                                                                     |
| **BagAnalysisPanel.tsx** | Pt (ppm), Pd (ppm), Rh (ppm) provisórios; Pt, Pd, Rh do refinador; Valor Total do Refinador (R$)                                     |


**Total: ~25 campos numéricos** em 5 arquivos, todos corrigidos com uma única alteração no componente `Input`.

## Alteração

### `src/components/ui/input.tsx`

Adicionar lógica para injetar `inputMode="decimal"` automaticamente quando `type="number"`:

```tsx
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, inputMode, ...props }, ref) => {
    return (
      <input
        type={type}
        inputMode={inputMode ?? (type === "number" ? "decimal" : undefined)}
        // ... rest unchanged
      />
    );
  },
);
```

Isso garante que:

- Todos os campos `type="number"` ganham teclado numérico no celular automaticamente
- Se algum campo precisar de outro `inputMode`, basta passar explicitamente e ele não será sobrescrito