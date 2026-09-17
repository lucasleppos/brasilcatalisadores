# Flex / Carbono passa da Conferência para o Laboratório

## Conferência — Peça em Sacola

- Os botões **Flex / Carbono** saem da tela: nem no bloco "Adicionar Peça", nem nas peças já adicionadas.
- Nada mais muda ali: peso pesado, comparação com o catálogo, separar do fluxo e devoluções continuam iguais.

## Laboratório — Peça em Sacola

- Em cada peça, **depois** dos campos Pt / Pd / Rh, aparece a escolha **Material: Flex | Carbono**.
- A escolha vem **em branco** e é **obrigatória**: o botão "Salvar Análise" só fica disponível com Pt, Pd, Rh preenchidos **e** o material escolhido.
- Peças já salvas mostram a marcação e permitem trocar (ao trocar, a peça volta ao estado "não salva" até salvar de novo).
- Encerrar a etapa continua exigindo todas as peças salvas — logo, todas terão marcação.

## Alocação no Bag

Sem mudança de comportamento: a tela **Alocar Material** continua mostrando até **2 linhas** por OP de Peça em Sacola — uma somando as peças **Flex** e outra as **Carbono** —, com peso, valor e Pt/Pd/Rh (média ponderada) de cada grupo, alocação independente e a coluna Carbono exibindo Flex ou Carbono. A diferença é que a marcação agora vem do Laboratório.

## Compras antigas

Como a escolha passa a ser exclusiva do Laboratório, as compras de Peça em Sacola já conferidas que ainda não passaram pelo Laboratório terão a marcação em branco e precisarão escolher lá. Compras já com marcação salva continuam funcionando na alocação.

## Detalhes técnicos

- `src/components/processes/SacolaConferenciaPanel.tsx`: remover `newKind`, `setMaterialKind`, o seletor no formulário e na lista, e o campo `material_kind` do insert em `persistPieces` (passa a gravar `null`). Manter o tipo `ConferenciaPiece` sem `materialKind`.
- `src/components/processes/SacolaLabPanel.tsx`: incluir `material_kind` no `select` de `purchase_items`, novo campo `materialKind: "flex" | "carbono" | null` em `LabPiece`, seletor de dois botões após o grid de PPM, `disabled` do Salvar exigindo `materialKind`, e no `handleSavePiece` gravar `material_kind` em `purchase_items` (update por `piece.itemId`) junto com o insert/update em `lab_results`.
- `src/components/bags/AllocationPanel.tsx` e `AllocateMaterialDialog.tsx`: sem alteração (já agregam por `material_kind`).
- Sem migração, sem mudança de RLS, precificação, demonstrativo ou PDF.
