## Objetivo

Na tela **Conferência — Peças** (`SacolaConferenciaPanel.tsx`):

1. Ao selecionar uma peça no catálogo, preencher automaticamente o campo de peso com o peso cadastrado no catálogo (editável pelo operador).
2. Deixar claro o que é **Código** e o que é **Referência** na peça selecionada e na lista de peças conferidas.

## Alterações

### 1. Peso automático
- No `handlePartSelect`, além de guardar a peça, preencher `weight` com o peso do catálogo formatado no padrão brasileiro (ex.: `1,000`).
- O campo continua editável; se o operador limpar/alterar, vale o valor digitado.
- Ao remover a seleção (após adicionar a peça), o campo volta a ficar vazio, como hoje.
- Rótulo do campo passa de "Peso líquido (kg)" para **"Peso (kg)"** com a dica "sugerido pelo catálogo" quando veio preenchido automaticamente.

### 2. Identificação Código / Referência

Peça selecionada (abaixo da busca) — de:

```text
✓ 810295 — JEEP GRAND CHEROKEE
```

para:

```text
✓ Peça selecionada
  Código: 52090492AB
  Referência: 810295
  Marca/Veículo: JEEP GRAND CHEROKEE
  Peso catálogo: 1,000 kg
```

Card da lista "Peças Conferidas" — de:

```text
#1 — 52090492AB
✓ 810295
1,000 kg
```

para:

```text
#1
Código: 52090492AB
Referência: 810295            (✓ verde = achada no catálogo)
Peso: 1,000 kg
```

Quando a peça for digitada manualmente (fora do catálogo), mostra `Código: <digitado>` e o aviso âmbar "Não encontrada no catálogo", sem linha de Referência.

- Também ajustar os resultados do dropdown de busca (`PartSearch.tsx`) para prefixar `Cód.` e `Ref.`, mantendo o mesmo entendimento na busca.

## Notas técnicas

- Nenhuma mudança de banco: `catalog_parts.weight` já existe e já é carregado em `CatalogPart.weight`.
- É preciso guardar a referência da peça no estado local (`reference`) para exibir código e referência separadamente na lista; ao recarregar itens salvos, o `loadExistingPieces` já busca `code` e `reference` do catálogo.
