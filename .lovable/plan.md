
## Correção proposta

O problema não parece mais ser a ausência de `overflow`; pela sessão, a área interna já chega a ficar com `overflow-y: scroll`. O ponto frágil está no cálculo de altura dentro do `DialogContent`, que usa um layout herdado do componente base e pode deixar a lista “espremida” sem uma área útil estável para rolagem.

## O que vou ajustar

### 1. Tornar o dialog explicitamente vertical
No `SacolaPricingPanel.tsx`, ajustar o `DialogContent` para funcionar como um container de coluna com altura controlada, em vez de depender do `grid` herdado do componente base.

- manter `max-w-6xl`
- usar uma altura mais previsível, como `h-[95vh]` ou equivalente
- garantir `overflow-hidden` no dialog inteiro

### 2. Substituir o `ScrollArea` por scroll nativo na lista
Para este painel específico, a solução mais robusta é usar um container simples com:

- `flex-1`
- `min-h-0`
- `overflow-y-auto`

Isso evita conflito entre:
- `DialogContent`
- viewport interno do Radix `ScrollArea`
- footer fixo do modal

Estrutura planejada:

```text
DialogContent (coluna, altura fixa)
├─ Header
├─ Filtros
├─ Lista (flex-1 min-h-0 overflow-y-auto)
└─ Footer
```

### 3. Preservar header e footer fixos
A rolagem ficará apenas na lista das peças, mantendo:
- topo com título/busca/filtros visível
- rodapé com progresso e botões sempre acessível

## Arquivo a alterar
- `src/components/processes/SacolaPricingPanel.tsx`

## Resultado esperado
Com 5, 10 ou 100+ peças, o modal passa a rolar corretamente apenas na área central, permitindo visualizar todas as peças sem cortar a última linha.

## Detalhe técnico
Hoje o painel mistura:
- `DialogContent` com classes base de `grid`
- children em `flex`
- `ScrollArea` com viewport próprio

Esse tipo de composição costuma falhar em modais altos. Trocar para scroll nativo no miolo da tela reduz complexidade e tende a resolver de forma definitiva esse caso.
