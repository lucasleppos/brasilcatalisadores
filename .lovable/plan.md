

# Plano: Corrigir duplicatas e PPMs na aba "Alocar Material"

## Problemas Identificados

### 1. Itens duplicados
A query carrega **todos** os `purchase_items` sem filtrar pelo campo `category`. Os dados mostram que uma compra como `e543f457` tem 1 item original (`category = null`, quantity=5) e 5 itens de conferência (`category = 'conferencia'`). Todos os 6 aparecem na lista. A solução é mostrar **apenas itens de conferência** (que possuem dados reais de peso, valor e PPM).

### 2. PPMs zerados
Os itens originais (`category = null`) não possuem `calc_input`, logo PPMs ficam 0. Os itens de conferência possuem `calc_input` com os valores reais de Pt, Pd, Rh. Ao filtrar para conferência, o problema se resolve automaticamente.

### 3. Compras cerâmicas na fase paralela não aparecem
A query filtra por `status IN ("Enviado ao Bag", "Exportação/Venda", "Peças: Alocado ao Bag")` mas compras cerâmicas na fase paralela ficam com `status = "Cerâmico: Aprovado"` e `op_status = "Alocando Bag"`. Elas nunca aparecem como disponíveis.

## Solução

### Arquivo: `src/components/bags/AllocationPanel.tsx`

1. **Filtrar itens de conferência**: Adicionar `.eq("category", "conferencia")` na query de `purchase_items`, ou filtrar no client-side com `item.category === 'conferencia'`
2. **Incluir compras cerâmicas em fase paralela**: Fazer uma segunda query para `purchases` com `status = "Cerâmico: Aprovado"` e `op_status = "Alocando Bag"`, e juntar os resultados
3. PPMs já são lidos corretamente de `calc_input` -- ficam corretos ao filtrar conferência

### Arquivo: `src/components/bags/AllocateMaterialDialog.tsx`

Mesmas correções:
1. Filtrar apenas itens de conferência
2. Incluir compras cerâmicas na fase paralela

## Detalhes Técnicos

A query de purchases passa de:
```
.in("status", ["Enviado ao Bag", "Exportação/Venda", "Peças: Alocado ao Bag"])
```
Para incluir também:
```
OR (status = "Cerâmico: Aprovado" AND op_status = "Alocando Bag")
```

E os itens são filtrados com:
```
if (item.category !== 'conferencia') return;
```

## Arquivos a editar
| Arquivo | Alteração |
|---|---|
| `src/components/bags/AllocationPanel.tsx` | Filtrar conferência + incluir cerâmicos paralelos |
| `src/components/bags/AllocateMaterialDialog.tsx` | Mesma correção |

