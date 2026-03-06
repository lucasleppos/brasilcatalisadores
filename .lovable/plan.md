

# Modulo de Relatorios

## Visao Geral
Criar a pagina `ReportsPage` com 4 abas de relatorios, cada uma com graficos, tabelas e botao de exportacao Excel. Os dados vem das tabelas existentes (`purchases`, `purchase_items`, `bags`, `bag_items`, `settings`).

## Arquivos a Criar

### 1. `src/lib/reports.ts`
Funcoes de consulta agregada ao banco:
- `loadPurchasesSummary(dateRange)` — agrupa compras por periodo, fornecedor e filial
- `loadBagsAnalysis()` — bags com itens, PPMs, valores pagos vs refinador
- `loadPipelineData()` — compras agrupadas por status com contagem e tempo medio entre etapas (via `status_history`)
- `loadDashboardKPIs()` — totais investidos, retorno estimado, margem media, cambio atual (da tabela `settings`)
- `exportToExcel(data, filename)` — usa a lib `xlsx` ja instalada para gerar e baixar `.xlsx`

### 2. `src/pages/ReportsPage.tsx`
Pagina com `Tabs` contendo 4 abas:

**Aba 1 — Resumo de Compras**
- Filtros: periodo (date range), fornecedor, filial
- Grafico de barras (recharts): total comprado por mes
- Tabela: ranking de fornecedores por volume/valor
- Botao "Exportar Excel"

**Aba 2 — Analise de Bags**
- Cards KPI: total bags fechados, peso total, valor pago total, valor refinador total
- Tabela comparativa: bag number, peso, pago, refinador, margem %
- Grafico de barras: pago vs refinador por bag
- Botao "Exportar Excel"

**Aba 3 — Pipeline Operacional**
- Grafico de barras horizontal: quantidade de compras por status (Recebimento ate Exportacao)
- Tabela: tempo medio por etapa (calculado do `status_history`)
- Botao "Exportar Excel"

**Aba 4 — Dashboard Financeiro**
- Cards KPI: total investido (sum purchases), retorno estimado (sum refiner values), margem media, cambio USD/BRL atual
- Grafico de linha: evolucao do investimento mensal
- Botao "Exportar Excel"

### 3. `src/App.tsx`
- Substituir `PlaceholderPage` por `ReportsPage` na rota `/relatorios`

## Detalhes Tecnicos
- Graficos: `recharts` (ja instalado) via componentes `ChartContainer` existentes
- Exportacao: `xlsx` (ja instalado) — `XLSX.utils.json_to_sheet` + `writeFile`
- Filtro de periodo: `react-day-picker` + `Popover` (componentes ja existentes)
- Todas as queries usam o cliente existente `supabase` com as tabelas atuais
- Nenhuma alteracao de banco necessaria — todos os dados ja existem nas tabelas

