## Objetivo
Na etapa **Cerâmico — Laboratório**, permitir **até 3 linhas de análise por lote** (Pt/Pd/Rh em PPM). O sistema calcula automaticamente a **média simples** das linhas preenchidas e usa como resultado do lote.

## Comportamento

Para cada lote conferido:
- Exibir **3 linhas** de inputs (Análise 1, 2, 3) com Pt/Pd/Rh.
- **Sem botão por linha** — basta preencher os 3 campos (Pt/Pd/Rh) de uma linha para ela contar.
- **Análise 1 obrigatória**; 2 e 3 opcionais. Uma linha é válida quando os 3 campos estão preenchidos com número; linha parcial é ignorada.
- Bloco **Média** (Pt/Pd/Rh) exibido em tempo real assim que ≥ 1 linha estiver completa:
  - 1 linha → média = a própria linha
  - 2 linhas → média simples das 2
  - 3 linhas → média simples das 3
- Um único botão **Salvar Lote** por lote persiste todas as linhas válidas de uma vez (ou salvamento automático com debounce ao sair do campo — decisão de implementação: usar **salvamento no blur/onBlur** por linha completa, para evitar cliques extras, mantendo consistência com o pedido do usuário).
- Lote conta como **"Registrado"** (verde) quando tem ≥ 1 linha válida salva. Progresso `savedCount/total` e botão **Encerrar** seguem a mesma lógica.

## Persistência

Reutilizar `lab_results` (já tem `versao` e `purchase_item_id`):
- 1 registro por linha válida, `versao ∈ {1,2,3}`.
- Upsert por (`purchase_item_id`, `versao`): insert se novo, update se existente.
- Se o usuário limpar uma linha antes salva, deletar aquele `versao`.
- Média **não persiste** — recalculada a partir das linhas.

Sem migração de schema.

## Arquivos afetados

- `src/components/processes/CeramicoLabPanel.tsx` — estado por lote passa a array de 3 slots; render sem botão por linha; auto-save no blur quando linha completa; cálculo/exibição da média; delete quando linha limpa.
- `src/components/processes/CeramicoPricingPanel.tsx` e demais consumidores de `lab_results` do item cerâmico — usar a **média** das versões existentes por `purchase_item_id`.
- `src/lib/lab-results.ts` — se necessário, adicionar helper `getAverageByItem(purchaseId)` retornando `{itemId → {pt,pd,rh}}` já com média.

## Detalhes técnicos

- Inputs: `type='text'` + `inputMode='decimal'` + `parseNum` (vírgula decimal).
- Exibição: `fmtNum(v, 4)`.
- Layout compacto: 3 linhas empilhadas por lote (Análise 1/2/3 com badge quando salva), bloco Média destacado abaixo com "Média de N análise(s)".
- Sem regra de desvio máximo (diferente do `TripleAnalysisForm` de peças).

## Verificação

- `tsgo` typecheck.
- Preencher 1, 2 e 3 linhas em lotes distintos; confirmar média em tempo real, persistência no reload e valores propagados à precificação.
