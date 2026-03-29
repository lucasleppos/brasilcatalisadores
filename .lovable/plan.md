

# Plano: Corrigir avanço cerâmico para ativar fase paralela (Bags + Pagamento)

## Problema

Na linha 194 de `src/lib/purchases.ts`, a função `getNextStatus` mapeia:

```
"Cerâmico: Gerar Boleto de Aprovação" → "Concluído"
```

Isso pula completamente a fase paralela. O correto é avançar para `"Cerâmico: Aprovado"`, que na linha 487 já inicializa os sub-fluxos `fin_status = "Aguardando Pagamento"` e `op_status = "Alocando Bag"`.

Com isso, o `ProcessBoard` detectará `isInParallelPhase(p) === true` e exibirá a compra nas abas "Pagamento" e "Bags / Exportação".

## Solução

Alterar uma única linha em `src/lib/purchases.ts`:

```
// Antes (linha 194):
if (current === "Cerâmico: Gerar Boleto de Aprovação") return "Concluído";

// Depois:
if (current === "Cerâmico: Gerar Boleto de Aprovação") return "Cerâmico: Aprovado";
```

## Arquivo editado
- `src/lib/purchases.ts` — linha 194

