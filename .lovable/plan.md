

# Edge Function: Geração de PDF do Demonstrativo

## Objetivo
Criar uma edge function que gera um PDF com os dados do demonstrativo (pedido, itens, valores, PPMs) para envio ao fornecedor via WhatsApp.

## Abordagem Técnica

Usar **HTML → PDF** via a biblioteca `jspdf` disponível no npm (compatível com Deno via `npm:` specifier). A edge function recebe o `purchaseId` e `demonstrativoId`, consulta todos os dados necessários no banco, monta um PDF formatado e retorna como blob para download.

## Edge Function: `supabase/functions/generate-demonstrativo-pdf/index.ts`

### Entrada
```json
{ "purchaseId": "uuid", "demonstrativoId": "uuid" }
```

### Dados consultados no banco (via service role):
- `purchases` + `purchase_items` — fornecedor, número, data, itens, pesos, valores
- `demonstrativos` — versão, valor total, data envio
- `lab_results` — PPMs (se cerâmico)
- `settings` — cotações usadas no cálculo

### PDF gerado com:
- Cabeçalho: "Demonstrativo de Valores" + logo/empresa
- Info do fornecedor e número do pedido
- Tabela de itens (tipo, quantidade, peso, valor unitário, valor total)
- Se cerâmico: seção com PPMs (Pt, Pd, Rh) e cálculo detalhado
- Valor total do demonstrativo
- Versão e data
- Rodapé com observações

### Resposta
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="demonstrativo-{purchaseNumber}-v{versao}.pdf"`

## Config
Adicionar ao `supabase/config.toml`:
```toml
[functions.generate-demonstrativo-pdf]
verify_jwt = false
```

## Frontend: Botão "Gerar PDF"

Adicionar botão na `StageActionCard.tsx` (nos estados de demonstrativo) e no `PurchaseDetail.tsx` (seção de demonstrativos) que:
1. Chama `supabase.functions.invoke("generate-demonstrativo-pdf", { body: { purchaseId, demonstrativoId } })`
2. Recebe o blob PDF
3. Abre em nova aba ou faz download automático
4. Botão secundário "Compartilhar via WhatsApp" que gera link `https://wa.me/?text=...` com mensagem + link do PDF (ou instrução para anexar)

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `supabase/functions/generate-demonstrativo-pdf/index.ts` | Novo |
| `supabase/config.toml` | Adicionar config da function |
| `src/components/processes/StageActionCard.tsx` | Botão "Gerar PDF" nos estados de demonstrativo |
| `src/components/purchases/PurchaseDetail.tsx` | Botão PDF na seção de demonstrativos |
| `src/lib/demonstrativos.ts` | Função `generateDemonstrativoPdf()` helper |

