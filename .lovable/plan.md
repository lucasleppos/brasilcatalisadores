# Plano: Ajuste da Etiqueta Térmica de Cerâmico

## Objetivo
Simplificar a etiqueta térmica gerada na conferência de material cerâmico, removendo a sequência numérica confusa e a informação de tara, e imprimir 3 etiquetas idênticas por grupo.

## Decisões do usuário
- **Sequência**: não exibir `01`, `02`, `03` na etiqueta; manter unicidade apenas no backend.
- **Tara**: remover completamente da conferência e da etiqueta.
- **Quantidade**: imprimir **3 etiquetas idênticas por grupo** de material.
- **Prévia**: gerar prévia visual antes de implementar no código.

## Etapas

### 1. Prévia visual da nova etiqueta
- Gerar prévia estática (100×50 mm) com os dados de exemplo:
  - Código: `LOT-260707-01` (sem sequência final)
  - Comprador: Marcos
  - Fornecedor: Cleusa de Fatima
  - Grupo: Grupo 01
  - Peso Líq.: 8,000 kg
  - QR Code na lateral apontando para o lote específico
- Apresentar para aprovação antes de prosseguir.

### 2. Código do lote (`src/lib/labels.ts`)
- Criar `buildLabelCodeDisplay` retornando código sem sequência (`LOT-260707-01`).
- Manter identificador único interno por grupo para o QR code e rastreabilidade no banco.

### 3. Remover tara da conferência (`CeramicoConferenciaPanel.tsx`)
- Remover campo "Tara (kg)" do formulário.
- Remover exibição de tara na lista de lotes.
- Ajustar cálculo de saldo/tolerância para `bulkWeight - sum(weightNet)`.
- Zerar `weight_loss` ao persistir em `purchase_items`.

### 4. Layout da etiqueta (`CeramicoLabelPrint.tsx`)
- Remover linha "Tara".
- Ampliar peso líquido para ocupar o espaço, mantendo leitura grande e legível.
- Cabeçalho exibe apenas o código sem sequência.
- Manter QR code na lateral apontando para o identificador único interno.

### 5. Imprimir 3 etiquetas idênticas por grupo
- Ajustar `handlePrintOne` para expandir o lote em **3 cópias idênticas** antes de enviar para `CeramicoLabelPrint`.
- Ajustar `handlePrintAll` para gerar 3 cópias por grupo, mantendo a ordem (Grupo A × 3, Grupo B × 3, ...).
- Cada cópia é uma página impressa separada (100×50 mm), preservando `page-break-after` já existente.
- Atualizar contadores/labels do botão se necessário (ex: "Imprimir Etiquetas (N grupos × 3)").

### 6. Verificação
- Ajustar tipo `LabelData` (remover `tare`).
- Rodar typecheck (`tsgo`).

## Arquivos envolvidos
- `src/lib/labels.ts`
- `src/components/processes/CeramicoConferenciaPanel.tsx`
- `src/components/processes/CeramicoLabelPrint.tsx`

## Notas
- A sequência numérica deixa de ser visível, mas continua rastreável internamente via QR code.
- 3 etiquetas idênticas por grupo permitem afixar em múltiplos pontos do lote físico.