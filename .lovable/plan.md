# Fase 2 — Nova Conferência para Peça em Sacola

## Esboço da tela

```text
┌─────────────────────────────────────────────────┐
│  CARD COMPACTO (estado inicial)                 │
│                                                 │
│  Fornecedor ABC          3 pç / 2,5 kg          │
│  25/03/2026 - 01          ⏱ 2h nesta etapa      │
│  Boleto: 12345            Peça em Sacola         │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │      [ 🔍 Iniciar Conferência ]         │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘

         ▼ ao clicar "Iniciar Conferência" ▼

┌─────────────────────────────────────────────────┐
│  CARD EXPANDIDO (Dialog/Sheet)                  │
│                                                 │
│  ── Cabeçalho do Pedido ──────────────────────  │
│  Fornecedor ABC  |  25/03/2026 - 01             │
│  3 peças declaradas  |  2,5 kg                  │
│                                                 │
│  ── Peças Conferidas ─────────────────────────  │
│  ┌───────────────────────────────────────────┐  │
│  │ #1  Código: ABC-123                       │  │
│  │     Peça: Catalisador XYZ (encontrado ✓)  │  │
│  │     Peso líquido: 0,450 kg        [🗑]    │  │
│  ├───────────────────────────────────────────┤  │
│  │ #2  Código: DEF-456                       │  │
│  │     Peça: Não encontrada ⚠                │  │
│  │     Peso líquido: 0,320 kg        [🗑]    │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ── Adicionar Peça ───────────────────────────  │
│  Código da peça:  [_______________] [Buscar]    │
│  Peso líquido:    [___________] kg              │
│  [+ Adicionar Peça]                             │
│                                                 │
│  Total: 2 peças conferidas | 0,770 kg           │
│                                                 │
│  [ Encerrar Conferência (2 peças) ]             │
└─────────────────────────────────────────────────┘
```

**Observações sobre o esboço:**

- O card compacto substitui o checklist atual (foto + confirmar itens) por um único botão "Iniciar Conferência"
- Ao clicar, abre um Dialog/Sheet com o formulário completo
- Cada peça adicionada busca no catálogo pelo código e exibe o nome da peça (mas **não** mostra PPMs nesta etapa)
- Peças não encontradas no catálogo ficam marcadas com aviso mas são aceitas (o código fica registrado para consulta futura)
- O botão "Encerrar Conferência" salva todos os itens e avança o status  
- *Criar um botão de salvar e continuar, caso seja necessario para a conferencia e retomar posteriormente**

## Sobre as etapas seguintes (Trit/Homo/Amostragem)

As 3 etapas atuais do fluxo de peças (`Peças: Em Corte`, `Peças: Em Trituração`, `Peças: Em Amostragem`) serão **unificadas em uma única etapa**: `Peças: Trituração e Amostragem`, com apenas um botão de aprovação para avançar para o laboratório (Fase 3).

## Alterações técnicas

### 1. Novo componente: `SacolaConferenciaPanel.tsx`

- Dialog/Sheet que abre ao clicar "Iniciar Conferência"
- Campo de código + busca no `catalog_parts` (por `code`) → exibe nome da peça
- Campo de peso líquido (kg)
- Lista de peças já adicionadas com opção de remover
- Salva cada peça conferida como `purchase_item` com `catalog_part_id` (quando encontrada), `weight`, `item_type: "peca_sacola"`
- Botão "Encerrar Conferência" → chama `advanceStage`

### 2. `StageActionCard.tsx`

- Para `peca_sacola` em status `"Em Conferência"`: renderizar botão "Iniciar Conferência" + `SacolaConferenciaPanel` em vez do checklist padrão (foto + confirmar itens)

### 3. `src/lib/purchases.ts`

- Unificar `Peças: Em Corte` → `Peças: Em Trituração` → `Peças: Em Amostragem` em uma única etapa `Peças: Trituração e Amostragem`
- Atualizar `PECAS_FLOW`: `Em Conferência` → `Peças: Trituração e Amostragem` → (próxima fase: lab)
- Atualizar `getNextStatus` para o novo nome

### 4. `src/lib/stage-tasks.ts`

- Remover/simplificar requirements de `"Em Conferência"` para `peca_sacola` (sem foto obrigatória, sem confirmar itens)
- Adicionar `"Peças: Trituração e Amostragem"` com checklist simples (ex: apenas confirmação)
- Remover as 3 etapas individuais que foram unificadas

### 5. `ProcessBoard.tsx`

- Atualizar as abas visíveis para incluir `"Peças: Trituração e Amostragem"` e remover as 3 anteriores


| Arquivo                                               | Ação                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| `src/components/processes/SacolaConferenciaPanel.tsx` | **Novo** — formulário de conferência com busca no catálogo |
| `src/components/processes/StageActionCard.tsx`        | Renderizar novo painel para sacola em conferência          |
| `src/lib/purchases.ts`                                | Unificar etapas de trit/homo/amostragem                    |
| `src/lib/stage-tasks.ts`                              | Ajustar requirements das etapas                            |
| `src/components/processes/ProcessBoard.tsx`           | Atualizar abas                                             |
