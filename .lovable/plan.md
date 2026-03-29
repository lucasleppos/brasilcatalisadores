# Plano: Reestruturar Fluxo Cerâmico (Criação Simplificada + Conferência Detalhada + Lab Similar ao Sacola)

## Resumo das Mudanças

1. Na criação do pedido cerâmico, o usuario informa apenas **peso total + foto** (sem grupo, sem PPMs, sem tara)
2. Na etapa de **Conferência**, o operador registra os lotes/grupos com categoria, peso liquido e tara (tela similar ao `SacolaConferenciaPanel`)
3. Na etapa de **Lab em Análise**, a inclusão de resultados segue o modelo do `SacolaLabPanel` — lista os itens da conferência e o operador registra Pt/Pd/Rh individualmente por lote
4. Mantém as demais otimizações do plano anterior (pular etapas iniciais, pular sub-fluxos paralelos, confirmação unica na aprovação)

---

## Modelo de Tela 1: Criação do Pedido Cerâmico (Simplificada)

```text
┌──────────────────────────────────────────┐
│  Nova Compra                             │
│                                          │
│  Fornecedor: [Select]  *                 │
│  Boleto Syge: [__________]               │
│                                          │
│  ┌── Foto do material recebido * ──────┐ │
│  │  [Tirar Foto]  [Galeria]            │ │
│  │  📸 📸 (thumbnails das fotos)       │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  Tipo: [Cerâmico ▼]                      │
│                                          │
│  Peso total recebido (kg) *              │
│  [___________]                           │
│                                          │
│  Observações: [__________]               │
│                                          │
│  ┌────────────┐  ┌───────────────────┐   │
│  │  Cancelar  │  │  Criar Compra     │   │
│  └────────────┘  └───────────────────┘   │
└──────────────────────────────────────────┘
```

Nota: Sem campos de Grupo, Tara, ou PPMs. Apenas peso bruto total e foto.

---

## Modelo de Tela 2: Conferência Cerâmica (Nova — similar ao SacolaConferenciaPanel)

```text
┌──────────────────────────────────────────┐
│  Conferência — Cerâmico                  │
│                                          │
│  ┌─ Resumo ────────────────────────────┐ │
│  │ Fornecedor: ABC Metais    PN-00042  │ │
│  │ Peso declarado: 150,000 kg          │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ── Lotes Conferidos ──────────────────  │
│  ┌─────────────────────────────────────┐ │
│  │ #1 — Colmeia                        │ │
│  │ Peso Líq: 45,500 kg | Tara: 1,200  │ │
│  │                              [🗑]   │ │
│  ├─────────────────────────────────────┤ │
│  │ #2 — Fundo                          │ │
│  │ Peso Líq: 32,000 kg | Tara: 0,800  │ │
│  │                              [🗑]   │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ── Adicionar Lote ────────────────────  │
│  │ Categoria (Grupo) *                 │ │
│  │ [Select: Colmeia, Fundo, Pó...  ▼] │ │
│  │                                     │ │
│  │ Peso Líquido (kg) *  │ Tara (kg)   │ │
│  │ [___________]        │ [________]  │ │
│  │                                     │ │
│  │ [+ Adicionar Lote]                  │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  Total: 2 lotes | 77,500 kg             │
│  ████████████░░░░░░░░  77,5/150 kg       │
│                                          │
│  [Salvar e Continuar] [Encerrar (2)]     │
└──────────────────────────────────────────┘
```

---

## Modelo de Tela 3: Lab em Análise — Cerâmico (similar ao SacolaLabPanel)

```text
┌──────────────────────────────────────────┐
│  🔬 Laboratório — Cerâmico               │
│                                          │
│  ┌─ Resumo ────────────────────────────┐ │
│  │ Fornecedor: ABC Metais    PN-00042  │ │
│  │ 2 lotes conferidos | 77,500 kg      │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ── Lotes para Análise ────────────────  │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │ #1 — Colmeia  (45,500 kg)           │ │
│  │                                     │ │
│  │ Pt (ppm)    Pd (ppm)    Rh (ppm)   │ │
│  │ [_______]   [_______]   [_______]  │ │
│  │                                     │ │
│  │ [Salvar Análise]                    │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │ #2 — Fundo  (32,000 kg)  ✅ Reg.   │ │
│  │                                     │ │
│  │ Pt: 1,2340  Pd: 3,4560  Rh: 0,1230│ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ████████████████████░  1/2 análises     │
│  ⚠ Registre todas as análises            │
│                                          │
│  [Salvar e Continuar] [Encerrar (1/2)]   │
└──────────────────────────────────────────┘
```

