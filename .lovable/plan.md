

# Foto obrigatória ao criar compra

## Problema
O usuário quer que ao criar uma compra, seja obrigatório tirar/enviar pelo menos uma foto do material antes de confirmar, independente do tipo de material.

## Alterações

### `src/components/purchases/NewPurchaseDialog.tsx`

1. **Adicionar state para fotos**: `const [photos, setPhotos] = useState<string[]>([])` para URLs das fotos enviadas
2. **Importar** `PhotoCapture` (já existe em `src/components/processes/PhotoCapture.tsx`) e `Camera`/`Image` icons
3. **Adicionar seção de foto** após o campo "Boleto Syge" e antes de "Material a Classificar":
   - Label "Foto do material recebido *"
   - Componente `PhotoCapture` para upload/câmera
   - Lista de thumbnails das fotos já enviadas (com botão de remover)
   - Indicador visual se nenhuma foto foi enviada
4. **Bloquear o botão "Criar Compra"**: adicionar `photos.length === 0` à condição `disabled` do botão de confirmação
5. **Salvar as fotos como evidência**: no `handleConfirm`, após criar a compra, salvar cada foto como `stage_evidence` com `task_key: "photo_recebimento_compra"` e `stage: "Recebimento"`
6. **Reset**: limpar `photos` ao abrir/fechar o dialog

### Problema do `purchaseId` para upload

O `PhotoCapture` precisa de um `purchaseId` para fazer upload no storage (path `{purchaseId}/...`). Na criação, o ID ainda não existe. Solução: usar um ID temporário (`crypto.randomUUID()`) para o path do storage e depois associar ao pedido via `stage_evidence`.

Alternativamente, fazer upload com um prefixo temporário (`temp/{uuid}/...`) e após criar a compra, salvar as evidências com o ID real.

### Fluxo
1. Usuário abre dialog de nova compra
2. Tira/envia foto(s) — upload vai para storage com path temporário
3. Preenche fornecedor, itens etc.
4. Botão "Criar Compra" só habilita se há pelo menos 1 foto + fornecedor + itens
5. Ao confirmar, cria a compra e registra as fotos como `stage_evidence`

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/components/purchases/NewPurchaseDialog.tsx` | Seção de foto, state, validação, salvar evidências após criação |

