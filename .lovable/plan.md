# Implementacao do Fluxograma BPMN + Rastreio por Comprador

## Resumo

Implementar a maquina de estados bifurcada (Pecas vs. Ceramico), demonstrativos versionados, controle de divergencia de peso, paralelismo no ceramico, geracao de PDF do demonstrativo, e rastreio completo por comprador responsavel com perfil de visualizacao filtrada.

---

## Fase 1 — Migracao de Banco de Dados

### Nova tabela: `demonstrativos`


| Campo              | Tipo                                |
| ------------------ | ----------------------------------- |
| id                 | uuid PK                             |
| purchase_id        | uuid FK                             |
| versao             | int                                 |
| status             | text (pendente/aprovado/contestado) |
| valor_total        | numeric                             |
| enviado_em         | timestamptz                         |
| respondido_em      | timestamptz                         |
| motivo_contestacao | text                                |
| created_by         | uuid                                |


### Nova tabela: `lab_results`


| Campo       | Tipo        |
| ----------- | ----------- |
| id          | uuid PK     |
| purchase_id | uuid FK     |
| versao      | int         |
| pt_ppm      | numeric     |
| pd_ppm      | numeric     |
| rh_ppm      | numeric     |
| created_by  | uuid        |
| created_at  | timestamptz |


### Alteracoes na tabela `purchases`

- `material_flow` text (pecas/ceramico) — determinado automaticamente pelo tipo dos itens + regra do peca_sacola
- `buyer` text — comprador responsavel (herdado do fornecedor)
- `weight_declared` numeric — peso declarado no pedido
- `weight_real` numeric — peso apos pesagem
- `weight_loss` numeric — diferenca
- `fin_status` text — sub-status financeiro do ceramico (null para pecas)
- `op_status` text — sub-status operacional do ceramico (null para pecas)

### Alteracoes na tabela `bags`

- Ja tem campo `buyer` — ok

### RLS

- `demonstrativos` e `lab_results`: leitura autenticada, escrita por `user_can_do`
- Comprador: adicionar politica RLS que permite SELECT em `purchases` onde `buyer` = nome do comprador do usuario (via profile/supplier linkage)

---

## Fase 2 — Maquina de Estados Bifurcada

### Arquivo: `src/lib/purchases.ts` (reescrever logica de status)

**Fluxo Pecas:**

```
AGUARDANDO_INCLUSAO → AGUARDANDO_CONFERENCIA → EM_CONFERENCIA →
PECAS_AGUARDANDO_DEMONSTRATIVO → PECAS_DEMONSTRATIVO_ENVIADO →
[PECAS_DEMONSTRATIVO_CONTESTADO → volta PECAS_AGUARDANDO_DEMONSTRATIVO] →
PECAS_APROVADO_AGUARDANDO_PAGAMENTO → PECAS_PAGAMENTO_REALIZADO →
PECAS_EM_CORTE → PECAS_EM_TRITURACAO → PECAS_EM_AMOSTRAGEM →
PECAS_PESAGEM_REALIZADA → [PECAS_PESO_DIVERGENTE] →
PECAS_ALOCADO_BAG → PECAS_ENCERRADO
```

**Fluxo Ceramico:**

```
AGUARDANDO_INCLUSAO → AGUARDANDO_CONFERENCIA → EM_CONFERENCIA →
CER_EM_SEPARACAO → CER_EM_TRITURACAO_HOMOGENEIZACAO →
CER_AMOSTRA_ENVIADA_LAB → CER_LAB_EM_ANALISE →
CER_RESULTADO_INCLUIDO → CER_EM_PRECIFICACAO →
CER_DEMONSTRATIVO_ENVIADO →
[CER_DEMONSTRATIVO_CONTESTADO → volta CER_EM_TRITURACAO_HOMOGENEIZACAO] →
CER_APROVADO → paralelo:
  fin: CER_FIN_AGUARDANDO_PAGAMENTO → CER_FIN_PAGO → CER_FIN_ENCERRADO_ERP
  op: CER_OP_ALOCANDO_BAG → CER_OP_BAG_ALOCADO → CER_OP_EXPORTADO
→ ENCERRADO (quando ambos completam)
```

**Regra peca_sacola:** Se ao cadastrar o item, quantidade + preco foram preenchidos (sem PPM), segue fluxo Pecas. Se usar calculadora (PPMs), segue fluxo Ceramico.

- `getNextStatus(purchase)` consulta `material_flow` e retorna proximo estado correto
- `bifurcateAfterConference(purchase)` redireciona automaticamente
- `handleContestation(purchaseId, motivo)` cria nova versao de demonstrativo/lab e volta status
- `handleWeightCheck(purchaseId, pesoReal)` compara e muda para PESO_DIVERGENTE se necessario
- Mapeamento etapa → perfil responsavel atualizado para os novos estados

---

## Fase 3 — Demonstrativos e PDF

### Arquivo: `src/lib/demonstrativos.ts` (novo)

