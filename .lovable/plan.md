## Ajuste na etapa de Aprovação

Na etapa de Aprovação, apenas o botão **Aprovar** ficará bloqueado enquanto o Boleto Syge não for informado. Os botões **Visualizar**, **PDF** e **Contestar** ficarão sempre ativos (respeitando apenas o estado de `loading`).

### Alteração pontual

Arquivo: `src/components/processes/StageActionCard.tsx` — branch da etapa de Aprovação (linhas ~420–492).

- **Linha 436 (Visualizar)**: remover `|| missingErp` do `disabled` → `disabled={loading}`.
- **Linha 439 (PDF)**: remover `|| missingErp` do `disabled` → `disabled={loading}`.
- **Linha 491 (Contestar)**: remover `|| missingErp` do `disabled` → `disabled={loading}`.
- **Linha 460 (Aprovar)**: mantém `disabled={loading || missingErp}` — continua bloqueado até o Syge ser preenchido.
- O bloco `{missingErp && ErpInlineInput}` (linha 421) permanece visível como aviso/entrada do número Syge.

Fora do escopo: nenhuma outra etapa é alterada, nenhuma lógica de negócio, PDF ou cálculo é modificada.
