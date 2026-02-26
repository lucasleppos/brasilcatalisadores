

# Sistema Catalisador Pro — Fase 1: Calculadora Standalone

## Visão Geral
Construir a Calculadora Standalone como primeiro módulo do sistema, permitindo simulações rápidas de precificação de catalisadores. Será um protótipo funcional com dados em memória (sem banco de dados ou login), focado em validar as fórmulas de cálculo.

---

## 1. Layout Base do Sistema
- Sidebar com menu de navegação (preparada para futuros módulos)
- Tema claro e profissional em tons de bege/creme e dourado
- Logo **"Brasil Sust. Catalisador Pro"** no topo da sidebar
- Menu: Dashboard (placeholder), Lotes (placeholder), Bags (placeholder), Relatórios (placeholder), Configurações, **Calculadora** (destacada)
- Área de conteúdo principal responsiva

## 2. Tela de Configurações (simplificada)
Permite definir os parâmetros globais usados nos cálculos da calculadora:
- **Cotações dos metais**: Pt, Pd, Rh (USD/ozt)
- **Taxa de câmbio**: USD → BRL
- **Custos**: Operacional e Logístico ($/kg)
- **Taxas de refino**: Treatment ($/lb), Refining Pt ($/ozt), Refining Pd ($/ozt), Refining Rh ($/ozt)
- **Lease fees**: Pt (6%), Pd (4%), Rh (6%) — com dias (120) e base (360)
- **Recovery rates**: Pt (97.5%), Pd (97.5%), Rh (92.5%)
- **Desconto de umidade**: 1%
- Valores salvos em localStorage para persistência entre sessões

## 3. Calculadora Standalone
Interface principal com entrada rápida para simulação de precificação:

### Entrada de dados:
- Peso bruto (kg)
- Tara (kg)
- Tipo de material: Comum / Diesel / Super
- Concentrações: Pt ppm, Pd ppm, Rh ppm
- Desconto do cliente (%)
- **Tipo de entrada**: Peça Fechada / Peça em Sacola / Grupo (cerâmica a granel)
- **Campo de preço manual** (livre): para Peças Fechadas e Peças em Sacola que já possuem valor tabelado no app externo — permite inserir o preço diretamente sem necessidade de análise laboratorial. Quando preenchido, o cálculo automático fica como referência comparativa
- Opção de usar cotações das configurações ou inserir cotações customizadas

### Cálculo automático em tempo real (ao digitar):
- **Conversões de peso**: líquido → úmido (lb) → seco (lb) → seco (g)
- **Conteúdo de metal**: gramas de Pt, Pd, Rh
- **Metal pagável**: aplicando recovery rates
- **Troy oz**: conversão para onças troy
- **Valor dos metais**: em USD
- **Deduções**: Treatment, Refining, Lease, Custos Op/Log
- **Valor final**: em USD e BRL

### Apresentação dos resultados:
- Tabela detalhada estilo planilha mostrando cada passo do cálculo
- Card destacado com valor final em BRL
- Quando há preço manual inserido: exibir comparação lado a lado (preço tabelado vs. preço calculado)
- Breakdown visual das deduções

### Funcionalidades extras:
- Botão "Limpar" para resetar os campos
- Histórico de simulações salvo em localStorage (últimas 20)
- Poder carregar uma simulação do histórico para editar

## 4. Páginas Placeholder
- Dashboard, Lotes, Bags e Relatórios com mensagem "Em breve" e visual consistente com o tema, preparando a navegação para as próximas fases

