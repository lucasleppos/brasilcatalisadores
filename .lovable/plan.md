
# Módulo Catálogo de Peças + Peso Real por Item

## Status: ✅ Implementado

### O que foi feito

1. **Banco de dados**
   - Tabela `catalog_groups` (nome + margem %)
   - Tabela `catalog_parts` (marca, carro, código, referência, peso, PPMs, grupo)
   - 3 colunas em `purchase_items`: `catalog_part_id`, `weight_real`, `weight_loss`
   - RLS com módulo `catalogo`

2. **Módulo Catálogo (`/catalogo`)**
   - Página com tabela, busca e filtro por grupo
   - CRUD de peças (criar, editar, deletar)
   - Importação via Excel com mapeamento de colunas
   - Gerenciador de Grupos com margem %

3. **Integração na Compra**
   - Campo de busca de peças do catálogo no tipo "Peça"
   - Ao selecionar: auto-preenche peso, PPMs, calcula valor com margem do grupo
   - Campo de valor editável (pode ser sobrescrito)
   - `catalogPartId` vinculado ao item

4. **Peso Real por Item**
   - Função `registerItemRealWeight` para registrar peso real após manuseio
   - PurchaseDetail exibe colunas "Peso Real" e "Perda" por item
   - Resumo totalizado: peso catálogo vs real vs perda (kg e %)

### Pendente (próximas iterações)
- UI de registro de peso real por item no StageActionCard (etapa de conferência)
- Permissão `catalogo` precisa ser configurada no módulo de Permissões
