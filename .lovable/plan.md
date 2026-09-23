# Controle de Hedge (histórico de cotações)

## Problema
Hoje as cotações (Pt, Pd, Rh e câmbio) ficam em um único registro nas Configurações. Toda precificação lê o valor atual, então quando você troca a cotação, as compras que já deram entrada e ainda não terminaram também mudam.

## Como vai funcionar
1. **Nova aba "Hedge" em Configurações**
   - Lista de hedges com: nome/código, data de início, data de fim, cotações Pt/Pd/Rh (USD/ozt), câmbio USD→BRL e a quantidade contratada de cada metal (ozt).
   - Mostra o **saldo** de cada metal: contratado − consumido pelas compras vinculadas, com barra de uso e alerta quando passar de 90% ou estourar.
   - Apenas um hedge vigente por dia (o sistema impede datas sobrepostas). Ao criar um novo, o anterior é encerrado automaticamente no dia anterior.
   - Um hedge com compras vinculadas não pode ser apagado, só encerrado.
   - Os campos de cotação do card "Cotações dos Metais" deixam de ser editáveis ali e passam a mostrar o hedge vigente (os demais custos continuam como estão).

2. **Vínculo da compra ao hedge pela data de entrada**
   - Ao criar a compra, ela recebe o hedge vigente naquela data e fica presa a ele até o fim.
   - Todas as precificações (Cerâmico, Peças, Peça em Sacola, peças separadas, alocação e demonstrativo/PDF) usam as cotações do hedge da compra, não mais a cotação atual.
   - A calculadora avulsa continua usando o hedge vigente do dia.

3. **Consumo de metal**
   - Quando a compra é aprovada, as onças pagáveis de Pt/Pd/Rh calculadas entram no consumo do hedge dela. Se a compra voltar etapas, o consumo é retirado até nova aprovação.
   - Tela de detalhe do hedge lista as compras vinculadas e o metal de cada uma.

4. **Troca de hedge na precificação (controlada)**
   - Botão discreto "Trocar hedge" no painel de precificação, visível só para perfis com a nova permissão "Trocar hedge da compra" (configurável em Permissões).
   - Exige escolher outro hedge da lista (não digitar cotação livre) e escrever uma justificativa obrigatória.
   - Cada troca fica gravada em histórico (quem, quando, de qual para qual, motivo) e aparece no detalhe da compra.

5. **Compras já existentes**
   - Crio um hedge "Anterior" com as cotações atuais (Pt 1750, Pd 1265, Rh 8950, câmbio 5,15) com início em 02/09/2026 e fim hoje, e vinculo todas as compras atuais a ele.
   - Você cadastra o novo hedge com início amanhã; as compras de amanhã em diante já entram nele.
   - Se quiser, depois você pode dividir o "Anterior" em hedges históricos com as datas reais e eu revinculo as compras por data.

## Detalhes técnicos
- Tabela `hedges` (name, start_date, end_date, pt/pd/rh_price, usd_to_brl, pt/pd/rh_oz_contracted, notes, created_by) com trigger de validação contra sobreposição de datas; GRANT + RLS usando `user_can_do(..., 'configuracoes')` para escrita e leitura para autenticados.
- `purchases.hedge_id` (FK) preenchido por trigger no INSERT pela data da compra; backfill para as compras atuais.
- Tabela `hedge_consumption` (hedge_id, purchase_id, pt/pd/rh_oz) gravada na aprovação e removida na reversão; view/consulta de saldo.
- Tabela `hedge_change_log` (purchase_id, from/to hedge, justification, changed_by) só-inserção.
- Nova ação de permissão `trocar_hedge` no módulo `processos`.
- `src/lib/hedges.ts` com `getHedgeForPurchase(purchase)` que retorna `Settings` com as cotações do hedge sobrepostas; substituir `loadSettings()` nos painéis de precificação, `purchases.ts`, `separated-pieces-value.ts`, `AllocationPanel` e na função de PDF do demonstrativo.
