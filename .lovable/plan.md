# Fase 2: Modulos de Compras, Fornecedores e Processos

## Resumo

Criar tres novos modulos para o sistema, todos com dados em localStorage (seguindo a estrategia atual do prototipo):

1. **Compras** (antigo "Lotes") -- registrar compras agrupando cotacoes, vinculando a um fornecedor
2. **Fornecedores** -- cadastro com importacao de Excel, mas também com a possibilidade de criar um novo cadastro a partir de um botão de novo cadastro.
3. **Processos** -- visao macro do andamento de todas as compras nas etapas de producao, servirá para visualização de PCP (**Status de Ordem de Produção, Monitoramento de Estoque, Comparativo Meta x Produção Real, Eficiência da Produção (OEE))**

---

## 1. Renomear "Lotes" para "Compras"

- Alterar o menu da sidebar: titulo "Compras", manter icone `Package`, rota `/compras`
- Atualizar `App.tsx` com a nova rota

---

## 2. Modulo de Fornecedores (`/fornecedores`)

### Dados do cadastro

- Nome, CNPJ/CPF, E-mail, Filial, Comprador, Margem (%)

### Funcionalidades

- Listagem em tabela com busca/filtro
- Formulario de cadastro/edicao (dialog modal)
- Exclusao com confirmacao
- **Importacao de Excel**: botao para upload de arquivo `.xlsx`, leitura com a biblioteca `xlsx` (SheetJS), mapeamento das colunas e preview antes de confirmar a importacao
- Persistencia em `localStorage`

### Navegacao

- Novo item no menu da sidebar: "Fornecedores" com icone `Users`

---

## 3. Modulo de Compras (`/compras`)

### Dados de uma compra

- ID, Data, Fornecedor (vinculado ao cadastro), Status, Lista de cotacoes (itens da QuoteList), Observacoes

### Funcionalidades

- Criar nova compra a partir da lista de cotacoes da calculadora (botao "Enviar para Compras")
- Listagem de compras com filtros por status e fornecedor
- Visualizar detalhes de uma compra (cotacoes, valores, fornecedor)
- Alterar status manualmente
- Persistencia em `localStorage`

### Status disponiveis

Baseado no fluxo descrito:

1. Recebimento
2. Conferencia
3. Separacao
4. Corte da Peca
5. Trituracao
6. Homogeneizacao
7. Amostragem
8. Analise
9. Aprovacao do Fornecedor
10. Pagamento
11. Enviado ao Bag
12. Exportacao/Venda

---

## 4. Modulo de Processos (`/processos`)

### Visao macro

- Painel estilo Kanban simplificado ou tabela com colunas de status
- Agrupamento das compras por etapa atual
- Contadores por etapa (quantas compras em cada fase)
- Cards resumidos com: fornecedor, valor total, data, tempo na etapa atual
- Filtros por fornecedor e periodo
- visualização de PCP (**Status de Ordem de Produção, Monitoramento de Estoque, Comparativo Meta x Produção Real, Eficiência da Produção (OEE))**

---

## 5. Sidebar atualizada

Menu final:

- Dashboard (placeholder)
- **Compras** (novo, substitui "Lotes")
- **Fornecedores** (novo)
- **Processos** (novo)
- Bags (placeholder)
- Relatorios (placeholder)
- Calculadora
- Configuracoes

---

## Detalhes Tecnicos

### Novos arquivos


| Arquivo                                       | Descricao                                    |
| --------------------------------------------- | -------------------------------------------- |
| `src/lib/suppliers.ts`                        | Tipos, CRUD e localStorage para fornecedores |
| `src/lib/purchases.ts`                        | Tipos, CRUD e localStorage para compras      |
| `src/pages/SuppliersPage.tsx`                 | Pagina de fornecedores com tabela e modais   |
| `src/pages/PurchasesPage.tsx`                 | Pagina de compras com listagem e detalhes    |
| `src/pages/ProcessesPage.tsx`                 | Pagina de processos com visao macro          |
| `src/components/suppliers/SupplierForm.tsx`   | Formulario de cadastro/edicao                |
| `src/components/suppliers/SupplierImport.tsx` | Componente de importacao Excel               |
| `src/components/purchases/PurchaseDetail.tsx` | Detalhes de uma compra                       |
| `src/components/processes/ProcessBoard.tsx`   | Board de processos                           |


### Arquivos alterados


| Arquivo                         | Alteracao                                          |
| ------------------------------- | -------------------------------------------------- |
| `src/App.tsx`                   | Novas rotas, remover rota `/lotes`                 |
| `src/components/AppSidebar.tsx` | Novos itens de menu, renomear Lotes                |
| `src/pages/CalculatorPage.tsx`  | Botao "Enviar para Compras" na QuoteList           |
| `package.json`                  | Adicionar dependencia `xlsx` para importacao Excel |


### Dependencia nova

- `xlsx` (SheetJS) -- leitura de arquivos Excel no browser

### Persistencia

Todas as entidades continuam em `localStorage`, seguindo o padrao existente (`catalisador-pro-suppliers`, `catalisador-pro-purchases`).