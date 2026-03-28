

# Trava: Exigir "Boleto Syge" preenchido antes de Aprovar/Gerar Demonstrativo

## Problema
Atualmente é possível aprovar um demonstrativo e gerar o PDF mesmo quando o campo "Boleto Syge" (`erpNumber`) está vazio. Isso não deveria ser permitido.

## Solução

### Arquivo: `src/components/processes/StageActionCard.tsx`

1. **Criar flag de bloqueio**: Adicionar uma variável `missingErp` que verifica se `purchase.erpNumber` está vazio/em branco.

2. **Bloquear ações na etapa de Aprovação (`isDemonstrative`)**: Desabilitar os botões "PDF", "WhatsApp", "Aprovar" e "Contestar" quando `missingErp` for true.

3. **Exibir aviso visual**: Quando `missingErp`, mostrar um alerta em vermelho acima dos botões indicando que o campo "Boleto Syge" precisa ser preenchido antes de continuar.

4. **Aplicar a mesma trava na etapa de Precificação (`isPiecePricing`)**: Bloquear a geração do demonstrativo e avanço se o campo estiver vazio.

### Detalhe técnico
```typescript
const missingErp = !purchase.erpNumber?.trim();
```
- Nos botões relevantes: adicionar `disabled={loading || missingErp}`
- Mensagem de aviso: `"Preencha o campo 'Boleto Syge' na compra antes de prosseguir."`

Nenhuma alteração de banco de dados necessária — apenas validação no frontend.

