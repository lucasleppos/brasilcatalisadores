

# Avaliação do Fluxo Cerâmico → Bags / Exportação

## Situação Atual

Após análise detalhada do código e dos dados no banco, o fluxo cerâmico **está corretamente configurado** após a correção anterior (linha 194 de `purchases.ts`). A compra cerâmica `29/03/2026 - 03` está no status `"Cerâmico: Gerar Boleto de Aprovação"` e ainda não foi aprovada — ou seja, a correção não foi testada.

### Fluxo esperado (correto no código):
```text
Cerâmico: Gerar Boleto de Aprovação
  → [Usuário clica "Aprovar"]
  → Cerâmico: Aprovado
    ├── fin_status = "Aguardando Pagamento"  → aba "Pagamento"
    └── op_status = "Alocando Bag"           → aba "Bags / Exportação"
```

O `ProcessBoard` já roteia compras em fase paralela para as abas corretas via `parallelMatch: "op"` e `parallelMatch: "fin"`.

## Problema Potencial Identificado

Se houver compras cerâmicas que foram aprovadas **antes** da correção (quando retornava `"Concluído"` em vez de `"Cerâmico: Aprovado"`), essas compras ficaram em `"Concluído"` sem `fin_status`/`op_status` e nunca passaram pelo Bags. Não há nenhuma nesse estado no momento, mas o risco existe.

## Melhorias Propostas

### 1. Garantir que o botão "Aprovar" no cerâmico mostre texto correto
Atualmente o botão diz "Confirmar e Encerrar" para cerâmicos (linha 454). Deveria dizer "Confirmar e Alocar ao Bag" já que agora entra em fase paralela.

### 2. Atualizar mensagem de aviso na aprovação
O aviso amarelo (linha 445-446) já diz "será registrado para pagamento e alocação ao Bag" — está correto.

### 3. Adicionar fallback de segurança
No `advanceStage`, adicionar log/verificação para garantir que ao avançar para `"Cerâmico: Aprovado"`, os sub-fluxos foram realmente inicializados.

## Arquivos a editar

| Arquivo | Alteração |
|---|---|
| `src/components/processes/StageActionCard.tsx` | Corrigir texto do botão "Confirmar e Encerrar" → "Confirmar e Alocar" para cerâmico |

Esta é uma correção pontual de texto. O fluxo lógico já funciona — basta testar aprovando a compra cerâmica `29/03/2026 - 03` que está aguardando na aba "Aprovação".

