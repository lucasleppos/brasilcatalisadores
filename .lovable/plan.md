# Limpeza do banco para início definitivo de operação

Objetivo: zerar todos os dados de teste (compras, processos, fotos, catálogo de peças, lotes de filial) mantendo os cadastros base.

## O que será APAGADO

- Compras e itens de compra (36 compras, 148 itens)
- Demonstrativos (31)
- Resultados de laboratório, análises e histórico de alterações (27 + 28)
- Evidências das etapas (222 registros) e as fotos correspondentes no armazenamento
- Bags e materiais alocados (1 bag, 1 item)
- Lotes de transferência das filiais (3), conta corrente e fechamentos
- Log de alteração de preços (1)
- Histórico de simulações da calculadora (3)
- Peças do catálogo (1.250) — será substituído pela importação atualizada

## O que será MANTIDO

- Fornecedores (413)
- Filiais (14)
- Grupos do catálogo e suas margens (14)
- Usuários, perfis, papéis e permissões
- Configurações (cotações, custos, recuperação, etc.)

## Reinício das numerações

- Numeração de compras (`DDMMYY-NN`) e de bags (`BAG-001`) é calculada a partir dos registros existentes, então volta automaticamente ao início após a limpeza. Nenhuma ação extra necessária.

## Detalhes técnicos

1. Um único script de exclusão, executado na ordem das dependências: `bag_items` → `bags` → `lab_result_history` → `lab_results` → `lab_analyses` → `demonstrativos` → `stage_evidence` → `price_override_log` → `purchase_items` → `purchases` → `branch_ledger_entries` → `branch_settlements` → `branch_transfers` → `simulation_history` → `catalog_parts`.
2. Remoção dos arquivos do bucket privado `stage-photos` (fotos de embalagem/amostra dos testes).
3. Conferência final com contagem por tabela para confirmar que só restam os cadastros mantidos.

Nenhuma alteração de código ou de estrutura do banco é necessária — apenas remoção de dados.

## Atenção

Esta operação é irreversível: todo o histórico de testes desaparece. Após aprovação, prossigo com a limpeza e depois você pode importar o catálogo novo.
