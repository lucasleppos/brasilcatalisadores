# Modulo de Bags de Exportacao

## Resumo

Criar o modulo completo de Bags com 3 areas principais + controle financeiro e comparativo de analise:

1. **Gestao de Bags** - criar, visualizar e fechar bags de exportacao
2. **Alocacao de Materiais** - alocar materiais processados aos bags seguindo regras de tipo/comprador/peso
3. **Estoque Filiais** - controlar material comprado em filiais aguardando transferencia para a matriz
4. **Financeiro e Analise** - rastrear valores pagos e comparar resultados de analise

---

## Regras de Negocio

### Peso e Alocacao

- Limite de peso por bag: ~1000kg com margem de 5% (alerta ao ultrapassar, pedindo confirmacao)
- Bags agrupados por **comprador/filial** + **tipo de material** (Super, Pecas, Medio, Diesel)
- Quando um bag atinge o limite, inicia-se um novo bag para o restante
- Materiais so podem ser alocados apos completar o processo produtivo

### Hierarquia de Bags

- Ordem de qualidade: Super > Pecas > Medio > Diesel
- Bags Super: somente compradores TV e Marcos
- Diesel: SEMPRE vai para o bag "Brasil Diesel", independente do comprador
- Filiais com bag proprio: Bahia (medio), Minas Gerais (pecas + medio), Rio de Janeiro (medio)
- Filiais sem bag proprio (material vai para bag Brasil): Jaboatao, Fortaleza, Teresina, Goiania, Ribeirao Preto, Curitiba, Portao, Palhoca, Manaus, Belem, Ibipora
- Excecao: se o comprador de uma filial sem bag proprio for TV ou Marcos, o material vai para o bag do comprador
- Bags de cliente/fornecedor: podem ser criados avulsos fora das regras padrao

### Transferencia de Filiais

- Compras de filiais entram com status "Pendente de Transferencia"
- Podem ser marcadas como "Em Transito" e depois "Recebido na Matriz"
- Ao receber na matriz, entram no fluxo produtivo normal

---

## Controle Financeiro por Bag

Cada bag tera um painel financeiro detalhado:

- **Valor total pago**: soma dos valores pagos por todos os materiais alocados ao bag
- **Valor por fornecedor**: quanto foi pago a cada fornecedor dentro do bag
- **Custo medio por kg**: valor total pago dividido pelo peso total do bag
- **Detalhamento por item**: lista de cada material com fornecedor, peso, valor pago e PPMs

## Comparativo de Analise

Ao fechar um bag, os resultados de analise do refinador serao registrados para comparacao:

- **PPMs do nosso laboratório** (Pt, Pd, Rh): analise do nosso laboratório, feita para dar base de preço e quantidade de metal a ser usada para exportação desse bag, chamamos essa analise de "PROVISIONAL ASSAY".
- **PPMs do refinador** (Pt, Pd, Rh): valores recebidos do laboratorio de analise do nosso cliente, comparando com o nosso provisional assay, chamamos esse dado de "FINAL ASSAY" esse resultado é enviado pelo cliente após a analise dele, que demora em média 120 dias.
- **PPMs estimados**: media ponderada dos PPMs dos itens alocados (calculados na compra)
- **Variacao percentual**: diferenca entre estimado e real para cada metal
- **Valor estimado vs valor real**: comparacao do valor calculado internamente vs valor do refinador
- **Indicadores visuais**: badges verde/vermelho para indicar se o resultado ficou acima ou abaixo do esperado

---

## Estrutura do Banco de Dados

### Tabela `bags`


| Coluna              | Tipo        | Descricao                                         |
| ------------------- | ----------- | ------------------------------------------------- |
| id                  | uuid        | PK                                                |
| bag_number          | text        | Ex: "BAG-001"                                     |
| bag_label           | text        | Nome descritivo (ex: "TV Super", "Brasil Diesel") |
| status              | text        | Aberto, Fechado, Exportado                        |
| material_type       | text        | super, pecas, medio, diesel, cliente              |
| buyer               | text        | Comprador ou filial responsavel                   |
| total_weight        | numeric     | Peso acumulado atual                              |
| max_weight          | numeric     | Limite (default 1000)                             |
| total_paid_brl      | numeric     | Valor total pago pelos materiais                  |
| refiner_pt_ppm      | numeric     | PPM Pt do refinador (preenchido pos-analise)      |
| refiner_pd_ppm      | numeric     | PPM Pd do refinador                               |
| refiner_rh_ppm      | numeric     | PPM Rh do refinador                               |
| refiner_total_value | numeric     | Valor total informado pelo refinador              |
| notes               | text        | Observacoes                                       |
| created_at          | timestamptz | &nbsp;                                            |
| closed_at           | timestamptz | &nbsp;                                            |