---

## Alterações Técnicas

### 1. `src/components/purchases/NewPurchaseDialog.tsx` — Simplificar criação cerâmica

- Quando `addType === "ceramico"`, **remover** os campos de Peso Bruto, Tara, PPMs e Categoria do formulário de adição de item
- Em vez disso, exibir apenas um campo de **"Peso total recebido (kg)"** que será salvo no `bulk_weight` da compra
- Não adicionar item ao array `items` — a compra cerâmica será criada apenas com o peso total e a foto
- Ajustar validação: para cerâmico, exigir apenas `bulkWeight > 0` e `photos.length > 0`

### 2. `src/lib/purchases.ts` — Skip etapas iniciais para cerâmico

- Na `createPurchase`, quando `materialFlow === "ceramico"`, iniciar diretamente em `"Em Conferência"` (igual ao peças)
- Na `getNextStatus`:
  - Pular `"Cerâmico: Amostra Enviada ao Lab"` — após Trituração ir direto para `"Cerâmico: Lab em Análise"`
  - Pular `"Cerâmico: Resultado Incluído"` — após Lab ir direto para `"Cerâmico: Em Precificação"`
  - Ao aprovar (`"Cerâmico: Gerar Boleto de Aprovação"`), ir direto para `"Concluído"` (pular sub-fluxos paralelos)

### 3. `src/components/processes/CeramicoConferenciaPanel.tsx` — NOVO componente

- Interface similar ao `SacolaConferenciaPanel`
- Lista lotes com categoria (grupo), peso líquido e tara
- Categoria selecionável via select com opções como "Grupo 01, Grupo 02, ... etc, Especial, Extra", etc. (ou input livre)
- Validação: peso total dos lotes deve ser compatível com o `bulkWeight` declarado
- Salva como `purchase_items` com `item_type: "ceramico"` e `category: "conferencia"`
- Botão "Encerrar" avança o status

### 4. `src/components/processes/CeramicoLabPanel.tsx` — NOVO componente

- Interface similar ao `SacolaLabPanel`
- Lista os itens de conferência cerâmica (lotes)
- Para cada lote, campos de Pt, Pd, Rh (ppm) com botão "Salvar Análise"
- Salva em `lab_results` vinculado ao `purchase_item_id`
- Barra de progresso: X/Y análises
- Botão "Encerrar" avança para "Em Precificação" quando 100% concluído

### 5. `src/components/processes/StageActionCard.tsx` — Integrar novos painéis

- Detectar `isCeramicoConferencia` = status `"Em Conferência"` + `materialFlow === "ceramico"`
- Abrir `CeramicoConferenciaPanel` nessa etapa
- Detectar `isCeramicoLab` = status `"Cerâmico: Lab em Análise"` + `materialFlow === "ceramico"`
- Abrir `CeramicoLabPanel` em vez do `TripleAnalysisForm`
- Adicionar dialog de confirmação na aprovação cerâmica (similar ao peças): "Confirmar e Encerrar"

### 6. `src/components/processes/ProcessBoard.tsx` — Ajustar grupos

- Remover `"Cerâmico: Amostra Enviada ao Lab"` e `"Cerâmico: Resultado Incluído"` dos grupos ativos (manter para legados)
- Grupo "Pagamento" com `parallelMatch: "fin"` mantido para legados

## Arquivos novos

- `src/components/processes/CeramicoConferenciaPanel.tsx`
- `src/components/processes/CeramicoLabPanel.tsx`

## Arquivos editados

- `src/components/purchases/NewPurchaseDialog.tsx`
- `src/lib/purchases.ts`
- `src/components/processes/StageActionCard.tsx`
- `src/components/processes/ProcessBoard.tsx`