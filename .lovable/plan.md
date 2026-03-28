

# Limpar todas as compras para reiniciar testes

Existem **9 compras** no banco. Para limpar completamente, preciso deletar dados de todas as tabelas relacionadas na ordem correta (dependências primeiro):

## Tabelas a limpar (nesta ordem)

1. `bag_items` — itens alocados em bags referenciando compras
2. `lab_analyses` — análises laboratoriais
3. `lab_results` — resultados de lab
4. `demonstrativos` — demonstrativos gerados
5. `stage_evidence` — evidências/fotos de etapas
6. `purchase_items` — itens das compras
7. `purchases` — as compras em si

## Execução

Um único script SQL com DELETEs em cascata para todas as tabelas acima. Os bags em si (tabela `bags`) serão mantidos, apenas os `bag_items` vinculados serão removidos.

