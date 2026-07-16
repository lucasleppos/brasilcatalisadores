
# Nova etapa de Trituração/Homogeneização/Amostragem (Cerâmico)

Substituir o checklist genérico (peso pós-trituração + foto da amostra) da etapa `Cerâmico: Em Trituração/Homogeneização` por um painel dedicado, aberto pelo operador via botão no card.

## Comportamento

### 1. Card do processo (StageActionCard)
Quando `status === "Cerâmico: Em Trituração/Homogeneização"` e `materialFlow === "ceramico"`:
- Ocultar o `StageChecklist` genérico.
- Mostrar botão único **"Iniciar Trituração/Homogeneização"** (ícone de balança).
- Clique abre o novo `CeramicoTrituracaoPanel` (Dialog).

### 2. Novo painel `CeramicoTrituracaoPanel`
Header igual ao painel de Conferência (fornecedor, número, Boleto Syge, peso bruto recebido).

Lista dos grupos já conferidos (carregados de `purchase_items` onde `item_type='ceramico'` e `category='conferencia'`, cruzando com `stage_evidence` para obter nome do grupo e foto da conferência). Para cada grupo, um card compacto exibindo:
- Miniatura da foto da conferência + nome do grupo + código da etiqueta.
- **Peso Bruto** (readonly, vindo da conferência) — em kg, 3 casas.
- **TARA (kg) *** — input `text` + `inputMode='decimal'` (parseNum), obrigatório.
- **Foto da embalagem *** — botão câmera/galeria (`uploadStagePhoto`), obrigatório, uma foto por grupo.
- **Peso Líquido** calculado em tempo real: `Bruto − TARA` (destaque se ≤ 0 → erro).

Rodapé:
- Resumo: total bruto, total tara, total líquido, nº de grupos completos.
- Botão **Salvar** (persistência parcial, permite voltar depois).
- Botão **Encerrar Etapa** — só habilita quando todos os grupos têm TARA válida (>0 e < bruto) e foto. Persiste e chama `advanceStage(purchase.id, purchase.status)` (avança para `Cerâmico: Lab em Análise`).

### 3. Persistência
Para cada lote conferido (`purchase_items.id = <loteId>`):
- **`purchase_items.weight_loss`** = TARA (kg). Já é `NUMERIC` e hoje está `0` para conferência cerâmica — passa a armazenar a tara.
- **`purchase_items.weight`** permanece o peso **bruto** (não sobrescrever) — o líquido é derivado: `weight − weight_loss`. Isso preserva o dado original e não quebra a re-abertura do painel de Conferência.
- **`stage_evidence`** (novos registros, `stage='trituracao_ceramico'`):
  - `task_key=tare_<loteId>`, `data_type='weight'`, `value_numeric=<tara>`.
  - `task_key=photo_embalagem_<loteId>`, `data_type='photo'`, `file_url=<url>`.
- Ao reabrir o painel, carregar TARA de `weight_loss` e foto de `stage_evidence`.

### 4. Impacto no fluxo posterior (peso líquido)
Cálculos downstream que hoje somam `purchase_items.weight` dos lotes de conferência do cerâmico devem passar a considerar `weight − weight_loss` quando `item_type='ceramico'` e `category='conferencia'`.

Localizar e ajustar os consumidores:
- `CeramicoLabPanel` (envio/recebimento de amostra) — usar peso líquido total.
- `CeramicoPricingPanel` / precificação e demonstrativo — usar peso líquido total.
- Qualquer relatório/reports que some esses lotes.

_Só será tocado o cálculo agregado; a estrutura de dados permanece._

### 5. Remoção do checklist antigo
Em `src/lib/stage-tasks.ts`, remover a chave `"Cerâmico: Em Trituração/Homogeneização"` do `STAGE_REQUIREMENTS` (ou deixá-la como `[]`), para que `StageChecklist` e `canAdvanceStage` deixem de exigir `weight_pos_trituracao` e `photo_amostra` neste estágio. O checklist da etapa `Peças: Em Trituração` permanece inalterado.

## Arquivos afetados

- `src/components/processes/CeramicoTrituracaoPanel.tsx` — **novo**.
- `src/components/processes/StageActionCard.tsx` — botão + estado `ceramicoTrituracaoOpen`, condição `isCeramicoTrituracao`, montar o painel.
- `src/lib/stage-tasks.ts` — remover requisitos antigos do estágio.
- `src/components/processes/CeramicoLabPanel.tsx`, `CeramicoPricingPanel.tsx` (e demais consumidores que somam pesos de conferência do cerâmico) — passar a usar `weight − weight_loss`.

## Detalhes técnicos

- Reaproveitar helpers existentes: `uploadStagePhoto`, `parseNum` (padrão do projeto para inputs BR), `fmtNum` com 3 casas para kg.
- Sem migração de banco: `weight_loss` e `stage_evidence` já existem e cobrem o caso.
- Validação: TARA obrigatória `> 0`, `< peso bruto`; foto obrigatória; um registro de cada por lote (usar `delete + insert` de `stage_evidence` para o `stage='trituracao_ceramico'` do purchase, como o painel de Conferência faz).
- Botão só aparece se `canDo("processos", "advance_stage")` (mesma checagem do card).
- Após avançar, chamar `onCompleted()` para recarregar a lista.

## Verificação

- `tsgo` para checar tipos.
- Testar manualmente: abrir um processo cerâmico na etapa, informar TARAs, salvar, reabrir (persistência), encerrar → confirmar avanço para `Cerâmico: Lab em Análise` e que o total líquido apareça correto na etapa de laboratório/precificação.