### Tabela `bag_items`


| Coluna           | Tipo        | Descricao                           |
| ---------------- | ----------- | ----------------------------------- |
| id               | uuid        | PK                                  |
| bag_id           | uuid        | FK para bags                        |
| purchase_id      | uuid        | FK para purchases                   |
| purchase_item_id | text        | Referencia ao item da compra        |
| weight           | numeric     | Peso alocado                        |
| paid_value       | numeric     | Valor pago por este material        |
| estimated_pt_ppm | numeric     | PPM Pt estimado                     |
| estimated_pd_ppm | numeric     | PPM Pd estimado                     |
| estimated_rh_ppm | numeric     | PPM Rh estimado                     |
| supplier_name    | text        | Nome do fornecedor (desnormalizado) |
| allocated_at     | timestamptz | &nbsp;                              |


### Alteracao na tabela `purchases`

- Adicionar coluna `location` (text, default 'matriz')
- Adicionar coluna `transfer_status` (text, nullable) - pendente, em_transito, recebido

### Funcao SQL

- `generate_bag_number()` - gera numero sequencial para bags

---

## Implementacao Frontend

### Pagina principal (`src/pages/BagsPage.tsx`) - 4 abas

**Aba "Bags"**

- Lista de bags com cards: numero, label, status (badge), tipo, comprador, peso atual/maximo (barra de progresso), valor total pago
- Filtros por status, comprador, tipo
- Botao "Novo Bag" (dialog com nome, tipo, comprador, peso maximo)

**Aba "Alocar Material"**

- Lista de materiais disponiveis (compras finalizadas, na matriz, nao alocados)
- Selecionar material e bag destino
- Validacao em tempo real: tipo compativel, comprador correto, peso com alerta se ultrapassar 1050kg
- Sugestao automatica de bag baseada nas regras

**Aba "Estoque Filiais"**

- Lista de compras de filiais com status de transferencia
- Botoes "Marcar em Transito" e "Recebido na Matriz"
- Contadores por filial

**Aba "Financeiro e Analise"**

- Selecionar um bag fechado/exportado
- Painel com: valor total pago, custo medio/kg, valor por fornecedor
- Secao de resultados do refinador (inputs para PPMs e valor)
- Tabela comparativa: PPM estimado vs real com variacao %
- Valor estimado vs valor real com indicadores visuais

### Componentes


| Arquivo                                          | Descricao                                   |
| ------------------------------------------------ | ------------------------------------------- |
| `src/pages/BagsPage.tsx`                         | Pagina principal com 4 abas                 |
| `src/lib/bags.ts`                                | Tipos, CRUD, logica de alocacao e validacao |
| `src/components/bags/BagCard.tsx`                | Card resumo com progresso                   |
| `src/components/bags/BagDetail.tsx`              | Detalhe com itens e financeiro              |
| `src/components/bags/NewBagDialog.tsx`           | Criacao de novo bag                         |
| `src/components/bags/AllocateMaterialDialog.tsx` | Alocacao com validacao                      |
| `src/components/bags/BranchStockList.tsx`        | Controle de transferencias                  |
| `src/components/bags/BagAnalysisPanel.tsx`       | Comparativo de analise e financeiro         |


### Alteracoes em arquivos existentes


| Arquivo                         | Alteracao                                        |
| ------------------------------- | ------------------------------------------------ |
| `src/App.tsx`                   | Rota `/bags` apontando para BagsPage             |
| `src/components/AppSidebar.tsx` | Atualizar item Bags (ja existe como placeholder) |
| `src/lib/purchases.ts`          | Adicionar suporte a location e transfer_status   |
