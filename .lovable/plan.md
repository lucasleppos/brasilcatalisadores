

# Fase 3 — Laboratório para Peça em Sacola

## Entendimento

Após "Peças: Trituração e Amostragem", o fluxo agora passa por uma etapa de **Laboratório** antes da precificação. Nessa etapa, o operador do laboratório vê todas as peças registradas na conferência e insere os PPMs (Pt, Pd, Rh) de cada uma. A interface segue o mesmo padrão da conferência: card compacto com botão "Iniciar Análise" → dialog expandido.

## Esboço das telas

```text
┌─────────────────────────────────────────────────┐
│  CARD COMPACTO (Laboratório)                    │
│                                                 │
│  Fornecedor ABC          3 pç / 2,5 kg          │
│  25/03/2026 - 01          ⏱ 1h nesta etapa      │
│  Peça em Sacola                                 │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │      [ 🔬 Iniciar Análise ]             │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘

         ▼ ao clicar "Iniciar Análise" ▼

┌─────────────────────────────────────────────────┐
│  DIALOG EXPANDIDO                               │
│                                                 │
│  ── Cabeçalho ──────────────────────────────── │
│  Fornecedor ABC  |  25/03/2026 - 01             │
│  5 peças conferidas  |  3,200 kg total          │
│                                                 │
│  ── Peças para Análise ───────────────────────  │
│  ┌───────────────────────────────────────────┐  │
│  │ #1  Catalisador XYZ  |  0,450 kg          │  │
│  │     Pt (ppm): [____]  Pd: [____]  Rh: [__]│  │
│  │     [✓ Registrada]                        │  │
│  ├───────────────────────────────────────────┤  │
│  │ #2  Peça DEF-456  |  0,320 kg             │  │
│  │     Pt (ppm): [____]  Pd: [____]  Rh: [__]│  │
│  │     [ Salvar Análise ]                    │  │
│  ├───────────────────────────────────────────┤  │
│  │ #3  Catalisador GHI  |  0,510 kg          │  │
│  │     Pt (ppm): [____]  Pd: [____]  Rh: [__]│  │
│  │     [ Salvar Análise ]                    │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  Progresso: ████░░░░░░  1/3 análises            │
│                                                 │
│  ┌──────────────────┐ ┌──────────────────────┐  │
│  │ Salvar e Continuar│ │ Encerrar (1/3) 🔒   │  │
│  └──────────────────┘ └──────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Observações:**
- Cada peça da conferência aparece com nome do catálogo (ou código manual) e peso
- Campos Pt/Pd/Rh por peça — um único registro por peça
- Botão "Salvar Análise" individual por peça, que marca como registrada (✓)
- "Encerrar" só habilitado quando todas as peças tiverem análise
- "Salvar e Continuar" fecha o dialog para retomar depois
- Os resultados são salvos em `lab_results` vinculados ao `purchase_id` e `purchase_item_id`

## Alterações técnicas

### 1. Novo status: `"Peças: Laboratório"`
- Inserir entre `"Peças: Trituração e Amostragem"` e `"Peças: Aguardando Demonstrativo"` no `PECAS_FLOW`
- Adicionar em `PECAS_STATUSES`, `STAGE_ROLES` (operacional/lab)

### 2. Migração de banco
- Adicionar coluna `purchase_item_id uuid` na tabela `lab_results` para vincular resultado à peça específica

### 3. Novo componente: `SacolaLabPanel.tsx`
- Dialog similar ao `SacolaConferenciaPanel`
- Carrega peças conferidas de `purchase_items` (onde `item_type = 'peca_sacola'` e `category = 'conferencia'`)
- Para cada peça, mostra campos Pt/Pd/Rh e botão de salvar individual
- Salva em `lab_results` com `purchase_item_id`
- Validação: só encerra quando todas as peças têm resultado
- "Salvar e Continuar" fecha dialog

### 4. `StageActionCard.tsx`
- Detectar `status === "Peças: Laboratório"` com itens `peca_sacola`
- Renderizar botão "Iniciar Análise" + `SacolaLabPanel`

### 5. `ProcessBoard.tsx`
- Adicionar `"Peças: Laboratório"` ao grupo "Prep. Amostra / Análise"

### 6. `stage-tasks.ts`
- Adicionar requirement para `"Peças: Laboratório"`

| Arquivo | Ação |
|---------|------|
| `src/lib/purchases.ts` | Novo status + fluxo |
| `src/lib/stage-tasks.ts` | Requirements do lab |
| `src/components/processes/SacolaLabPanel.tsx` | **Novo** — dialog de análise por peça |
| `src/components/processes/StageActionCard.tsx` | Botão "Iniciar Análise" |
| `src/components/processes/ProcessBoard.tsx` | Aba do laboratório |
| Migração SQL | Coluna `purchase_item_id` em `lab_results` |

