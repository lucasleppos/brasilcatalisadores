
# Reestruturação do Fluxo Cerâmico — Etapas 1 a 3

Escopo desta iteração: **Compra → Conferência** (com etiquetas térmicas de rastreio) e remoção da etapa **Cerâmico: Em Separação**. Demais etapas permanecem inalteradas nesta rodada.

---

## Etapa 1 — Compra (Criação)

- Renomear o campo de peso do cerâmico em `NewPurchaseDialog` para **"Peso Bruto Total Recebido (kg)"**.
- No detalhe da compra e no card do processo, exibir o **saldo pendente de conferência** = `bulk_weight − Σ(peso líquido + tara)` conferidos.
- Foto obrigatória na criação permanece igual.

Sem alteração de schema.

---

## Etapa 2 — Conferência do Cerâmico

Arquivo principal: `src/components/processes/CeramicoConferenciaPanel.tsx`.

### 2.1. Foto obrigatória por grupo/lote
- Cada lote adicionado exige **1 foto** antes de salvar.
- Upload para bucket `stage-photos` (já existente). Registro em `stage_evidence` com `task_key = photo_lote_<purchase_item_id>`, `stage = "conferencia_ceramico"`.
- Remover a exigência genérica `photo_recebimento` do stage "Em Conferência" quando `materialFlow === "ceramico"` (foto passa a ser por lote). Ajuste em `src/lib/stage-tasks.ts`.

### 2.2. Peso líquido + Tara descontados do bruto
- Saldo em tempo real com destaque visual.
- **Validação de encerramento:** tolerância de **2%** — `|bulk_weight − Σ(líquido+tara)| ≤ 2% × bulk_weight`. Fora disso, bloqueia "Encerrar".
- Persistência mantida (peso líquido em `weight`, tara em `weight_loss`).

### 2.3. Etiquetas térmicas de rastreio

**Código do lote:**
```
LOT-<AAMMDD>-<Nº compra sem barras/espaços>-<seq 2 díg>
```
Ex.: compra `29/03/2026 - 03`, lote 1 → `LOT-260329-03-01`.

**Formato físico:** etiqueta térmica **100 × 50 mm**, 1 por página (rolo térmico). CSS `@page { size: 100mm 50mm; margin: 2mm }` + `@media print` para eliminar cabeçalho do navegador.

**Layout (fontes grandes para leitura rápida no chão de fábrica):**

```text
┌────────────────────────────────────────────────┐
│ LOTE: LOT-260329-03-01              ┌────────┐ │
│                                     │        │ │
│ Comprador: João Silva               │  QR    │ │
│ Fornecedor: Fornecedor XYZ Ltda     │  Code  │ │
│ Grupo: Grupo 03                     │ 30×30  │ │
│ Peso Líq.: 12,345 kg  Tara: 0,850kg │  mm    │ │
│                                     └────────┘ │
└────────────────────────────────────────────────┘
```

Especificações de tipografia:
- **LOTE**: 18pt bold, destaque no topo em largura total.
- **Comprador / Fornecedor / Grupo / Pesos**: 12–13pt bold, alto contraste (preto puro), espaçamento generoso.
- QR Code ~30×30 mm à direita, aponta para `/#/processos?lote=LOT-...` (leitura futura).
- Sem logo/marca no topo (removido conforme solicitado).

**Componentes/arquivos novos:**
- `src/lib/labels.ts` — `buildLabelCode(purchase, seq)` + helper que gera QR SVG via lib `qrcode`.
- `src/components/processes/CeramicoLabelPrint.tsx` — componente de impressão de 1 etiqueta térmica, com estilos `@page`/`@media print` dedicados.
- No painel de conferência:
  - Botão **"Imprimir etiqueta"** em cada card de lote (individual, reimpressão avulsa).
  - Botão **"Imprimir todas as etiquetas"** no rodapé (loop imprimindo uma por página).
- Persistência do código: `stage_evidence` com `task_key = label_<purchase_item_id>`, `value_text = LOT-...` (sem alteração de schema).

Fonte dos dados exibidos:
- `Comprador` → `purchases.buyer`
- `Fornecedor` → `purchases.supplier_name`
- `Grupo` → categoria do lote (Grupo 01…, Especial, Extra)
- `Peso Líq. / Tara` → `weight` / `weight_loss` do item

---

## Etapa 3 — Remover "Cerâmico: Em Separação"

| Arquivo | Alteração |
|---|---|
| `src/lib/purchases.ts` | Remover `"Cerâmico: Em Separação"` de `CERAMICO_STATUSES`, `CERAMICO_FLOW`, `STAGE_ROLES`. Em `getNextStatus`, após `"Em Conferência"` com fluxo cerâmico → `"Cerâmico: Em Trituração/Homogeneização"`. |
| `src/lib/stage-tasks.ts` | Remover entrada `"Cerâmico: Em Separação"` de `STAGE_REQUIREMENTS`. |
| `src/components/processes/ProcessBoard.tsx` / `ProcessFilters.tsx` | Retirar coluna/filtro de Separação, se listada. |
| Migração de dados | `UPDATE purchases SET status='Cerâmico: Em Trituração/Homogeneização' WHERE status='Cerâmico: Em Separação'`, com append no `status_history`. |

Status legado continua aceito pelo tipo `PurchaseStatus = string` — histórico não quebra.

---

## Dependências

- Adicionar pacote **`qrcode`** (`bun add qrcode` + `@types/qrcode`) — geração de QR SVG client-side.

---

## Resumo dos arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/purchases/NewPurchaseDialog.tsx` | Renomear rótulo do peso do cerâmico |
| `src/components/processes/CeramicoConferenciaPanel.tsx` | Foto por lote, saldo em tempo real, tolerância 2%, botões de impressão |
| `src/components/processes/CeramicoLabelPrint.tsx` *(novo)* | Layout da etiqueta térmica 100×50 mm |
| `src/lib/labels.ts` *(novo)* | Código do lote + QR |
| `src/lib/purchases.ts` | Remover status "Cerâmico: Em Separação" do fluxo |
| `src/lib/stage-tasks.ts` | Remover requisitos de Separação e da foto genérica de recebimento (cerâmico) |
| `src/components/processes/ProcessBoard.tsx` / `ProcessFilters.tsx` | Ajustes de UI |
| Migração de dados | Mover compras ativas de Separação → Trituração/Homogeneização |
