

# Tarefas Obrigatórias por Etapa — Sistema de Evidências + Checklist

## Resumo

Sistema que bloqueia o avanço de etapa até que todas as evidências obrigatórias (fotos, pesagens, análises) sejam registradas. Cada etapa define suas tarefas; o botão "Avançar" só habilita quando tudo está concluído.

## 1. Banco de Dados

### Tabela `stage_evidence`
Armazena fotos, pesagens e notas coletadas por etapa/compra.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| purchase_id | uuid FK | |
| stage | text | Etapa onde foi coletado |
| task_key | text | Ex: `photo_recebimento`, `weight_pos_corte` |
| data_type | text | `photo`, `weight`, `note` |
| value_numeric | numeric | Para pesagens |
| value_text | text | Para notas |
| file_url | text | URL da foto no storage |
| created_by | uuid | Quem registrou |
| created_at | timestamp | |

### Tabela `lab_analyses`
Armazena as 3 análises individuais que geram a média final em `lab_results`.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| purchase_id | uuid FK | |
| lab_result_id | uuid FK (nullable) | Vinculo ao resultado médio |
| analysis_number | int (1-3) | |
| pt_ppm, pd_ppm, rh_ppm | numeric | |
| created_by | uuid | |
| created_at | timestamp | |

### Storage bucket `stage-photos`
Bucket público para fotos de evidência.

### RLS
- Leitura para todos autenticados
- Insert/Update/Delete via `user_can_do(uid, 'processos', 'advance_stage')`

## 2. Tarefas por Etapa

```text
Etapa                        │ Tarefas Obrigatórias
─────────────────────────────┼──────────────────────────────────
Conferência                  │ 📷 Foto do material recebido
                             │ 📝 Confirmar itens do pedido
─────────────────────────────┼──────────────────────────────────
Separação (Cerâmico)         │ 📷 Foto do material separado
─────────────────────────────┼──────────────────────────────────
Corte (Peças)                │ 📷 Foto pós-corte
                             │ ⚖️ Peso cerâmica extraída
                             │ 📊 Comparação auto com peso inicial
─────────────────────────────┼──────────────────────────────────
Trit./Homog./Amostr.         │ ⚖️ Peso pós-trituração
                             │ 📊 Perda vs peso anterior
                             │ 📷 Foto da amostra preparada
─────────────────────────────┼──────────────────────────────────
Análise (Lab)                │ 🔬 3 análises individuais (Pt/Pd/Rh)
                             │ 📊 Média automática
                             │ ⚠️ Alerta se desvio > threshold
─────────────────────────────┼──────────────────────────────────
Precif./Demonstrativo        │ 📄 Demonstrativo gerado (PDF)
─────────────────────────────┼──────────────────────────────────
Aprovação                    │ ✅ Tela de confirmação com resumo
─────────────────────────────┼──────────────────────────────────
Pagamento                    │ 📷 Comprovante de pagamento (opcional)
─────────────────────────────┼──────────────────────────────────
Bags/Exportação              │ 📷 Foto bag lacrado com etiqueta
```

## 3. Mudança na Análise (1 input → 3 inputs → média)

O `registerAnalysis` atual aceita 1 conjunto de PPMs. Será refatorado:
1. Lab registra análise 1, 2, 3 individualmente (salvas em `lab_analyses`)
2. Na 3ª análise, o sistema calcula a média e cria o `lab_result` automaticamente
3. Se desvio padrão entre as 3 for alto, exibe alerta (mas não bloqueia)
4. O `StageActionCard` mostra as 3 análises + média lado a lado

## 4. Componentes Novos

| Componente | Função |
|------------|--------|
| `src/lib/stage-tasks.ts` | Definições de tarefas por etapa, CRUD de evidências, `canAdvanceStage()` |
| `StageChecklist.tsx` | Checklist visual: tarefas pendentes/concluídas, integrado no card |
| `PhotoCapture.tsx` | Botão de upload/câmera, salva no bucket `stage-photos` |
| `TripleAnalysisForm.tsx` | 3 inputs de Pt/Pd/Rh, exibe média e desvio |

## 5. Modificações em Arquivos Existentes

| Arquivo | Mudança |
|---------|---------|
| `StageActionCard.tsx` | Integrar `StageChecklist`, desabilitar "Avançar" se checklist incompleto |
| `src/lib/purchases.ts` | Refatorar `registerAnalysis` para usar `lab_analyses` (3 inputs → média) |
| `PurchaseDetail.tsx` | Timeline de evidências coletadas por etapa (fotos + pesagens) |

## 6. Ordem de Implementação

1. Migração SQL (tabelas + bucket + RLS)
2. `src/lib/stage-tasks.ts` (definições + CRUD + `canAdvanceStage`)
3. `PhotoCapture.tsx` (upload para storage)
4. `StageChecklist.tsx` (checklist visual)
5. `TripleAnalysisForm.tsx` (3 análises → média)
6. Integrar no `StageActionCard.tsx` (bloqueio + checklist)
7. Atualizar `PurchaseDetail.tsx` (timeline de evidências)