- CRUD para demonstrativos versionados
- `createDemonstrativo(purchaseId)` — calcula valores, cria versao 1 (ou incrementa)
- `contestDemonstrativo(id, motivo)` — marca como contestado, dispara loop
- `approveDemonstrativo(id)` — marca como aprovado, avanca status

### Geracao de PDF

- Usar edge function `supabase/functions/generate-demonstrativo-pdf/index.ts`
- Recebe purchaseId, gera PDF com dados do pedido, itens, valores, PPMs
- Retorna URL do PDF para download/compartilhamento via WhatsApp

---

## Fase 4 — Rastreio por Comprador

### Logica

- Ao criar compra, campo `buyer` e preenchido automaticamente com `supplier.buyer`
- Bags ja tem campo `buyer`
- Fornecedores ja tem campo `buyer`

### Perfil Comprador

- Atualizar permissoes do perfil `comprador` na tabela `permissions`:
  - Acesso somente leitura a: compras, fornecedores, processos, bags
  - Sem criar/editar/excluir
  - Filtro automatico: so ve registros onde `buyer` = seu nome

### Filtro automatico no frontend

- `loadPurchases()` — se role=comprador, filtrar por `buyer` = nome do usuario
- `loadSuppliers()` — se role=comprador, filtrar por `buyer`
- `loadBags()` — se role=comprador, filtrar por `buyer`
- Alternativa (mais segura): RLS no banco com funcao que verifica se o usuario e comprador e filtra pelo campo `buyer`

### Alteracoes nos componentes

- `PurchasesPage`, `SuppliersPage`, `BagsPage`, `ProcessBoard`: adicionar coluna "Comprador" nas tabelas
- Filtro por comprador nos dropdowns de filtro
- `NewPurchaseDialog`: preencher `buyer` automaticamente do fornecedor selecionado

---

## Fase 5 — Interface do Processo Atualizada

### `ProcessBoard.tsx`

- Mostrar etapas corretas conforme `material_flow` do pedido
- Acoes especificas por etapa:
  - Analise: formulario PPM (ja existe, adaptar para criar `lab_results`)
  - Demonstrativo: botao "Gerar PDF" + botoes "Aprovado" / "Contestado"
  - Pesagem: campo peso real + validacao de divergencia
  - Ceramico pos-aprovacao: mostrar dois sub-fluxos lado a lado

### `StageActionCard.tsx`

- Adaptar para novos estados
- Adicionar acoes especificas: contestacao, pesagem, geracao de demonstrativo

### `PurchaseDetail.tsx`

- Secao timeline vertical com historico de estados
- Secao demonstrativos com versoes
- Secao resultados lab com versoes (ceramico)
- Alerta visual divergencia de peso
- Sub-status financeiro/operacional (ceramico)

---

## Arquivos Afetados


| Arquivo                                          | Acao                                  |
| ------------------------------------------------ | ------------------------------------- |
| Migracao SQL                                     | Criar tabelas + alterar purchases     |
| `src/lib/purchases.ts`                           | Reescrever maquina de estados         |
| `src/lib/demonstrativos.ts`                      | Novo                                  |
| `src/lib/lab-results.ts`                         | Novo                                  |
| `src/lib/permissions.ts`                         | Adicionar modulo demonstrativos       |
| `src/components/processes/ProcessBoard.tsx`      | Adaptar para fluxos bifurcados        |
| `src/components/processes/StageActionCard.tsx`   | Novos tipos de acao                   |
| `src/components/purchases/PurchaseDetail.tsx`    | Timeline + versoes + sub-status       |
| `src/components/purchases/NewPurchaseDialog.tsx` | Campo buyer automatico, material_flow |
| `src/pages/PurchasesPage.tsx`                    | Coluna comprador, filtro comprador    |
| `src/pages/SuppliersPage.tsx`                    | Filtro por comprador (role=comprador) |
| `src/pages/BagsPage.tsx`                         | Filtro por comprador                  |
| `src/contexts/AuthContext.tsx`                   | Nenhuma mudanca                       |
| `supabase/functions/generate-demonstrativo-pdf/` | Novo edge function                    |


---

## Secao Tecnica — Determinacao do material_flow

```typescript
function determineMaterialFlow(items: PurchaseQuoteItem[]): "pecas" | "ceramico" {
  // Se tem algum item ceramico OU peca_sacola com calculadora (tem calcInput), fluxo ceramico
  const hasCeramicFlow = items.some(i =>
    i.itemType === "ceramico" ||
    (i.itemType === "peca_sacola" && i.input && !i.totalValue)
  );
  return hasCeramicFlow ? "ceramico" : "pecas";
}
```

## Compatibilidade

- Compras existentes recebem `material_flow = null` e continuam no fluxo linear legado ate serem migradas
- Novas compras usam o novo sistema automaticamente
- Os 12 status antigos sao mantidos como aliases para nao quebrar dados existentes