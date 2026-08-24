# Corrigir o layout da etiqueta Bluetooth Coibeu

A impressão está funcionando, mas a foto mostra que o firmware da impressora renderiza as fontes bitmap com dimensões diferentes das estimadas: título e linhas ficam sobrepostos, textos longos avançam sobre o QR e o código abaixo do QR ultrapassa a área útil.

## O que será alterado

1. **Aplicar um layout compacto e previsível**
   - Manter a etiqueta em 100 × 50 mm (800 × 400 dots a 203 dpi).
   - Usar fonte bitmap interna em escala 1 como padrão seguro: fonte `"2"` para o título e fonte `"1"` para os dados.
   - Definir posições verticais fixas e espaçamento baseado nas dimensões reais dessas fontes, eliminando a sobreposição vista na foto.

2. **Separar fisicamente texto e QR Code**
   - Reservar uma coluna exclusiva para o QR, com folga entre as duas áreas.
   - Reduzir o módulo do QR de 6 para 5 para garantir que ele caiba na altura e largura disponíveis.
   - Limitar cada texto à largura da coluna esquerda antes de gerar o TSPL, usando abreviação segura quando necessário; fornecedor, comprador ou lote longo não poderão mais entrar sobre o QR.
   - Centralizar e limitar o código impresso sob o QR para não ultrapassar a borda direita.

3. **Normalizar configurações antigas do aparelho**
   - Introduzir uma versão do layout nas preferências locais e migrar uma única vez os tamanhos antigos para o novo preset compacto.
   - Preservar direção, margens, quantidade de cópias e conexão já configuradas.
   - Manter o modo escalável disponível apenas como alternativa manual, sem voltar a ser o padrão.

4. **Facilitar a calibração**
   - Adicionar em Configurações uma ação **Restaurar layout recomendado**, aplicando os valores validados para a Coibeu.
   - Fazer a etiqueta de teste usar textos longos representativos, permitindo verificar claramente os limites da coluna e o QR antes da impressão em produção.

## Detalhes técnicos

- `src/lib/label-tspl.ts`: atualizar métricas das fontes, coordenadas, módulo do QR, largura das colunas e truncamento por largura estimada; manter `SIZE`, `GAP`, `DIRECTION`, `CLS`, `PRINT` e `END`.
- `src/lib/thermal-printer.ts`: versionar e normalizar somente as preferências tipográficas/layout antigas.
- `src/components/settings/LabelPrinterCard.tsx`: incluir restauração do preset recomendado e adequar os controles aos novos padrões.
- `src/components/processes/CeramicoLabelPrint.tsx`: continuará usando as mesmas preferências; sem mudança no fluxo de impressão.
- Sem alterações no banco, nos dados das compras ou na impressão pelo navegador.

## Validação

- Testar o TSPL gerado para garantir que nenhum `TEXT`, `BAR` ou `QRCODE` ultrapasse os 800 × 400 dots.
- Conferir título, todas as linhas possíveis e código do QR com valores curtos e longos.
- Imprimir primeiro a etiqueta de teste no preset recomendado; depois validar uma etiqueta real no Android/Coibeu.
