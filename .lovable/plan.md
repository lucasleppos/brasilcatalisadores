

# Plano: Contestação com escolha de destino

## Problema
O botão "Contestar" não funciona (passa `purchase.id` em vez do ID do demonstrativo) e não oferece opção de escolher para onde devolver o processo.

## Solução

### 1. Corrigir `handleContest` — usar ID correto do demonstrativo
Importar `loadDemonstrativos` e buscar o último demonstrativo da compra para obter o `id` correto.

### 2. Adicionar diálogo de escolha de destino após contestação

Substituir o AlertDialog atual de contestação por um Dialog com duas etapas:
- **Etapa 1**: Campo de motivo da contestação (textarea) + botão "Contestar"
- **Etapa 2**: Após confirmar, exibir opções de destino com cards clicáveis:

```text
┌──────────────────────────────────────────┐
│  ⚠️ Para onde devolver o processo?        │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ 🔬 Voltar para Análise             │  │
│  │ Reabrirá a etapa de laboratório    │  │
│  │ para registrar novos resultados    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ 📦 Voltar para Conferência         │  │
│  │ Reabrirá a conferência para        │  │
│  │ verificar pesos ou materiais       │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [Cancelar]                              │
└──────────────────────────────────────────┘
```

### 3. Lógica de destino por fluxo

Ao clicar em uma opção, atualizar o status da compra:

| Fluxo | Destino "Análise" | Destino "Conferência" |
|---|---|---|
| Cerâmico | `Cerâmico: Lab em Análise` | `Em Conferência` |
| Peças (sacola) | `Peças: Laboratório` | `Em Conferência` |
| Peças (normal) | `Peças: Trituração e Amostragem` | `Em Conferência` |

Também registrar entrada no `status_history` com o motivo da contestação.

### 4. Implementação

Criar um estado `contestStep` ("motivo" | "destino") no componente. Ao confirmar o motivo, chama `contestDemonstrativo(latest.id, motivo)` e avança para step "destino". Ao escolher o destino, atualiza o status da compra via `supabase.from("purchases").update(...)` e chama `onCompleted()`.

## Arquivos editados

| Arquivo | Acao |
|---|---|
| `src/components/processes/StageActionCard.tsx` | Refatorar bloco de contestação: corrigir ID, adicionar diálogo com 2 etapas (motivo + destino) |

