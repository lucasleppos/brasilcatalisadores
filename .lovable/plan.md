Objetivo: ajustar a etiqueta térmica do cerâmico para mostrar "Peso Bruto" no lugar de "Peso Líq.", já que a tara ainda não é informada nessa etapa.

Etapa 1 — Prévia visual
- Gerar uma imagem estática da etiqueta 100 x 50 mm com dados de exemplo (código LOT-260707-01, comprador Marcos, fornecedora Cleusa de Fátima, Grupo 01, 8.000 kg) e o texto "Peso Bruto" em destaque.
- Apresentar a prévia antes de aplicar a mudança no código.

Etapa 2 — Ajuste no layout da etiqueta
Arquivo: `src/components/processes/CeramicoLabelPrint.tsx`
- Trocar o texto exibido de `Peso Líq.` para `Peso Bruto`.
- Manter o QR code apontando para o código único interno (`l.code`).
- Manter o cabeçalho somente com o código base (sem sequência 01/02/03).

Etapa 3 — Alinhamento semântico (opcional, se fizer sentido)
Arquivos: `src/components/processes/CeramicoLabelPrint.tsx` e `src/components/processes/CeramicoConferenciaPanel.tsx`
- Renomear a propriedade `weightNet` para `weightGross` no tipo `LabelData` e nos pontos onde ela é preenchida, para refletir que o peso conferido é bruto nesta etapa.
- Se preferir manter o nome interno, apenas o texto visual será alterado.

Etapa 4 — Verificação
- Rodar `tsgo` para garantir que tipos e referências estejam consistentes.

Arquivos envolvidos:
- `src/components/processes/CeramicoLabelPrint.tsx`
- `src/components/processes/CeramicoConferenciaPanel.tsx` (se renomearmos a propriedade)

Observação: a conferência continua sem campo de tara e o saldo permanece `Peso Bruto Recebido - ΣPesos Brutos dos Grupos`.