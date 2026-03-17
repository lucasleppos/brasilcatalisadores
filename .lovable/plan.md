
# Tarefas Obrigatórias por Etapa — Sistema de Evidências + Checklist

## Status: ✅ Fase 1 Implementada

### O que foi feito

1. **Banco de dados**
   - Tabela `stage_evidence` (fotos, pesagens, notas por etapa)
   - Tabela `lab_analyses` (3 análises individuais por compra)
   - Bucket `stage-photos` (storage público para fotos)
   - RLS com `user_can_do(uid, 'processos', 'advance_stage')`

2. **Core logic (`src/lib/stage-tasks.ts`)**
   - `STAGE_REQUIREMENTS`: definição de tarefas obrigatórias por etapa
   - CRUD de evidências (`addEvidence`, `loadEvidences`, `deleteEvidence`)
   - Upload de fotos para storage (`uploadStagePhoto`)
   - CRUD de análises individuais (`addLabAnalysis`, `loadLabAnalyses`)
   - `canAdvanceStage()`: valida se todas tarefas obrigatórias foram cumpridas
   - `calcAnalysisAverage()`: média + desvio padrão das 3 análises

3. **Componentes novos**
   - `PhotoCapture.tsx`: botão de câmera/galeria com preview e upload
   - `StageChecklist.tsx`: checklist visual integrado no card de cada etapa
   - `TripleAnalysisForm.tsx`: formulário de 3 análises com média e alerta de desvio

4. **Integração**
   - `StageActionCard.tsx`: checklist bloqueia botão "Avançar" até tarefas cumpridas
   - `StageActionCard.tsx`: análise substituída pelo TripleAnalysisForm (3→média)
   - `PurchaseDetail.tsx`: timeline de evidências coletadas (fotos, pesos, notas, análises)

### Etapas com checklist obrigatório
- Em Conferência: foto + confirmação de itens
- Cerâmico: Em Separação: foto
- Peças: Em Corte: foto + peso cerâmica extraída
- Peças: Em Trituração: peso + foto
- Cerâmico: Em Trituração/Homogeneização: peso + foto
- Cerâmico: Lab em Análise / Análise: 3 análises individuais → média
- Peças: Aprovado - Aguardando Pagamento: comprovante (opcional)

### Pendente (próximas iterações)
- Foto obrigatória no bag lacrado (etapa de alocação)
- Comparação automática de peso entre etapas (corte vs trituração)
- Configuração de thresholds de desvio nas Settings
- Tela de confirmação enriquecida na aprovação do demonstrativo
