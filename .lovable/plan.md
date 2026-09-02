# Corrigir peso das peças (gramas x quilos)

Situação confirmada no banco: as 1.362 peças importadas têm peso entre 7 e 8.467 e média de 908 — ou seja, os valores da planilha estão em gramas, mas foram gravados como quilos.

## O que será feito

### 1. Correção dos dados já importados
- Converter o peso de todas as 1.362 peças do catálogo dividindo por 1.000 (ex.: 420,0000 kg → 0,4200 kg).
- Nada mais é alterado: código, referência, marca, veículo, PPMs e grupos permanecem iguais.
- Como o catálogo foi limpo antes desta importação, todas as peças atuais vêm dessa planilha em gramas, então a conversão é segura para a tabela inteira.

### 2. Evitar que aconteça de novo na importação
- Na tela de importação, novo seletor **Unidade do peso na planilha**: "Gramas (g)" ou "Quilos (kg)", com Gramas como padrão (formato das planilhas atuais).
- Quando "Gramas" estiver selecionado, o app divide por 1.000 antes de gravar; em "Quilos" grava como está.
- Aviso automático antes de confirmar: se o peso médio das linhas parecer incompatível com a unidade escolhida (por exemplo média acima de 20 quando a opção é "kg"), aparece um alerta sugerindo trocar a unidade.
- O preview passa a mostrar uma coluna "Peso convertido (kg)" das primeiras linhas, para conferência antes de importar.

### 3. Cadastro manual
- O campo de peso no cadastro/edição de peça continua em kg, com o rótulo reforçado ("Peso (kg) — ex.: 0,4200").

## Detalhes técnicos

- Correção dos dados via atualização em massa: `UPDATE public.catalog_parts SET weight = weight / 1000` (sem mudança de estrutura).
- `src/components/catalog/CatalogImport.tsx`: estado `weightUnit` ('g' | 'kg'), fator aplicado no mapeamento das linhas, checagem heurística de média e coluna de preview convertida.
- `src/pages/CatalogPage.tsx`: ajuste apenas do rótulo do campo de peso.
- Nenhuma mudança em precificação: os cálculos já esperam kg, então passam a ficar corretos automaticamente.
