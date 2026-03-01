

# Aba "Alocar Material" - Lista Inline com Materiais

## Resumo

Transformar a aba "Alocar Material" de um simples botao que abre um dialog para uma interface completa com duas listas:

1. **Lista principal**: Materiais prontos para alocacao (status "Enviado ao Bag"), cada um com detalhes e botao direto de "Alocar ao Bag"
2. **Lista secundaria**: Materiais em processo mas proximos de finalizar (status "Amostragem", "Analise", "Aprovacao do Fornecedor", "Pagamento"), para visao antecipada

## Detalhes da Implementacao

### Nova componente: `src/components/bags/AllocationPanel.tsx`

Substitui o conteudo atual da aba "Alocar Material" no `BagsPage.tsx`.

**Secao 1 - "Materiais Disponiveis para Alocacao"**
- Tabela/lista com colunas: Fornecedor, Tipo, Peso (kg), Valor Pago (R$), PPMs (Pt/Pd/Rh), Botao "Alocar"
- Fonte: compras com status "Enviado ao Bag" ou "Exportacao/Venda", location = "matriz", cujos itens ainda nao foram alocados a nenhum bag
- Ao clicar "Alocar": abre um mini-dialog ou popover para selecionar o bag destino (somente bags abertos), com validacao de peso
- Manter a logica de alerta de peso (margem de 5%) ja existente no `AllocateMaterialDialog`

**Secao 2 - "Materiais em Processo (Proximos)"**
- Tabela/lista com colunas: Fornecedor, Tipo, Peso (kg), Valor (R$), Status Atual
- Fonte: compras com status entre "Amostragem" e "Pagamento" (os 4 status anteriores a "Enviado ao Bag"), location = "matriz"
- Somente leitura, sem botao de alocar (ainda nao estao prontos)
- Badge colorido com o status atual de cada lote

### Arquivos a modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/bags/AllocationPanel.tsx` | Novo componente com as duas listas |
| `src/pages/BagsPage.tsx` | Substituir conteudo da aba "Alocar" pelo AllocationPanel, remover o botao isolado |
| `src/components/bags/AllocateMaterialDialog.tsx` | Adaptar para receber um material pre-selecionado (so escolher o bag destino) |

### Secao Tecnica

- A query de materiais disponiveis ja existe no `AllocateMaterialDialog.loadAvailableMaterials()` - sera reutilizada/movida para o `AllocationPanel`
- Para materiais proximos, nova query filtrando `status IN ('Amostragem', 'Analise', 'Aprovacao do Fornecedor', 'Pagamento')` e `location = 'matriz'`
- O dialog de alocacao sera simplificado: ao clicar "Alocar" em um material, o dialog abre ja com o material selecionado e so pede para escolher o bag destino
- As validacoes de peso (isNearLimit, isOverWeight) continuam iguais

